import { afterAll, beforeAll, beforeEach, describe, expect, it } from "bun:test";
import mysql, { type RowDataPacket } from "mysql2/promise";

import { runIdentityBackfillWithLock, runWebMigrations } from "../migrations";
import { prepareDisposableBetterAuthSchema, readDisposableDatabaseUrl } from "../testing/better-auth-schema";
import { IdentityBackfillConflictError } from "./backfill";

const webUrl = readDisposableDatabaseUrl("TEST_DATABASE_URL", process.env.WEB_DATABASE_URL);
const botUrl = readDisposableDatabaseUrl("TEST_BOT_DATABASE_URL", process.env.BOT_DATABASE_URL);
const enabled = Boolean(webUrl && botUrl && webUrl !== botUrl);
const describeDatabase = enabled ? describe : describe.skip;
const webPool = webUrl ? mysql.createPool({ uri: webUrl, timezone: "Z" }) : null;
const botPool = botUrl ? mysql.createPool({ uri: botUrl, timezone: "Z" }) : null;
const now = new Date("2026-07-18T12:00:00.000Z");

describeDatabase("canonical identity backfill", () => {
    beforeAll(async () => {
        if (!webPool || !botPool) throw new Error("Separate disposable Web and Bot test databases are required");
        await prepareDisposableBetterAuthSchema(webPool);
        await runWebMigrations(webPool, { skipIdentityBackfill: true });
        await botPool.query(`CREATE TABLE IF NOT EXISTS users (
            id VARCHAR(255) NOT NULL,
            banchoId VARCHAR(255) NULL,
            PRIMARY KEY (id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);
    });

    beforeEach(async () => {
        if (!webPool || !botPool) throw new Error("Disposable test databases are unavailable");
        await webPool.execute("DELETE FROM botIdentitySync");
        await webPool.execute("DELETE FROM session");
        await webPool.execute("DELETE FROM account");
        await webPool.execute("DELETE FROM user");
        await botPool.execute("DELETE FROM users");
    });

    afterAll(async () => {
        await webPool?.end();
        await botPool?.end();
    });

    it("maps Better Auth Discord accounts through Bot Discord IDs to osu! identities and reruns safely", async () => {
        if (!webPool || !botPool) throw new Error("Disposable test databases are unavailable");
        await seedWebAccount("user-1", "123456789012345678");
        await botPool.execute("INSERT INTO users (id, banchoId) VALUES (?, ?)", ["123456789012345678", "24680"]);

        const first = await runIdentityBackfillWithLock(webPool, botPool);
        const second = await runIdentityBackfillWithLock(webPool, botPool);
        expect(first).toMatchObject({
            accountsCreated: 1,
            identitiesCreated: 2,
            identitiesUpdated: 0,
            skippedInvalid: 0,
            conflicts: [],
        });
        expect(second).toMatchObject({
            accountsCreated: 0,
            identitiesCreated: 0,
            identitiesUpdated: 0,
            alreadyConsistent: 2,
            skippedInvalid: 0,
            conflicts: [],
        });

        const [rows] = await webPool.execute<RowDataPacket[]>(
            "SELECT userId, provider, providerUserId FROM userIdentity ORDER BY provider",
        );
        expect(rows).toEqual([
            expect.objectContaining({ userId: "user-1", provider: "discord", providerUserId: "123456789012345678" }),
            expect.objectContaining({ userId: "user-1", provider: "osu", providerUserId: "24680" }),
        ]);
        const [accounts] = await webPool.execute<RowDataPacket[]>(
            "SELECT userId, providerId, accountId, accessToken, refreshToken FROM account WHERE userId = ? ORDER BY providerId",
            ["user-1"],
        );
        expect(accounts).toEqual([
            expect.objectContaining({
                userId: "user-1",
                providerId: "discord",
                accountId: "123456789012345678",
            }),
            expect.objectContaining({
                userId: "user-1",
                providerId: "osu",
                accountId: "24680",
                accessToken: null,
                refreshToken: null,
            }),
        ]);
    });

    it("skips null and malformed Bot osu! IDs without guessing", async () => {
        if (!webPool || !botPool) throw new Error("Disposable test databases are unavailable");
        await seedWebAccount("user-1", "123456789012345678");
        await seedWebAccount("user-2", "222222222222222222");
        await botPool.execute("INSERT INTO users (id, banchoId) VALUES (?, NULL), (?, ?)", [
            "123456789012345678",
            "222222222222222222",
            "not-an-osu-id",
        ]);

        const summary = await runIdentityBackfillWithLock(webPool, botPool);
        expect(summary).toMatchObject({ identitiesCreated: 2, skippedInvalid: 2, conflicts: [] });
        const [osuRows] = await webPool.execute<RowDataPacket[]>("SELECT id FROM userIdentity WHERE provider = 'osu'");
        expect(osuRows).toHaveLength(0);
    });

    it("reports an osu! subject collision and writes no partial identities", async () => {
        if (!webPool || !botPool) throw new Error("Disposable test databases are unavailable");
        await seedWebAccount("user-1", "123456789012345678");
        await seedWebAccount("user-2", "222222222222222222");
        await botPool.execute("INSERT INTO users (id, banchoId) VALUES (?, ?), (?, ?)", [
            "123456789012345678",
            "24680",
            "222222222222222222",
            "24680",
        ]);

        await expect(runIdentityBackfillWithLock(webPool, botPool)).rejects.toBeInstanceOf(IdentityBackfillConflictError);
        const [rows] = await webPool.execute<RowDataPacket[]>("SELECT id FROM userIdentity");
        expect(rows).toHaveLength(0);
        const [osuAccounts] = await webPool.execute<RowDataPacket[]>("SELECT id FROM account WHERE providerId = 'osu'");
        expect(osuAccounts).toHaveLength(0);
    });

    it("repairs an existing legacy osu! identity without replacing its profile snapshot", async () => {
        if (!webPool || !botPool) throw new Error("Disposable test databases are unavailable");
        await seedWebAccount("user-1", "123456789012345678");
        await botPool.execute("INSERT INTO users (id, banchoId) VALUES (?, ?)", ["123456789012345678", "24680"]);
        await webPool.execute(
            `INSERT INTO userIdentity
                (id, userId, provider, providerUserId, username, displayName, avatarUrl, metadata, linkedAt, updatedAt)
             VALUES ('identity-osu', 'user-1', 'osu', '24680', 'legacy-name', 'Legacy Name',
                     'https://a.ppy.sh/24680', NULL, ?, ?)`,
            [now, now],
        );

        const summary = await runIdentityBackfillWithLock(webPool, botPool);
        expect(summary).toMatchObject({ accountsCreated: 1, identitiesCreated: 1, identitiesUpdated: 0, conflicts: [] });
        const [accounts] = await webPool.execute<RowDataPacket[]>(
            "SELECT userId, providerId, accountId FROM account WHERE providerId = 'osu'",
        );
        expect(accounts).toEqual([expect.objectContaining({ userId: "user-1", providerId: "osu", accountId: "24680" })]);
        const [identities] = await webPool.execute<RowDataPacket[]>(
            "SELECT username, displayName FROM userIdentity WHERE provider = 'osu'",
        );
        expect(identities).toEqual([expect.objectContaining({ username: "legacy-name", displayName: "Legacy Name" })]);
    });

    it("runs the additive repair migration for an installation where the original migration is already applied", async () => {
        if (!webPool || !botPool) throw new Error("Disposable test databases are unavailable");
        await seedWebAccount("user-1", "123456789012345678");
        await botPool.execute("INSERT INTO users (id, banchoId) VALUES (?, ?)", ["123456789012345678", "24680"]);
        await webPool.execute(
            `INSERT INTO userIdentity
                (id, userId, provider, providerUserId, username, displayName, avatarUrl, metadata, linkedAt, updatedAt)
             VALUES ('identity-osu', 'user-1', 'osu', '24680', NULL, NULL, NULL, NULL, ?, ?)`,
            [now, now],
        );
        await webPool.execute("DELETE FROM webSchemaMigration WHERE id = '20260718_reconcile_legacy_osu_auth_accounts'");

        await runWebMigrations(webPool, { botPool });

        const [accounts] = await webPool.execute<RowDataPacket[]>(
            "SELECT userId, providerId, accountId FROM account WHERE providerId = 'osu'",
        );
        expect(accounts).toEqual([expect.objectContaining({ userId: "user-1", providerId: "osu", accountId: "24680" })]);
        const [migration] = await webPool.execute<RowDataPacket[]>(
            "SELECT id FROM webSchemaMigration WHERE id = '20260718_reconcile_legacy_osu_auth_accounts'",
        );
        expect(migration).toHaveLength(1);
    });

    it("reports disagreement between Better Auth and the identity projection before writing", async () => {
        if (!webPool || !botPool) throw new Error("Disposable test databases are unavailable");
        await seedWebAccount("user-1", "123456789012345678");
        await seedWebAccount("user-2", "222222222222222222");
        await botPool.execute("INSERT INTO users (id, banchoId) VALUES (?, ?)", ["123456789012345678", "24680"]);
        await webPool.execute(
            `INSERT INTO account (id, accountId, providerId, userId, createdAt, updatedAt)
             VALUES ('account-osu-other', '24680', 'osu', 'user-2', ?, ?)`,
            [now, now],
        );
        await webPool.execute(
            `INSERT INTO userIdentity
                (id, userId, provider, providerUserId, username, displayName, avatarUrl, metadata, linkedAt, updatedAt)
             VALUES ('identity-osu', 'user-1', 'osu', '24680', NULL, NULL, NULL, NULL, ?, ?)`,
            [now, now],
        );

        const error = await runIdentityBackfillWithLock(webPool, botPool).catch((caught: unknown) => caught);
        expect(error).toBeInstanceOf(IdentityBackfillConflictError);
        expect((error as IdentityBackfillConflictError).summary.conflicts.join(" ")).toContain("disagree");
    });
});

async function seedWebAccount(userId: string, discordId: string): Promise<void> {
    if (!webPool) throw new Error("Disposable Web test database is unavailable");
    await webPool.execute(
        `INSERT INTO user
            (id, name, email, emailVerified, image, createdAt, updatedAt)
         VALUES (?, ?, ?, FALSE, ?, ?, ?)`,
        [userId, `User ${userId}`, `${userId}@example.test`, `https://example.test/${userId}.png`, now, now],
    );
    await webPool.execute(
        `INSERT INTO account
            (id, accountId, providerId, userId, createdAt, updatedAt)
         VALUES (?, ?, 'discord', ?, ?, ?)`,
        [`account-${userId}`, discordId, userId, now, now],
    );
}
