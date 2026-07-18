import { afterEach, describe, expect, it, mock, spyOn } from "bun:test";
import { betterAuth } from "better-auth";
import { memoryAdapter, type MemoryDB } from "better-auth/adapters/memory";
import { genericOAuth } from "better-auth/plugins";

import { mapDiscordProfileToUser } from "@/lib/discord-identity";
import { createOsuPlaceholderEmail } from "@/lib/osu-identity";

const baseURL = "https://hanami.test";
const secret = "test-secret-that-is-at-least-thirty-two-characters";

afterEach(() => {
    mock.restore();
});

describe("Better Auth provider login lifecycle", () => {
    it("creates one canonical user for a new Discord identity and reuses it on later login", async () => {
        const database: MemoryDB = { user: [], account: [], session: [], verification: [] };
        const testAuth = betterAuth({
            database: memoryAdapter(database),
            baseURL,
            secret,
            socialProviders: {
                discord: {
                    clientId: "discord-client",
                    clientSecret: "discord-secret",
                    mapProfileToUser: mapDiscordProfileToUser,
                    overrideUserInfoOnSignIn: true,
                },
            },
        });
        mockDiscordProvider();

        await completeDiscordLogin(testAuth);
        await completeDiscordLogin(testAuth);

        expect(database.user).toHaveLength(1);
        expect(database.account).toHaveLength(1);
        expect(database.account[0]).toMatchObject({
            providerId: "discord",
            accountId: "123456789012345678",
            userId: database.user[0]?.id,
        });
    });

    it("creates one canonical user for a new osu! identity, uses PKCE, and reuses it on later login", async () => {
        const database: MemoryDB = { user: [], account: [], session: [], verification: [] };
        const codeVerifiers: string[] = [];
        const testAuth = betterAuth({
            database: memoryAdapter(database),
            baseURL,
            secret,
            plugins: [
                genericOAuth({
                    config: [
                        {
                            providerId: "osu",
                            clientId: "osu-client",
                            clientSecret: "osu-secret",
                            authorizationUrl: "https://osu.ppy.sh/oauth/authorize",
                            tokenUrl: "https://osu.ppy.sh/oauth/token",
                            scopes: ["identify"],
                            pkce: true,
                            getToken: async ({ codeVerifier }) => {
                                if (codeVerifier) codeVerifiers.push(codeVerifier);
                                return { accessToken: "server-only-access-token" };
                            },
                            getUserInfo: async () => ({
                                id: "24680",
                                name: "osu! Yoru",
                                email: createOsuPlaceholderEmail("24680"),
                                emailVerified: false,
                                image: "https://a.ppy.sh/24680",
                            }),
                            overrideUserInfo: true,
                        },
                    ],
                }),
            ],
        });

        await completeGenericLogin(testAuth, "osu");
        await completeGenericLogin(testAuth, "osu");

        expect(codeVerifiers).toHaveLength(2);
        expect(codeVerifiers.every((value) => value.length >= 43)).toBe(true);
        expect(database.user).toHaveLength(1);
        expect(database.account).toHaveLength(1);
        expect(database.account[0]).toMatchObject({
            providerId: "osu",
            accountId: "24680",
            userId: database.user[0]?.id,
        });
    });

    it("links an unowned osu! identity to the signed-in Discord canonical user", async () => {
        const { testAuth, database } = createUnifiedAuth();
        mockDiscordProvider();
        const discordLogin = await completeDiscordLogin(testAuth);
        const sessionCookie = readSessionCookie(discordLogin);

        await linkGenericProvider(testAuth, "osu", sessionCookie);

        expect(database.user).toHaveLength(1);
        expect(database.user[0]?.name).toBe("Yoru");
        expect(database.account).toHaveLength(2);
        expect(new Set(database.account.map((account) => account.userId))).toEqual(new Set([database.user[0]?.id]));
    });

    it("links an unowned Discord identity to the signed-in osu! canonical user", async () => {
        const { testAuth, database } = createUnifiedAuth();
        mockDiscordProvider();
        const osuLogin = await completeGenericLogin(testAuth, "osu");
        const sessionCookie = readSessionCookie(osuLogin);

        await linkDiscordProvider(testAuth, sessionCookie);

        expect(database.user).toHaveLength(1);
        expect(database.user[0]?.name).toBe("osu! Yoru");
        expect(database.account).toHaveLength(2);
        expect(new Set(database.account.map((account) => account.userId))).toEqual(new Set([database.user[0]?.id]));
    });

    it("fails closed when the provider identity already belongs to another canonical user", async () => {
        const { testAuth, database } = createUnifiedAuth();
        mockDiscordProvider();
        const discordLogin = await completeDiscordLogin(testAuth);
        const discordSession = readSessionCookie(discordLogin);
        await completeGenericLogin(testAuth, "osu");

        const conflict = await linkGenericProvider(testAuth, "osu", discordSession);

        expect(conflict.headers.get("location")).toContain("account_already_linked_to_different_user");
        expect(database.user).toHaveLength(2);
        expect(database.account).toHaveLength(2);
        expect(new Set(database.account.map((account) => account.userId)).size).toBe(2);
    });

    it("lets a Discord-only user link osu!, unlink Discord, and keep the same osu!-authenticated canonical user", async () => {
        const { testAuth, database } = createUnifiedAuth();
        mockDiscordProvider();
        const discordLogin = await completeDiscordLogin(testAuth);
        const sessionCookie = readSessionCookie(discordLogin);
        const canonicalUserId = database.user[0]?.id;

        expect(database.account.map((account) => account.providerId)).toEqual(["discord"]);

        await linkGenericProvider(testAuth, "osu", sessionCookie);
        expect(database.account.map((account) => account.providerId).sort()).toEqual(["discord", "osu"]);

        const unlinkDiscord = await unlinkProvider(testAuth, "discord", "123456789012345678", sessionCookie);
        expect(unlinkDiscord.status).toBe(200);
        expect(database.user).toHaveLength(1);
        expect(database.user[0]?.id).toBe(canonicalUserId);
        expect(database.account).toEqual([expect.objectContaining({ providerId: "osu", userId: canonicalUserId })]);

        await completeGenericLogin(testAuth, "osu");
        expect(database.user).toHaveLength(1);
        expect(database.user[0]?.id).toBe(canonicalUserId);
    });

    it("lets an osu!-only user link Discord, unlink osu!, and keep the same Discord-authenticated canonical user", async () => {
        const { testAuth, database } = createUnifiedAuth();
        mockDiscordProvider();
        const osuLogin = await completeGenericLogin(testAuth, "osu");
        const sessionCookie = readSessionCookie(osuLogin);
        const canonicalUserId = database.user[0]?.id;

        expect(database.account.map((account) => account.providerId)).toEqual(["osu"]);

        await linkDiscordProvider(testAuth, sessionCookie);
        expect(database.account.map((account) => account.providerId).sort()).toEqual(["discord", "osu"]);

        const unlinkOsu = await unlinkProvider(testAuth, "osu", "24680", sessionCookie);
        expect(unlinkOsu.status).toBe(200);
        expect(database.user).toHaveLength(1);
        expect(database.user[0]?.id).toBe(canonicalUserId);
        expect(database.account).toEqual([expect.objectContaining({ providerId: "discord", userId: canonicalUserId })]);

        await completeDiscordLogin(testAuth);
        expect(database.user).toHaveLength(1);
        expect(database.user[0]?.id).toBe(canonicalUserId);
    });

    it("unlinks only one provider and refuses to remove the final login method", async () => {
        const { testAuth, database } = createUnifiedAuth();
        mockDiscordProvider();
        const discordLogin = await completeDiscordLogin(testAuth);
        const sessionCookie = readSessionCookie(discordLogin);
        await linkGenericProvider(testAuth, "osu", sessionCookie);

        const unlinkOsu = await unlinkProvider(testAuth, "osu", "24680", sessionCookie);
        expect(unlinkOsu.status).toBe(200);
        expect(database.account).toHaveLength(1);
        expect(database.account[0]).toMatchObject({ providerId: "discord", accountId: "123456789012345678" });

        const unlinkFinal = await unlinkProvider(testAuth, "discord", "123456789012345678", sessionCookie);
        expect(unlinkFinal.status).toBe(400);
        expect(database.account).toHaveLength(1);
    });
});

function createUnifiedAuth() {
    const database: MemoryDB = { user: [], account: [], session: [], verification: [] };
    const testAuth = betterAuth({
        database: memoryAdapter(database),
        baseURL,
        secret,
        account: {
            accountLinking: {
                allowDifferentEmails: true,
                disableImplicitLinking: true,
                trustedProviders: ["discord", "osu"],
                updateUserInfoOnLink: false,
            },
        },
        socialProviders: {
            discord: {
                clientId: "discord-client",
                clientSecret: "discord-secret",
                mapProfileToUser: mapDiscordProfileToUser,
                overrideUserInfoOnSignIn: true,
            },
        },
        plugins: [
            genericOAuth({
                config: [
                    {
                        providerId: "osu",
                        clientId: "osu-client",
                        clientSecret: "osu-secret",
                        authorizationUrl: "https://osu.ppy.sh/oauth/authorize",
                        tokenUrl: "https://osu.ppy.sh/oauth/token",
                        scopes: ["identify"],
                        pkce: true,
                        getToken: async () => ({ accessToken: "server-only-access-token" }),
                        getUserInfo: async () => ({
                            id: "24680",
                            name: "osu! Yoru",
                            email: createOsuPlaceholderEmail("24680"),
                            emailVerified: false,
                            image: "https://a.ppy.sh/24680",
                        }),
                        overrideUserInfo: true,
                    },
                ],
            }),
        ],
    });
    return { testAuth, database };
}

function mockDiscordProvider(): void {
    const providerFetch = async (input: URL | RequestInfo): Promise<Response> => {
        const url = String(input);
        if (url === "https://discord.com/api/oauth2/token") {
            return Response.json({
                access_token: "server-only-access-token",
                token_type: "Bearer",
                expires_in: 3_600,
                scope: "identify email",
            });
        }
        if (url === "https://discord.com/api/users/@me" || url === "https://discord.com/api/users/%40me") {
            return Response.json({
                id: "123456789012345678",
                username: "yoru",
                global_name: "Yoru",
                discriminator: "0",
                avatar: null,
                email: null,
                verified: false,
            });
        }
        throw new Error(`Unexpected provider request: ${url}`);
    };
    spyOn(globalThis, "fetch").mockImplementation(providerFetch as typeof fetch);
}

async function completeDiscordLogin(testAuth: AuthHandler): Promise<Response> {
    const start = await testAuth.handler(
        new Request(`${baseURL}/api/auth/sign-in/social`, {
            method: "POST",
            headers: { "Content-Type": "application/json", Origin: baseURL },
            body: JSON.stringify({
                provider: "discord",
                callbackURL: "/profile",
                disableRedirect: true,
            }),
        }),
    );
    expect(start.status).toBe(200);
    const data = (await start.json()) as { url: string };
    const authorization = new URL(data.url);
    const state = authorization.searchParams.get("state");
    expect(state).toBeTruthy();
    const callback = await testAuth.handler(
        new Request(`${baseURL}/api/auth/callback/discord?code=test-code&state=${encodeURIComponent(state!)}`, {
            headers: { Cookie: readCookie(start) },
        }),
    );
    expect(callback.status).toBe(302);
    return callback;
}

async function completeGenericLogin(testAuth: AuthHandler, providerId: string): Promise<Response> {
    const start = await testAuth.handler(
        new Request(`${baseURL}/api/auth/sign-in/oauth2`, {
            method: "POST",
            headers: { "Content-Type": "application/json", Origin: baseURL },
            body: JSON.stringify({
                providerId,
                callbackURL: "/profile",
                requestSignUp: true,
                disableRedirect: true,
            }),
        }),
    );
    expect(start.status).toBe(200);
    const data = (await start.json()) as { url: string };
    const authorization = new URL(data.url);
    expect(authorization.searchParams.get("code_challenge_method")).toBe("S256");
    expect(authorization.searchParams.get("redirect_uri")).toBe(`${baseURL}/api/auth/oauth2/callback/${providerId}`);
    const state = authorization.searchParams.get("state");
    expect(state).toBeTruthy();
    const callback = await testAuth.handler(
        new Request(`${baseURL}/api/auth/oauth2/callback/${providerId}?code=test-code&state=${encodeURIComponent(state!)}`, {
            headers: { Cookie: readCookie(start) },
        }),
    );
    expect(callback.status).toBe(302);
    return callback;
}

async function linkGenericProvider(testAuth: AuthHandler, providerId: string, sessionCookie: string): Promise<Response> {
    const start = await testAuth.handler(
        new Request(`${baseURL}/api/auth/oauth2/link`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Cookie: sessionCookie,
                Origin: baseURL,
            },
            body: JSON.stringify({ providerId, callbackURL: "/profile" }),
        }),
    );
    expect(start.status).toBe(200);
    const data = (await start.json()) as { url: string };
    const state = new URL(data.url).searchParams.get("state");
    expect(state).toBeTruthy();
    const callback = await testAuth.handler(
        new Request(`${baseURL}/api/auth/oauth2/callback/${providerId}?code=test-code&state=${encodeURIComponent(state!)}`, {
            headers: { Cookie: combineCookies(sessionCookie, readCookie(start)) },
        }),
    );
    expect(callback.status).toBe(302);
    return callback;
}

async function linkDiscordProvider(testAuth: AuthHandler, sessionCookie: string): Promise<Response> {
    const start = await testAuth.handler(
        new Request(`${baseURL}/api/auth/link-social`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Cookie: sessionCookie,
                Origin: baseURL,
            },
            body: JSON.stringify({ provider: "discord", callbackURL: "/profile", disableRedirect: true }),
        }),
    );
    expect(start.status).toBe(200);
    const data = (await start.json()) as { url: string };
    const state = new URL(data.url).searchParams.get("state");
    expect(state).toBeTruthy();
    const callback = await testAuth.handler(
        new Request(`${baseURL}/api/auth/callback/discord?code=test-code&state=${encodeURIComponent(state!)}`, {
            headers: { Cookie: combineCookies(sessionCookie, readCookie(start)) },
        }),
    );
    expect(callback.status).toBe(302);
    return callback;
}

function unlinkProvider(testAuth: AuthHandler, providerId: string, accountId: string, sessionCookie: string): Promise<Response> {
    return testAuth.handler(
        new Request(`${baseURL}/api/auth/unlink-account`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Cookie: sessionCookie,
                Origin: baseURL,
            },
            body: JSON.stringify({ providerId, accountId }),
        }),
    );
}

function readCookie(response: Response): string {
    const value = response.headers.get("set-cookie");
    if (!value) throw new Error("OAuth initiation did not set a state cookie");
    return value.split(";", 1)[0]!;
}

function readSessionCookie(response: Response): string {
    const value = response.headers.get("set-cookie");
    if (!value) throw new Error("OAuth callback did not set a session cookie");
    const match = value.match(/(?:__Secure-)?better-auth\.session_token=[^;,]+/);
    if (!match) throw new Error("OAuth callback did not set a Better Auth session cookie");
    return match[0];
}

function combineCookies(...cookies: string[]): string {
    return cookies.join("; ");
}

interface AuthHandler {
    handler(request: Request): Promise<Response>;
}
