import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, mock, spyOn } from "bun:test";
import { betterAuth } from "better-auth";
import { genericOAuth } from "better-auth/plugins";
import mysql, { type Pool, type RowDataPacket } from "mysql2/promise";

import { mapDiscordProfileToUser } from "@/lib/discord-identity";
import { createOsuPlaceholderEmail } from "@/lib/osu-identity";
import { runWebMigrations } from "../migrations";
import { prepareDisposableBetterAuthSchema, readDisposableDatabaseUrl } from "../testing/better-auth-schema";
import { importLegacyOsuAccounts, LegacyOsuImportConflictError } from "./import-legacy-osu";
import { TemporaryBotAccountCompatibility } from "./bot-compatibility";
import { AccountService } from "./service";

const webUrl = readDisposableDatabaseUrl("TEST_DATABASE_URL", process.env.WEB_DATABASE_URL);
const botUrl = readDisposableDatabaseUrl("TEST_BOT_DATABASE_URL", process.env.BOT_DATABASE_URL);
const enabled = Boolean(webUrl && botUrl && webUrl !== botUrl);
const describeDatabase = enabled ? describe : describe.skip;
const webPool = webUrl ? mysql.createPool({ uri: webUrl, timezone: "Z" }) : null;
const botPool = botUrl ? mysql.createPool({ uri: botUrl, timezone: "Z" }) : null;
const baseURL = "https://hanami-account-integration.test";
const now = new Date("2026-07-18T12:00:00.000Z");
const discordId = "123456789012345678";
const osuId = "24680";

afterEach(() => {
    mock.restore();
});

describeDatabase("Better Auth account-only lifecycle on MariaDB", () => {
    let testAuth: ReturnType<typeof createTestAuth>;

    beforeAll(async () => {
        if (!webPool || !botPool) throw new Error("Separate disposable Web and Bot databases are required");
        await prepareDisposableBetterAuthSchema(webPool);
        await runWebMigrations(webPool);
        await botPool.query(`CREATE TABLE IF NOT EXISTS users (
            id VARCHAR(255) NOT NULL,
            banchoId VARCHAR(255) NULL,
            PRIMARY KEY (id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);
        testAuth = createTestAuth(webPool);
    });

    beforeEach(async () => {
        if (!webPool || !botPool) throw new Error("Disposable databases are unavailable");
        await webPool.execute("DELETE FROM verification");
        await webPool.execute("DELETE FROM session");
        await webPool.execute("DELETE FROM account");
        await webPool.execute("DELETE FROM user");
        await botPool.execute("DELETE FROM users");
        await seedLegacyDiscordUser(webPool, botPool);
    });

    afterAll(async () => {
        await webPool?.end();
        await botPool?.end();
    });

    it("imports a tokenless osu! account idempotently and signs into the existing canonical user", async () => {
        if (!webPool || !botPool) throw new Error("Disposable databases are unavailable");
        const first = await importLegacyOsuAccounts(webPool, botPool);
        const second = await importLegacyOsuAccounts(webPool, botPool);

        expect(first).toMatchObject({ accountsCreated: 1, alreadyConsistent: 0, skippedInvalid: 0, conflicts: [] });
        expect(second).toMatchObject({ accountsCreated: 0, alreadyConsistent: 1, skippedInvalid: 0, conflicts: [] });
        expect(await readAccounts(webPool)).toEqual([
            { providerId: "discord", accountId: discordId, userId: "legacy-user", accessToken: null, refreshToken: null },
            { providerId: "osu", accountId: osuId, userId: "legacy-user", accessToken: null, refreshToken: null },
        ]);
        const service = new AccountService(webPool);
        expect(await service.listLoginMethods("legacy-user")).toEqual([
            { provider: "discord", providerUserId: discordId, createdAt: now },
            { provider: "osu", providerUserId: osuId, createdAt: now },
        ]);
        expect(await service.countLoginMethods("legacy-user")).toBe(2);
        expect((await service.findUserByProviderAccount("osu", osuId))?.id).toBe("legacy-user");

        await completeOsuLogin(testAuth);
        expect(await readUserIds(webPool)).toEqual(["legacy-user"]);
        const [tokenRows] = await webPool.execute<RowDataPacket[]>(
            "SELECT accessToken FROM account WHERE userId = 'legacy-user' AND providerId = 'osu'",
        );
        expect(tokenRows[0]?.accessToken).toBe("server-only-integration-token");
        expect(JSON.stringify(await service.listLoginMethods("legacy-user"))).not.toContain("server-only");
    });

    it("creates one canonical user and account for a new osu! login in MariaDB", async () => {
        if (!webPool || !botPool) throw new Error("Disposable databases are unavailable");
        await webPool.execute("DELETE FROM account");
        await webPool.execute("DELETE FROM user");
        await botPool.execute("DELETE FROM users");

        await completeOsuLogin(testAuth);

        const accounts = await readAccounts(webPool);
        expect(await readUserIds(webPool)).toHaveLength(1);
        expect(accounts).toHaveLength(1);
        expect(accounts[0]).toMatchObject({ providerId: "osu", accountId: osuId });
    });

    it("uses real Better Auth unlinking in both directions and preserves the canonical user", async () => {
        if (!webPool || !botPool) throw new Error("Disposable databases are unavailable");
        await importLegacyOsuAccounts(webPool, botPool);

        const osuSession = readSessionCookie(await completeOsuLogin(testAuth));
        const unlinkDiscord = await testAuth.api.unlinkAccount({
            headers: new Headers({ Cookie: osuSession, Origin: baseURL }),
            body: { providerId: "discord", accountId: discordId },
        });
        expect(unlinkDiscord).toEqual({ status: true });
        expect(await readAccountProviders(webPool)).toEqual(["osu"]);
        expect(await readUserIds(webPool)).toEqual(["legacy-user"]);
        await completeOsuLogin(testAuth);
        expect(await readUserIds(webPool)).toEqual(["legacy-user"]);

        mockDiscordProvider();
        await linkDiscordProvider(testAuth, osuSession);
        expect(await readAccountProviders(webPool)).toEqual(["discord", "osu"]);
        const unlinkOsu = await testAuth.api.unlinkAccount({
            headers: new Headers({ Cookie: osuSession, Origin: baseURL }),
            body: { providerId: "osu", accountId: osuId },
        });
        expect(unlinkOsu).toEqual({ status: true });
        expect(await readAccountProviders(webPool)).toEqual(["discord"]);
        expect(await readUserIds(webPool)).toEqual(["legacy-user"]);

        await expect(
            testAuth.api.unlinkAccount({
                headers: new Headers({ Cookie: osuSession, Origin: baseURL }),
                body: { providerId: "discord", accountId: discordId },
            }),
        ).rejects.toEqual(expect.objectContaining({ status: "BAD_REQUEST" }));
        expect(await readAccountProviders(webPool)).toEqual(["discord"]);
    });

    it("reports legacy ownership conflicts before writing", async () => {
        if (!webPool || !botPool) throw new Error("Disposable databases are unavailable");
        await seedUserWithDiscord(webPool, "other-user", "999999999999999999");
        await botPool.execute("INSERT INTO users (id, banchoId) VALUES (?, ?)", ["999999999999999999", osuId]);

        await expect(importLegacyOsuAccounts(webPool, botPool)).rejects.toBeInstanceOf(LegacyOsuImportConflictError);
        expect(await readAccountProviders(webPool)).toEqual(["discord", "discord"]);
    });

    it("skips malformed legacy osu! IDs without creating an account", async () => {
        if (!webPool || !botPool) throw new Error("Disposable databases are unavailable");
        await botPool.execute("UPDATE users SET banchoId = 'not-an-osu-id' WHERE id = ?", [discordId]);

        const summary = await importLegacyOsuAccounts(webPool, botPool);

        expect(summary).toMatchObject({ accountsCreated: 0, alreadyConsistent: 0, skippedInvalid: 1, conflicts: [] });
        expect(await readAccountProviders(webPool)).toEqual(["discord"]);
    });

    it("derives the temporary Bot mirror only from Better Auth accounts", async () => {
        if (!webPool || !botPool || !botUrl) throw new Error("Disposable databases are unavailable");
        await importLegacyOsuAccounts(webPool, botPool);
        await botPool.execute("UPDATE users SET banchoId = NULL WHERE id = ?", [discordId]);
        const compatibility = new TemporaryBotAccountCompatibility(webPool, new AccountService(webPool), () => botUrl);

        await compatibility.synchronizeUser("legacy-user");
        expect(await readBotOsuId(botPool, discordId)).toBe(osuId);

        await webPool.execute("DELETE FROM account WHERE userId = 'legacy-user' AND providerId = 'osu'");
        await compatibility.accountRemoved("legacy-user", "osu", osuId);
        expect(await readBotOsuId(botPool, discordId)).toBeNull();
    });
});

function createTestAuth(pool: Pool) {
    return betterAuth({
        database: pool,
        baseURL,
        secret: "integration-secret-that-is-at-least-thirty-two-characters",
        session: { freshAge: 15 * 60 },
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
    const state = new URL(((await start.json()) as { url: string }).url).searchParams.get("state");
    expect(state).toBeTruthy();
    const callback = await testAuth.handler(
        new Request(`${baseURL}/api/auth/oauth2/callback/osu?code=test-code&state=${encodeURIComponent(state!)}`, {
            headers: { Cookie: readCookie(start) },
        }),
    );
    expect(callback.status).toBe(302);
    return callback;
}

async function linkDiscordProvider(testAuth: ReturnType<typeof createTestAuth>, sessionCookie: string): Promise<void> {
    const start = await testAuth.handler(
        new Request(`${baseURL}/api/auth/link-social`, {
            method: "POST",
            headers: { "Content-Type": "application/json", Cookie: sessionCookie, Origin: baseURL },
            body: JSON.stringify({ provider: "discord", callbackURL: "/profile", disableRedirect: true }),
        }),
    );
    expect(start.status).toBe(200);
    const state = new URL(((await start.json()) as { url: string }).url).searchParams.get("state");
    const callback = await testAuth.handler(
        new Request(`${baseURL}/api/auth/callback/discord?code=test-code&state=${encodeURIComponent(state!)}`, {
            headers: { Cookie: `${sessionCookie}; ${readCookie(start)}` },
        }),
    );
    expect(callback.status).toBe(302);
}

function mockDiscordProvider(): void {
    spyOn(globalThis, "fetch").mockImplementation((async (input: URL | RequestInfo) => {
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
    }) as typeof fetch);
}

async function seedLegacyDiscordUser(web: Pool, bot: Pool): Promise<void> {
    await seedUserWithDiscord(web, "legacy-user", discordId);
    await bot.execute("INSERT INTO users (id, banchoId) VALUES (?, ?)", [discordId, osuId]);
}

async function seedUserWithDiscord(pool: Pool, userId: string, providerUserId: string): Promise<void> {
    await pool.execute(
        `INSERT INTO user (id, name, email, emailVerified, image, createdAt, updatedAt)
         VALUES (?, ?, ?, FALSE, NULL, ?, ?)`,
        [userId, userId, `${userId}@example.test`, now, now],
    );
    await pool.execute(
        `INSERT INTO account (id, accountId, providerId, userId, createdAt, updatedAt)
         VALUES (?, ?, 'discord', ?, ?, ?)`,
        [`account-${userId}`, providerUserId, userId, now, now],
    );
}

async function readAccounts(pool: Pool) {
    const [rows] = await pool.execute<RowDataPacket[]>(
        `SELECT providerId, accountId, userId, accessToken, refreshToken
           FROM account
          ORDER BY providerId`,
    );
    return rows.map((row) => ({
        providerId: String(row.providerId),
        accountId: String(row.accountId),
        userId: String(row.userId),
        accessToken: row.accessToken ?? null,
        refreshToken: row.refreshToken ?? null,
    }));
}

async function readAccountProviders(pool: Pool): Promise<string[]> {
    const [rows] = await pool.execute<RowDataPacket[]>("SELECT providerId FROM account ORDER BY providerId");
    return rows.map((row) => String(row.providerId));
}

async function readUserIds(pool: Pool): Promise<string[]> {
    const [rows] = await pool.execute<RowDataPacket[]>("SELECT id FROM user ORDER BY id");
    return rows.map((row) => String(row.id));
}

async function readBotOsuId(pool: Pool, providerUserId: string): Promise<string | null> {
    const [rows] = await pool.execute<RowDataPacket[]>("SELECT banchoId FROM users WHERE id = ? LIMIT 1", [providerUserId]);
    return rows[0]?.banchoId === null || rows[0]?.banchoId === undefined ? null : String(rows[0].banchoId);
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
