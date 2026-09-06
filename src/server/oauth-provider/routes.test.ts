import { describe, expect, it } from "bun:test";
import { betterAuth } from "better-auth";
import { memoryAdapter, type MemoryDB } from "better-auth/adapters/memory";
import { jwt, testUtils } from "better-auth/plugins";

import { reconcileOsuGuessrClient } from "./config";
import { osuClaimNames } from "./claims";
import { createHanamiOAuthProviderPlugin } from "./provider";

const origin = "https://hanami.yorunoken.com";
const redirectUri = "https://osu-guessr.example.com/auth/hanami/callback";
const clientEnvironment = {
    OSU_GUESSR_CLIENT_ID: "guessr-client",
    OSU_GUESSR_REDIRECT_URIS: redirectUri,
} as NodeJS.ProcessEnv;

interface MemoryClientUpsertInput {
    where: { clientId: string };
    update: Record<string, unknown>;
    create: Record<string, unknown>;
}

describe("Hanami OAuth provider routes", () => {
    it("advertises OIDC endpoints, supported claims, and S256 PKCE", async () => {
        const { auth } = await makeAuth();

        const response = await auth.handler(new Request(`${origin}/api/auth/.well-known/openid-configuration`));
        const metadata = await response.json();

        expect(response.status).toBe(200);
        expect(metadata).toMatchObject({
            issuer: `${origin}/api/auth`,
            authorization_endpoint: `${origin}/api/auth/oauth2/authorize`,
            token_endpoint: `${origin}/api/auth/oauth2/token`,
            userinfo_endpoint: `${origin}/api/auth/oauth2/userinfo`,
            code_challenge_methods_supported: ["S256"],
        });
        expect(metadata.claims_supported).toEqual(expect.arrayContaining([...osuClaimNames]));
    });

    it("rejects dynamic client registration", async () => {
        const { auth } = await makeAuth();

        const response = await auth.handler(
            new Request(`${origin}/api/auth/oauth2/register`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ redirect_uris: [redirectUri] }),
            }),
        );

        expect(response.status).toBe(403);
        expect(await response.json()).toEqual({ error: "access_denied", error_description: "Client registration is disabled" });
    });

    it("rejects unknown clients and non-exact redirect URIs", async () => {
        const { auth } = await makeAuth();
        const challenge = await createPkceChallenge("a".repeat(43));

        const unknownClient = await authorize(auth, {
            client_id: "unknown-client",
            redirect_uri: redirectUri,
            code_challenge: challenge,
        });
        expect((await unknownClient.json()).url).toContain("error=invalid_client");

        const wrongRedirect = await authorize(auth, {
            client_id: "guessr-client",
            redirect_uri: `${redirectUri}/different`,
            code_challenge: challenge,
        });
        expect((await wrongRedirect.json()).url).toContain("error=invalid_redirect");
    });

    it("skips consent for the reconciled first-party client and completes code, refresh, and userinfo flows", async () => {
        const { auth } = await makeAuth();
        const context = await auth.$context;
        await context.test.saveUser(context.test.createUser({ id: "hanami-user-1" }));
        const login = await context.test.login({ userId: "hanami-user-1" });
        const verifier = "a".repeat(43);
        const challenge = await createPkceChallenge(verifier);

        const authorization = await authorize(
            auth,
            { client_id: "guessr-client", redirect_uri: redirectUri, code_challenge: challenge, scope: "openid osu offline_access" },
            login.headers,
        );
        const authorizationBody = await authorization.json();
        const callback = new URL(authorizationBody.url);
        const code = callback.searchParams.get("code");

        expect(authorization.status).toBe(200);
        expect(callback.origin + callback.pathname).toBe(redirectUri);
        expect(code).toBeString();
        expect(authorizationBody.url).not.toContain("/oauth/consent");

        const tokenResponse = await token(auth, {
            grant_type: "authorization_code",
            client_id: "guessr-client",
            redirect_uri: redirectUri,
            code: code ?? "",
            code_verifier: verifier,
        });
        const firstTokens = await tokenResponse.json();
        expect(tokenResponse.status).toBe(200);
        expect(firstTokens.refresh_token).toBeString();

        const userInfoResponse = await auth.handler(
            new Request(`${origin}/api/auth/oauth2/userinfo`, {
                headers: { Authorization: `Bearer ${firstTokens.access_token}` },
            }),
        );
        expect(userInfoResponse.status).toBe(200);
        expect(await userInfoResponse.json()).toMatchObject({
            sub: "hanami-user-1",
            "https://hanami.yorunoken.com/claims/osu_id": "24680",
            "https://hanami.yorunoken.com/claims/osu_username": "Yoru",
            "https://hanami.yorunoken.com/claims/osu_avatar": "https://a.ppy.sh/24680",
        });

        const refreshResponse = await token(auth, {
            grant_type: "refresh_token",
            client_id: "guessr-client",
            refresh_token: firstTokens.refresh_token,
        });
        const refreshedTokens = await refreshResponse.json();
        expect(refreshResponse.status).toBe(200);
        expect(refreshedTokens.refresh_token).toBeString();
        expect(refreshedTokens.refresh_token).not.toBe(firstTokens.refresh_token);

        const replayResponse = await token(auth, {
            grant_type: "refresh_token",
            client_id: "guessr-client",
            refresh_token: firstTokens.refresh_token,
        });
        expect(replayResponse.status).toBe(400);
        expect(await replayResponse.json()).toMatchObject({ error: "invalid_grant" });
    });
});

async function makeAuth() {
    const database: MemoryDB = {
        user: [],
        account: [],
        session: [],
        verification: [],
        jwks: [],
        oauthClient: [],
        oauthResource: [],
        oauthClientResource: [],
        oauthRefreshToken: [],
        oauthAccessToken: [],
        oauthConsent: [],
        oauthClientAssertion: [],
    };
    const profiles = [{ userId: "hanami-user-1", osuId: "24680", username: "Yoru", avatarUrl: "https://a.ppy.sh/24680" }];
    const claimsDatabase = {
        osuProfile: {
            findUnique: async ({ where }: { where: { userId: string } }) =>
                profiles.find((profile) => profile.userId === where.userId) ?? null,
        },
    };
    await reconcileOsuGuessrClient(
        {
            oauthClient: {
                upsert: async (input: unknown) => {
                    const { where, update, create } = input as MemoryClientUpsertInput;
                    const index = database.oauthClient.findIndex((client) => client.clientId === where.clientId);
                    if (index >= 0) database.oauthClient[index] = { ...database.oauthClient[index], ...update };
                    else database.oauthClient.push(create);
                    return database.oauthClient[index >= 0 ? index : database.oauthClient.length - 1];
                },
            },
        },
        clientEnvironment,
    );
    const auth = betterAuth({
        database: memoryAdapter(database),
        baseURL: origin,
        trustedOrigins: [origin],
        secret: "test-secret-that-is-at-least-thirty-two-characters",
        plugins: [jwt(), createHanamiOAuthProviderPlugin(claimsDatabase), testUtils()],
    });
    return { auth };
}

async function authorize(
    auth: { handler(request: Request): Promise<Response> },
    overrides: { client_id: string; redirect_uri: string; code_challenge: string; scope?: string },
    sessionHeaders?: Headers,
): Promise<Response> {
    const query = new URLSearchParams({
        response_type: "code",
        scope: overrides.scope ?? "openid",
        state: "state-1",
        code_challenge_method: "S256",
        ...overrides,
    });
    const headers = new Headers(sessionHeaders);
    headers.set("Accept", "application/json");
    return auth.handler(new Request(`${origin}/api/auth/oauth2/authorize?${query}`, { headers }));
}

function token(auth: { handler(request: Request): Promise<Response> }, body: Record<string, string>): Promise<Response> {
    return auth.handler(
        new Request(`${origin}/api/auth/oauth2/token`, {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: new URLSearchParams(body),
        }),
    );
}

async function createPkceChallenge(verifier: string): Promise<string> {
    const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(verifier));
    return Buffer.from(digest).toString("base64url");
}
