import { Elysia } from "elysia";

import { isFreshAuthentication } from "../deletion-requests/domain";
import { auth, trustedOrigins } from "../auth";
import { serverIdentity } from "../identity";
import { getSafeErrorDetails, hasTrustedOrigin, logSafeFailure } from "../security/http";
import { botIdentityCompatibility, userIdentities } from "./runtime";
import { IdentityConflictError, isSupportedIdentityProvider, type SupportedIdentityProvider } from "./model";
import { IdentityUnlinkStateError, unlinkProviderAccount } from "./unlink";

const LINK_RATE_LIMIT_WINDOW_MS = 60_000;
const LINK_RATE_LIMIT_ATTEMPTS = 5;
const linkAttempts = new Map<string, number[]>();

export const identityRoutes = new Elysia({ prefix: "/identities" })
    .get("/", async ({ request, set }) => {
        set.headers["Cache-Control"] = "no-store";
        const current = await serverIdentity.getCurrent(request.headers);
        if (!current) return fail(set, 401, "Unauthorized");

        try {
            await botIdentityCompatibility.flushPendingForUser(current.userId).catch(() => undefined);
            const identities = await userIdentities.getUserAuthenticationIdentities(current.userId);
            return {
                userId: current.userId,
                identities: identities.map(toClientIdentity),
                syncPending: await botIdentityCompatibility.hasPendingForUser(current.userId),
            };
        } catch (error) {
            logSafeFailure("read linked identities", error);
            return fail(set, 500, "Linked accounts could not be loaded.");
        }
    })
    .post("/link/:provider", async ({ params, request, set }) => {
        set.headers["Cache-Control"] = "no-store";
        const current = await serverIdentity.getCurrent(request.headers);
        if (!current) return fail(set, 401, "Sign in before linking an account.");
        if (!hasTrustedOrigin(request, trustedOrigins)) return fail(set, 403, "This action could not be verified.");
        if (!isSupportedIdentityProvider(params.provider)) return fail(set, 404, "Unsupported identity provider.");
        if (!isFreshAuthentication(current.sessionCreatedAt)) {
            return fail(set, 403, "Sign out and sign in again before linking another login method.");
        }
        if (!consumeLinkAttempt(current.userId, params.provider)) {
            return fail(set, 429, "Too many link attempts. Wait a minute and try again.");
        }

        const existing = (await userIdentities.getUserAuthenticationIdentities(current.userId)).find(
            (identity) => identity.provider === params.provider,
        );
        if (existing) {
            if (!existing.canAuthenticate) {
                return fail(set, 409, `${providerLabel(params.provider)} ownership requires identity reconciliation before linking.`);
            }
            return { alreadyLinked: true, url: null, identity: toClientIdentity(existing) };
        }

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
            if (error instanceof IdentityConflictError) {
                logConflict(current.userId, params.provider);
                return fail(set, 409, providerConflictMessage(params.provider));
            }
            logSafeFailure(`start ${params.provider} identity linking`, error);
            return fail(set, 502, `${providerLabel(params.provider)} linking could not be started.`);
        }
    })
    .delete("/:provider", async ({ params, request, set }) => {
        set.headers["Cache-Control"] = "no-store";
        const current = await serverIdentity.getCurrent(request.headers);
        if (!current) return fail(set, 401, "Sign in before unlinking an account.");
        if (!hasTrustedOrigin(request, trustedOrigins)) return fail(set, 403, "This action could not be verified.");
        if (!isSupportedIdentityProvider(params.provider)) return fail(set, 404, "Unsupported identity provider.");
        if (!isFreshAuthentication(current.sessionCreatedAt)) {
            return fail(set, 403, "Sign out and sign in again before removing a login method.");
        }

        try {
            const result = await unlinkProviderAccount(
                userIdentities,
                (input) => auth.api.unlinkAccount(input),
                request.headers,
                current.userId,
                params.provider,
            );
            if (result.alreadyUnlinked) return { unlinked: true, alreadyUnlinked: true, syncPending: false };
            await botIdentityCompatibility.flushPendingForUser(current.userId).catch(() => undefined);
            return {
                unlinked: true,
                alreadyUnlinked: false,
                syncPending: await botIdentityCompatibility.hasPendingForUser(current.userId),
            };
        } catch (error) {
            logSafeFailure(`unlink ${params.provider} identity`, error);
            const mapped = mapUnlinkError(error, params.provider);
            return fail(set, mapped.status, mapped.message);
        }
    });

function toClientIdentity(identity: Awaited<ReturnType<typeof userIdentities.getUserAuthenticationIdentities>>[number]) {
    return {
        provider: identity.provider,
        providerUserId: identity.providerUserId,
        username: identity.username,
        displayName: identity.displayName,
        avatarUrl: identity.avatarUrl,
        linkedAt: identity.linkedAt.toISOString(),
        updatedAt: identity.updatedAt.toISOString(),
        canAuthenticate: identity.canAuthenticate,
        status: identity.status,
    };
}

function mapUnlinkError(error: unknown, provider: SupportedIdentityProvider): { status: number; message: string } {
    if (error instanceof IdentityConflictError) return { status: 409, message: providerConflictMessage(provider) };
    if (error instanceof IdentityUnlinkStateError) {
        switch (error.code) {
            case "final_login_method":
                return { status: 409, message: "Your final sign-in method cannot be removed." };
            case "provider_account_missing":
                return { status: 409, message: `${providerLabel(provider)} was not found. Run identity reconciliation first.` };
            case "identity_reconciliation_required":
                return {
                    status: 409,
                    message: `${providerLabel(provider)} ownership requires identity reconciliation before unlinking.`,
                };
        }
    }
    const details = getSafeErrorDetails(error);
    switch (details.code) {
        case "FAILED_TO_UNLINK_LAST_ACCOUNT":
            return { status: 409, message: "Your final sign-in method cannot be removed." };
        case "ACCOUNT_NOT_FOUND":
            return { status: 409, message: `${providerLabel(provider)} was not found. Refresh the profile and try again.` };
        case "SESSION_EXPIRED":
        case "SESSION_NOT_FRESH":
            return { status: 403, message: "Sign out and sign in again before removing a login method." };
        case "identity_conflict":
            return { status: 409, message: providerConflictMessage(provider) };
        default:
            return { status: 500, message: `${providerLabel(provider)} could not be unlinked.` };
    }
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

function consumeLinkAttempt(userId: string, provider: SupportedIdentityProvider, now = Date.now()): boolean {
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

function providerConflictMessage(provider: SupportedIdentityProvider): string {
    return `That ${providerLabel(provider)} identity belongs to another Hanami account and cannot be transferred automatically.`;
}

function providerLabel(provider: SupportedIdentityProvider): string {
    return provider === "osu" ? "osu! account" : "Discord account";
}

function logConflict(userId: string, provider: SupportedIdentityProvider): void {
    logSafeFailure(
        "link a provider identity",
        Object.assign(new Error("Provider identity conflict"), {
            code: "identity_conflict",
            provider,
            userId: userId.length > 8 ? `${userId.slice(0, 4)}…${userId.slice(-4)}` : "[redacted]",
        }),
    );
}

function fail(set: { status?: number | string }, status: number, error: string) {
    set.status = status;
    return { error };
}
