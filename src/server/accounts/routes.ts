import { Elysia } from "elysia";

import { accountService } from "./runtime";
import { isLoginProvider, type LoginMethod, type LoginProvider } from "./service";
import { auth, trustedOrigins } from "../auth";
import { isFreshAuthentication } from "../deletion-requests/domain";
import { serverIdentity } from "../identity";
import { getSafeErrorDetails, hasTrustedOrigin, logSafeFailure } from "../security/http";

const LINK_RATE_LIMIT_WINDOW_MS = 60_000;
const LINK_RATE_LIMIT_ATTEMPTS = 5;
const linkAttempts = new Map<string, number[]>();

export const loginMethodRoutes = new Elysia({ prefix: "/login-methods" })
    .get("/", async ({ request, set }) => {
        set.headers["Cache-Control"] = "no-store";
        const current = await serverIdentity.getCurrent(request.headers);
        if (!current) return fail(set, 401, "Unauthorized");

        try {
            const [user, loginMethods, loginMethodCount] = await Promise.all([
                accountService.getCanonicalUser(current.userId),
                accountService.listLoginMethods(current.userId),
                accountService.countLoginMethods(current.userId),
            ]);
            if (!user) return fail(set, 404, "Hanami account was not found.");
            return {
                userId: user.id,
                profile: { name: user.name, image: user.image },
                loginMethods: loginMethods.map(toClientLoginMethod),
                loginMethodCount,
            };
        } catch (error) {
            logSafeFailure("read linked login methods", error);
            return fail(set, 500, "Linked accounts could not be loaded.");
        }
    })
    .post("/link/:provider", async ({ params, request, set }) => {
        set.headers["Cache-Control"] = "no-store";
        const current = await serverIdentity.getCurrent(request.headers);
        if (!current) return fail(set, 401, "Sign in before linking an account.");
        if (!hasTrustedOrigin(request, trustedOrigins)) return fail(set, 403, "This action could not be verified.");
        if (!isLoginProvider(params.provider)) return fail(set, 404, "Unsupported login provider.");
        if (!isFreshAuthentication(current.sessionCreatedAt)) {
            return fail(set, 403, "Sign out and sign in again before linking another login method.");
        }
        if (!consumeLinkAttempt(current.userId, params.provider)) {
            return fail(set, 429, "Too many link attempts. Wait a minute and try again.");
        }

        const existing = (await accountService.listLoginMethods(current.userId)).find((method) => method.provider === params.provider);
        if (existing) return { alreadyLinked: true, url: null, loginMethod: toClientLoginMethod(existing) };

        try {
            const callbackURL = new URL("/profile", new URL(request.url).origin).toString();
            const errorCallbackURL = new URL("/profile", new URL(request.url).origin);
            errorCallbackURL.searchParams.set("linkError", params.provider);

            const result =
                params.provider === "discord"
                    ? await auth.api.linkSocialAccount({
                          headers: request.headers,
                          returnHeaders: true,
                          body: {
                              provider: "discord",
                              callbackURL,
                              errorCallbackURL: errorCallbackURL.toString(),
                              disableRedirect: true,
                          },
                      })
                    : await auth.api.oAuth2LinkAccount({
                          headers: request.headers,
                          returnHeaders: true,
                          body: {
                              providerId: "osu",
                              callbackURL,
                              errorCallbackURL: errorCallbackURL.toString(),
                          },
                      });

            const url = readAuthorizationUrl(result.response);
            if (!url) throw new Error("Authentication library did not return a provider authorization URL");
            return providerLinkResponse(url, result.headers);
        } catch (error) {
            logSafeFailure(`start ${params.provider} account linking`, error);
            const details = getSafeErrorDetails(error);
            if (isOwnershipConflict(details.code, details.message)) {
                return fail(set, 409, providerConflictMessage(params.provider));
            }
            return fail(set, 502, `${providerLabel(params.provider)} linking could not be started.`);
        }
    })
    .delete("/:provider", async ({ params, request, set }) => {
        set.headers["Cache-Control"] = "no-store";
        const current = await serverIdentity.getCurrent(request.headers);
        if (!current) return fail(set, 401, "Sign in before unlinking an account.");
        if (!hasTrustedOrigin(request, trustedOrigins)) return fail(set, 403, "This action could not be verified.");
        if (!isLoginProvider(params.provider)) return fail(set, 404, "Unsupported login provider.");
        if (!isFreshAuthentication(current.sessionCreatedAt)) {
            return fail(set, 403, "Sign out and sign in again before removing a login method.");
        }

        try {
            const methods = await accountService.listLoginMethods(current.userId);
            const target = methods.find((method) => method.provider === params.provider);
            if (!target) return fail(set, 409, `${providerLabel(params.provider)} was not found. Refresh the profile and try again.`);
            if ((await accountService.countLoginMethods(current.userId)) <= 1) {
                return fail(set, 409, "Your final sign-in method cannot be removed.");
            }

            await auth.api.unlinkAccount({
                headers: request.headers,
                body: { providerId: params.provider, accountId: target.providerUserId },
            });
            return { unlinked: true, alreadyUnlinked: false };
        } catch (error) {
            logSafeFailure(`unlink ${params.provider} account`, error);
            const mapped = mapUnlinkError(error, params.provider);
            return fail(set, mapped.status, mapped.message);
        }
    });

function toClientLoginMethod(method: LoginMethod) {
    return {
        provider: method.provider,
        providerUserId: method.providerUserId,
        createdAt: method.createdAt.toISOString(),
    };
}

function mapUnlinkError(error: unknown, provider: LoginProvider): { status: number; message: string } {
    const details = getSafeErrorDetails(error);
    switch (details.code) {
        case "FAILED_TO_UNLINK_LAST_ACCOUNT":
            return { status: 409, message: "Your final sign-in method cannot be removed." };
        case "ACCOUNT_NOT_FOUND":
            return { status: 409, message: `${providerLabel(provider)} was not found. Refresh the profile and try again.` };
        case "SESSION_EXPIRED":
        case "SESSION_NOT_FRESH":
        case "fresh_session_required":
            return { status: 403, message: "Sign out and sign in again before removing a login method." };
        default:
            if (isOwnershipConflict(details.code, details.message)) {
                return { status: 409, message: providerConflictMessage(provider) };
            }
            return { status: 500, message: `${providerLabel(provider)} could not be unlinked.` };
    }
}

function isOwnershipConflict(code: string | undefined, message: string | undefined): boolean {
    return (
        code === "identity_conflict" ||
        code === "ACCOUNT_ALREADY_LINKED" ||
        message?.toLowerCase().includes("already linked") === true ||
        message?.toLowerCase().includes("belongs to another") === true
    );
}

function readAuthorizationUrl(value: unknown): string | null {
    if (typeof value !== "object" || value === null || !("url" in value) || typeof value.url !== "string") return null;
    try {
        const url = new URL(value.url);
        return url.protocol === "https:" || url.protocol === "http:" ? url.toString() : null;
    } catch {
        return null;
    }
}

function providerLinkResponse(url: string, authenticationHeaders: Headers): Response {
    const headers = new Headers({ "Cache-Control": "no-store" });
    for (const cookie of readSetCookies(authenticationHeaders)) headers.append("Set-Cookie", cookie);
    return Response.json({ alreadyLinked: false, url }, { headers });
}

function readSetCookies(headers: Headers): string[] {
    const extendedHeaders = headers as Headers & { getSetCookie?(): string[] };
    const cookies = extendedHeaders.getSetCookie?.();
    if (cookies && cookies.length > 0) return cookies;
    const combined = headers.get("set-cookie");
    return combined ? [combined] : [];
}

function consumeLinkAttempt(userId: string, provider: LoginProvider, now = Date.now()): boolean {
    const key = `${userId}:${provider}`;
    const recent = (linkAttempts.get(key) ?? []).filter((timestamp) => now - timestamp < LINK_RATE_LIMIT_WINDOW_MS);
    if (recent.length >= LINK_RATE_LIMIT_ATTEMPTS) {
        linkAttempts.set(key, recent);
        return false;
    }
    recent.push(now);
    linkAttempts.set(key, recent);
    return true;
}

function providerConflictMessage(provider: LoginProvider): string {
    return `That ${providerLabel(provider)} belongs to another Hanami account and cannot be transferred automatically.`;
}

function providerLabel(provider: LoginProvider): string {
    return provider === "osu" ? "osu! account" : "Discord account";
}

function fail(set: { status?: number | string }, status: number, error: string) {
    set.status = status;
    return { error };
}
