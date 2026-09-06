import { Elysia } from "elysia";

import { auth, botAccountCompatibility, trustedOrigins } from "../auth";
import { webPrisma } from "../database/web";
import { isFreshAuthentication } from "../deletion-requests/domain";
import { serverIdentity, type HanamiIdentity } from "../identity";
import { logSafeFailure } from "../security/http";
import { CanonicalAccountService, createCanonicalAccountDatabase, isLoginProvider, type LoginMethod, type LoginProvider } from "./service";

export interface AccountRouteDependencies {
    getCurrent(headers: Headers): Promise<(HanamiIdentity & { sessionCreatedAt: Date }) | null>;
    listLoginMethods(userId: string): Promise<Array<Pick<LoginMethod, "provider" | "providerUserId">>>;
    beginLink(input: {
        userId: string;
        provider: LoginProvider;
        headers: Headers;
        callbackURL: string;
        errorCallbackURL: string;
    }): Promise<{ url: string; headers: Headers }>;
    clearBotLink(input: { userId: string; provider: LoginProvider; providerAccountId: string }): Promise<void>;
    unlink(input: { userId: string; provider: LoginProvider; providerAccountId: string; headers: Headers }): Promise<void>;
    isFreshSession(sessionCreatedAt: Date): boolean;
}

export function createAccountRoutes(dependencies: AccountRouteDependencies) {
    return new Elysia({ prefix: "/account" })
        .get("/providers", async ({ request, set }) => {
            set.headers["Cache-Control"] = "no-store";
            const identity = await dependencies.getCurrent(request.headers);
            if (!identity) {
                set.status = 401;
                return { error: "Unauthorized" };
            }

            try {
                return { loginMethods: await dependencies.listLoginMethods(identity.userId) };
            } catch (error) {
                logSafeFailure("read canonical login methods", error);
                set.status = 500;
                return { error: "Linked accounts could not be loaded." };
            }
        })
        .post("/providers/:provider/link", async ({ params, request, set }) => {
            set.headers["Cache-Control"] = "no-store";
            const identity = await dependencies.getCurrent(request.headers);
            if (!identity) return fail(set, 401, "Sign in before linking an account.");
            if (!hasTrustedOrigin(request, trustedOrigins)) return fail(set, 403, "This action could not be verified.");
            if (!isLoginProvider(params.provider)) return fail(set, 404, "Unsupported login provider.");
            if (!dependencies.isFreshSession(identity.sessionCreatedAt)) {
                return fail(set, 403, "Sign out and sign in again before linking another login method.");
            }

            try {
                const origin = new URL(request.url).origin;
                const callbackURL = new URL("/profile", origin).toString();
                const errorCallbackURL = new URL("/profile", origin);
                errorCallbackURL.searchParams.set("linkError", params.provider);
                const link = await dependencies.beginLink({
                    userId: identity.userId,
                    provider: params.provider,
                    headers: request.headers,
                    callbackURL,
                    errorCallbackURL: errorCallbackURL.toString(),
                });
                return createLinkResponse(link);
            } catch (error) {
                logSafeFailure(`start ${params.provider} account linking`, error);
                const details = readErrorDetails(error);
                if (isOwnershipConflict(details.code, details.message)) return fail(set, 409, providerConflictMessage(params.provider));
                return fail(set, 502, `${providerLabel(params.provider)} linking could not be started.`);
            }
        })
        .delete("/providers/:provider", async ({ params, request, set }) => {
            set.headers["Cache-Control"] = "no-store";
            const identity = await dependencies.getCurrent(request.headers);
            if (!identity) return fail(set, 401, "Sign in before unlinking an account.");
            if (!hasTrustedOrigin(request, trustedOrigins)) return fail(set, 403, "This action could not be verified.");
            if (!isLoginProvider(params.provider)) return fail(set, 404, "Unsupported login provider.");
            if (!dependencies.isFreshSession(identity.sessionCreatedAt)) {
                return fail(set, 403, "Sign out and sign in again before removing a login method.");
            }

            try {
                const methods = await dependencies.listLoginMethods(identity.userId);
                const target = methods.find((method) => method.provider === params.provider);
                if (!target) return fail(set, 409, `${providerLabel(params.provider)} was not found.`);
                if (methods.length <= 1) return fail(set, 409, "Your final sign-in method cannot be removed.");
                await dependencies.clearBotLink({
                    userId: identity.userId,
                    provider: params.provider,
                    providerAccountId: target.providerUserId,
                });
                await dependencies.unlink({
                    userId: identity.userId,
                    provider: params.provider,
                    providerAccountId: target.providerUserId,
                    headers: request.headers,
                });
                return { unlinked: true };
            } catch (error) {
                logSafeFailure(`unlink ${params.provider} account`, error);
                return fail(set, 500, `${providerLabel(params.provider)} could not be unlinked.`);
            }
        });
}

const productionAccountService = new CanonicalAccountService(createCanonicalAccountDatabase(webPrisma));

export const accountRoutes = createAccountRoutes({
    getCurrent: async (headers) => {
        const identity = await serverIdentity.getCurrent(headers);
        if (!identity) return null;
        const session = await auth.api.getSession({ headers });
        return session ? { ...identity, sessionCreatedAt: new Date(session.session.createdAt) } : null;
    },
    listLoginMethods: (userId) => productionAccountService.listLoginMethods(userId),
    beginLink: async ({ provider, headers, callbackURL, errorCallbackURL }) => {
        const result = await auth.api.linkSocialAccount({
            headers,
            returnHeaders: true,
            body: { provider, callbackURL, errorCallbackURL, disableRedirect: true },
        });
        const response = result.response;
        if (!response || typeof response !== "object" || !("url" in response) || typeof response.url !== "string") {
            throw new Error("Better Auth did not return a provider authorization URL");
        }
        return { url: response.url, headers: result.headers };
    },
    clearBotLink: ({ userId, provider, providerAccountId }) =>
        botAccountCompatibility.synchronizeUser(userId, { provider, providerUserId: providerAccountId }),
    unlink: async ({ headers, userId, provider, providerAccountId }) => {
        const account = await webPrisma.account.findFirst({
            where: { userId, providerId: provider, accountId: providerAccountId },
            select: { id: true },
        });
        if (!account) throw new Error("The provider account was not found.");
        await auth.api.unlinkAccount({ headers, body: { accountId: account.id } });
    },
    isFreshSession: (sessionCreatedAt) => isFreshAuthentication(sessionCreatedAt),
});

function createLinkResponse(link: { url: string; headers: Headers }): Response {
    const headers = new Headers({ "Cache-Control": "no-store" });
    for (const cookie of link.headers.getSetCookie()) headers.append("Set-Cookie", cookie);
    return Response.json({ url: link.url }, { headers });
}

function fail(set: { status?: number | string }, status: number, error: string) {
    set.status = status;
    return { error };
}

function isOwnershipConflict(code?: string, message?: string): boolean {
    return code === "ACCOUNT_ALREADY_LINKED" || message?.toLowerCase().includes("already linked") === true;
}

function readErrorDetails(error: unknown): { code?: string; message?: string } {
    if (!(error instanceof Error)) return {};
    return {
        code: "code" in error && typeof error.code === "string" ? error.code : undefined,
        message: error.message,
    };
}

function providerConflictMessage(provider: LoginProvider): string {
    return `That ${providerLabel(provider)} belongs to another Hanami account and cannot be transferred automatically.`;
}

function providerLabel(provider: LoginProvider): string {
    return provider === "osu" ? "osu! account" : "Discord account";
}

function hasTrustedOrigin(request: Request, allowedOrigins: readonly string[]): boolean {
    const origin = request.headers.get("origin");
    if (!origin) return false;
    const requestOrigin = new URL(request.url).origin;
    return origin === requestOrigin || allowedOrigins.includes(origin);
}
