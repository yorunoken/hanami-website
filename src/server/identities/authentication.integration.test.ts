import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, mock, spyOn } from "bun:test";
import { betterAuth } from "better-auth";
import { genericOAuth } from "better-auth/plugins";
import mysql, { type Pool, type RowDataPacket } from "mysql2/promise";

import { createOsuPlaceholderEmail } from "@/lib/osu-identity";
import { mapDiscordProfileToUser } from "@/lib/discord-identity";
import { runIdentityBackfillWithLock, runWebMigrations } from "../migrations";
import { prepareDisposableBetterAuthSchema, readDisposableDatabaseUrl } from "../testing/better-auth-schema";
import { createIdentityDatabaseHooks } from "./auth-hooks";
import { diagnoseOrphanAuthenticationUsers } from "./orphan-diagnostic";
import { UserIdentityRepository } from "./repository";
import { unlinkProviderAccount } from "./unlink";

const webUrl = readDisposableDatabaseUrl("TEST_DATABASE_URL", process.env.WEB_DATABASE_URL);
const botUrl = readDisposableDatabaseUrl("TEST_BOT_DATABASE_URL", process.env.BOT_DATABASE_URL);
const enabled = Boolean(webUrl && botUrl && webUrl !== botUrl);
const describeDatabase = enabled ? describe : describe.skip;
const webPool = webUrl ? mysql.createPool({ uri: webUrl, timezone: "Z" }) : null;
const botPool = botUrl ? mysql.createPool({ uri: botUrl, timezone: "Z" }) : null;
const repository = webPool ? new UserIdentityRepository(webPool) : null;
const baseURL = "https://hanami-integration.test";
const now = new Date("2026-07-18T12:00:00.000Z");
const discordId = "123456789012345678";
const osuId = "24680";

afterEach(() => {
    mock.restore();
});

describeDatabase("Better Auth reconciled identity lifecycle on MariaDB", () => {
    let testAuth: ReturnType<typeof createTestAuth>;

    beforeAll(async () => {
        if (!webPool || !botPool || !repository) throw new Error("Separate disposable Web and Bot databases are required");
        await prepareDisposableBetterAuthSchema(webPool);
        await runWebMigrations(webPool, { skipIdentityBackfill: true });
        await botPool.query(`CREATE TABLE IF NOT EXISTS users (
            id VARCHAR(255) NOT NULL,
            banchoId VARCHAR(255) NULL,
            PRIMARY KEY (id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);
        testAuth = createTestAuth(webPool, repository);
    });

    beforeEach(async () => {
        if (!webPool || !botPool) throw new Error("Disposable databases are unavailable");
        await webPool.execute("DELETE FROM botIdentitySync");
        await webPool.execute("DELETE FROM verification");
        await webPool.execute("DELETE FROM session");
        await webPool.execute("DELETE FROM account");
        await webPool.execute("DELETE FROM user");
        await botPool.execute("DELETE FROM users");
        await seedLegacyDiscordUser(webPool, botPool);
        await runIdentityBackfillWithLock(webPool, botPool);
    });

    afterAll(async () => {
        await webPool?.end();
        await botPool?.end();
    });

    it("signs a migrated osu! subject into the existing user and unlinks Discord through real Better Auth", async () => {
        if (!webPool || !repository) throw new Error("Disposable Web database is unavailable");
        const canonicalUserId = "legacy-user";
        const osuLogin = await completeOsuLogin(testAuth);
        const sessionCookie = readSessionCookie(osuLogin);

        expect(await readCanonicalUserIds(webPool)).toEqual([canonicalUserId]);
        expect(await readProviderRows(webPool, "account")).toEqual([
            { provider: "discord", providerUserId: discordId, userId: canonicalUserId },
            { provider: "osu", providerUserId: osuId, userId: canonicalUserId },
        ]);
        expect(await readProviderRows(webPool, "userIdentity")).toEqual([
            { provider: "discord", providerUserId: discordId, userId: canonicalUserId },
            { provider: "osu", providerUserId: osuId, userId: canonicalUserId },
        ]);

        await unlinkProviderAccount(
            repository,
            (input) => testAuth.api.unlinkAccount(input),
            new Headers({ Cookie: sessionCookie, Origin: baseURL }),
            canonicalUserId,
            "discord",
        );

        expect(await readProviderRows(webPool, "account")).toEqual([{ provider: "osu", providerUserId: osuId, userId: canonicalUserId }]);
        expect(await readProviderRows(webPool, "userIdentity")).toEqual([
            { provider: "osu", providerUserId: osuId, userId: canonicalUserId },
        ]);
        expect(await readCanonicalUserIds(webPool)).toEqual([canonicalUserId]);

        const repeatedOsuLogin = await completeOsuLogin(testAuth);
        expect(await readCanonicalUserIds(webPool)).toEqual([canonicalUserId]);
        const repeatedOsuSession = readSessionCookie(repeatedOsuLogin);

        mockDiscordProvider();
        await linkDiscordProvider(testAuth, repeatedOsuSession);
        expect(await readProviderRows(webPool, "account")).toEqual([
            { provider: "discord", providerUserId: discordId, userId: canonicalUserId },
            { provider: "osu", providerUserId: osuId, userId: canonicalUserId },
        ]);

        await unlinkProviderAccount(
            repository,
            (input) => testAuth.api.unlinkAccount(input),
            new Headers({ Cookie: repeatedOsuSession, Origin: baseURL }),
            canonicalUserId,
            "osu",
        );
        expect(await readProviderRows(webPool, "account")).toEqual([
            { provider: "discord", providerUserId: discordId, userId: canonicalUserId },
        ]);

        await completeDiscordLogin(testAuth);
        expect(await readCanonicalUserIds(webPool)).toEqual([canonicalUserId]);
        await expect(
            unlinkProviderAccount(
                repository,
                (input) => testAuth.api.unlinkAccount(input),
                new Headers({ Cookie: repeatedOsuSession, Origin: baseURL }),
                canonicalUserId,
                "discord",
            ),
        ).rejects.toEqual(expect.objectContaining({ code: "final_login_method" }));
    });

    it("unlinks osu! while the real Discord Better Auth account remains", async () => {
        if (!webPool || !repository) throw new Error("Disposable Web database is unavailable");
        const canonicalUserId = "legacy-user";
        const osuLogin = await completeOsuLogin(testAuth);
        const sessionCookie = readSessionCookie(osuLogin);

        await unlinkProviderAccount(
            repository,
            (input) => testAuth.api.unlinkAccount(input),
            new Headers({ Cookie: sessionCookie, Origin: baseURL }),
            canonicalUserId,
            "osu",
        );

        expect(await readProviderRows(webPool, "account")).toEqual([
            { provider: "discord", providerUserId: discordId, userId: canonicalUserId },
        ]);
        expect(await readProviderRows(webPool, "userIdentity")).toEqual([
            { provider: "discord", providerUserId: discordId, userId: canonicalUserId },
        ]);
        expect(await readCanonicalUserIds(webPool)).toEqual([canonicalUserId]);

        mockDiscordProvider();
        await completeDiscordLogin(testAuth);
        expect(await readCanonicalUserIds(webPool)).toEqual([canonicalUserId]);
    });

    it("does not treat an identity-only mismatch as an active authentication method", async () => {
        if (!webPool || !repository) throw new Error("Disposable Web database is unavailable");
        await webPool.execute("DELETE FROM account WHERE providerId = 'osu'");

        const states = await repository.getUserAuthenticationIdentities("legacy-user");
        expect(states.find((identity) => identity.provider === "osu")).toMatchObject({
            providerUserId: osuId,
            canAuthenticate: false,
            status: "repair_required",
        });
        expect(await repository.getUserAuthenticationAccountCount("legacy-user")).toBe(1);
    });

    it("reports whether a rejected provider-owned callback leaves a provable orphan", async () => {
        if (!webPool) throw new Error("Disposable Web database is unavailable");
        await webPool.execute("DELETE FROM account WHERE providerId = 'osu'");

        const callback = await completeOsuLogin(testAuth);
        expect(callback.headers.get("location")).toContain("error");
        expect(await diagnoseOrphanAuthenticationUsers(webPool)).toEqual([
            expect.objectContaining({ accountCount: 0, classification: "no_accounts" }),
        ]);
        expect(await readCanonicalUserIds(webPool)).toHaveLength(2);
    });
});

function createTestAuth(pool: Pool, identities: UserIdentityRepository) {
    return betterAuth({
        database: pool,
        baseURL,
        secret: "integration-secret-that-is-at-least-thirty-two-characters",
        databaseHooks: createIdentityDatabaseHooks(identities),
        session: { freshAge: 15 * 60 },
        account: {
            accountLinking: {
                allowDifferentEmails: true,
                disableImplicitLinking: true,
                trustedProviders: ["discord", "osu"],
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
                        getToken: async () => ({ accessToken: "server-only-integration-token" }),
                        getUserInfo: async () => ({
                            id: osuId,
                            name: "Legacy osu user",
                            email: createOsuPlaceholderEmail(osuId),
                            emailVerified: false,
                            image: `https://a.ppy.sh/${osuId}`,
                        }),
                        overrideUserInfo: true,
                    },
                ],
            }),
        ],
    });
}

async function completeOsuLogin(testAuth: ReturnType<typeof createTestAuth>): Promise<Response> {
    const start = await testAuth.handler(
        new Request(`${baseURL}/api/auth/sign-in/oauth2`, {
            method: "POST",
            headers: { "Content-Type": "application/json", Origin: baseURL },
            body: JSON.stringify({ providerId: "osu", callbackURL: "/profile", requestSignUp: true, disableRedirect: true }),
        }),
    );
    expect(start.status).toBe(200);
    const data = (await start.json()) as { url: string };
    const state = new URL(data.url).searchParams.get("state");
    expect(state).toBeTruthy();
    const callback = await testAuth.handler(
        new Request(`${baseURL}/api/auth/oauth2/callback/osu?code=test-code&state=${encodeURIComponent(state!)}`, {
            headers: { Cookie: readCookie(start) },
        }),
    );
    expect(callback.status).toBe(302);
    return callback;
}

async function completeDiscordLogin(testAuth: ReturnType<typeof createTestAuth>): Promise<Response> {
    const start = await testAuth.handler(
        new Request(`${baseURL}/api/auth/sign-in/social`, {
            method: "POST",
            headers: { "Content-Type": "application/json", Origin: baseURL },
            body: JSON.stringify({ provider: "discord", callbackURL: "/profile", disableRedirect: true }),
        }),
    );
    expect(start.status).toBe(200);
    const data = (await start.json()) as { url: string };
    const state = new URL(data.url).searchParams.get("state");
    expect(state).toBeTruthy();
    const callback = await testAuth.handler(
        new Request(`${baseURL}/api/auth/callback/discord?code=test-code&state=${encodeURIComponent(state!)}`, {
            headers: { Cookie: readCookie(start) },
        }),
    );
    expect(callback.status).toBe(302);
    return callback;
}

async function linkDiscordProvider(testAuth: ReturnType<typeof createTestAuth>, sessionCookie: string): Promise<Response> {
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
            headers: { Cookie: `${sessionCookie}; ${readCookie(start)}` },
        }),
    );
    expect(callback.status).toBe(302);
    return callback;
}

function mockDiscordProvider(): void {
    const providerFetch = async (input: URL | RequestInfo): Promise<Response> => {
        const url = String(input);
        if (url === "https://discord.com/api/oauth2/token") {
            return Response.json({
                access_token: "server-only-integration-token",
                token_type: "Bearer",
                expires_in: 3_600,
                scope: "identify email",
            });
        }
        if (url === "https://discord.com/api/users/@me" || url === "https://discord.com/api/users/%40me") {
            return Response.json({
                id: discordId,
                username: "legacy-user",
                global_name: "Legacy User",
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

async function seedLegacyDiscordUser(web: Pool, bot: Pool): Promise<void> {
    await web.execute(
        `INSERT INTO user (id, name, email, emailVerified, image, createdAt, updatedAt)
         VALUES ('legacy-user', 'Legacy user', 'legacy@example.test', FALSE, NULL, ?, ?)`,
        [now, now],
    );
    await web.execute(
        `INSERT INTO account (id, accountId, providerId, userId, createdAt, updatedAt)
         VALUES ('legacy-discord-account', ?, 'discord', 'legacy-user', ?, ?)`,
        [discordId, now, now],
    );
    await bot.execute("INSERT INTO users (id, banchoId) VALUES (?, ?)", [discordId, osuId]);
}

async function readCanonicalUserIds(pool: Pool): Promise<string[]> {
    const [rows] = await pool.execute<RowDataPacket[]>("SELECT id FROM user ORDER BY id");
    return rows.map((row) => String(row.id));
}

async function readProviderRows(pool: Pool, table: "account" | "userIdentity") {
    const providerColumn = table === "account" ? "providerId" : "provider";
    const subjectColumn = table === "account" ? "accountId" : "providerUserId";
    const [rows] = await pool.query<RowDataPacket[]>(
        `SELECT ${providerColumn} AS provider, ${subjectColumn} AS providerUserId, userId
           FROM ${table}
          ORDER BY provider`,
    );
    return rows.map((row) => ({
        provider: String(row.provider),
        providerUserId: String(row.providerUserId),
        userId: String(row.userId),
    }));
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
