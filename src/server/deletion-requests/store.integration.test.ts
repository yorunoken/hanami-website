import { afterAll, beforeAll, beforeEach, describe, expect, it } from "bun:test";
import mysql, { type RowDataPacket } from "mysql2/promise";

import { runWebMigrations } from "../migrations";
import { prepareDisposableBetterAuthSchema, readDisposableDatabaseUrl } from "../testing/better-auth-schema";
import { createChallengeToken, hashChallengeToken } from "./domain";
import { MySqlAccountDeletionStore } from "./store";

const testDatabaseUrl = readDisposableDatabaseUrl("TEST_DATABASE_URL", process.env.WEB_DATABASE_URL);
const describeDatabase = testDatabaseUrl ? describe : describe.skip;
const pool = testDatabaseUrl ? mysql.createPool({ uri: testDatabaseUrl, timezone: "Z" }) : null;
const deletedBotAccounts: string[] = [];
let syncPending = false;
const compatibility = {
    accountDeleted: async (_connection: unknown, _userId: string, discordAccountId: string) => {
        deletedBotAccounts.push(discordAccountId);
    },
    flushPendingForUser: async () => ({ pending: syncPending }),
    hasPendingForUser: async () => syncPending,
};
const store = pool ? new MySqlAccountDeletionStore(pool, compatibility) : null;
const now = new Date("2026-07-14T18:00:00.000Z");

describeDatabase("MySQL immediate account deletion store", () => {
    beforeAll(async () => {
        if (!pool) throw new Error("TEST_DATABASE_URL is required");
        await prepareDisposableBetterAuthSchema(pool);
        await runWebMigrations(pool, { skipIdentityBackfill: true });
    });

    beforeEach(async () => {
        if (!pool) throw new Error("TEST_DATABASE_URL is required");
        deletedBotAccounts.length = 0;
        syncPending = false;
        await pool.execute("DELETE FROM botIdentitySync");
        await pool.execute("DELETE FROM accountDeletionReauthChallenge");
        await pool.execute("DELETE FROM session");
        await pool.execute("DELETE FROM account");
        await pool.execute("DELETE FROM user");
        await seedUser("user-1", "111111111111111111", "session-1", ["discord", "osu"]);
    });

    afterAll(async () => {
        await pool?.end();
    });

    it("deletes the Bot record and Better Auth user after verified confirmation", async () => {
        if (!pool || !store) throw new Error("Database test store is unavailable");
        const tokenHash = await hashChallengeToken(createChallengeToken());
        await store.startReauthentication({ userId: "user-1", tokenHash, now, alreadyFresh: true });
        await store.deleteAccount({ userId: "user-1", tokenHash, now: new Date(now.getTime() + 1_000) });

        expect(deletedBotAccounts).toEqual(["111111111111111111"]);
        const [users] = await pool.execute<RowDataPacket[]>("SELECT id FROM user WHERE id = ?", ["user-1"]);
        const [accounts] = await pool.execute<RowDataPacket[]>("SELECT id FROM account WHERE userId = ?", ["user-1"]);
        const [sessions] = await pool.execute<RowDataPacket[]>("SELECT id FROM session WHERE userId = ?", ["user-1"]);
        const [challenges] = await pool.execute<RowDataPacket[]>("SELECT id FROM accountDeletionReauthChallenge WHERE userId = ?", [
            "user-1",
        ]);
        expect(users).toHaveLength(0);
        expect(accounts).toHaveLength(0);
        expect(sessions).toHaveLength(0);
        expect(challenges).toHaveLength(0);
    });

    it("deletes a Discord-plus-osu! user while reporting queued Bot cleanup", async () => {
        if (!pool || !store) throw new Error("Database test store is unavailable");
        syncPending = true;
        const tokenHash = await hashChallengeToken(createChallengeToken());
        await store.startReauthentication({ userId: "user-1", tokenHash, now, alreadyFresh: true });
        const result = await store.deleteAccount({ userId: "user-1", tokenHash, now: new Date(now.getTime() + 1_000) });
        expect(result).toEqual({ syncPending: true });
        const [users] = await pool.execute<RowDataPacket[]>("SELECT id FROM user WHERE id = ?", ["user-1"]);
        expect(users).toHaveLength(0);
    });

    it("deletes an osu!-only user without requiring Bot cleanup", async () => {
        if (!pool || !store) throw new Error("Database test store is unavailable");
        await seedUser("user-osu", "24680", "session-osu", ["osu"]);
        const tokenHash = await hashChallengeToken(createChallengeToken());
        await store.startReauthentication({ userId: "user-osu", tokenHash, now, alreadyFresh: true });
        const result = await store.deleteAccount({ userId: "user-osu", tokenHash, now: new Date(now.getTime() + 1_000) });
        expect(result).toEqual({ syncPending: false });
        expect(deletedBotAccounts).toEqual([]);
    });
});

async function seedUser(userId: string, providerId: string, sessionId: string, providers: Array<"discord" | "osu">): Promise<void> {
    if (!pool) throw new Error("TEST_DATABASE_URL is required");
    await pool.execute(
        `INSERT INTO user
      (id, name, email, emailVerified, image, createdAt, updatedAt)
     VALUES (?, ?, ?, TRUE, NULL, ?, ?)`,
        [userId, userId, `${userId}@example.test`, now, now],
    );
    for (const provider of providers) {
        const subject = provider === "discord" ? providerId : providerId === "24680" ? providerId : "13579";
        await pool.execute(
            `INSERT INTO account
              (id, accountId, providerId, userId, createdAt, updatedAt)
             VALUES (?, ?, ?, ?, ?, ?)`,
            [`account-${userId}-${provider}`, subject, provider, userId, now, now],
        );
        await pool.execute(
            `INSERT INTO userIdentity
              (id, userId, provider, providerUserId, username, displayName, avatarUrl, metadata, linkedAt, updatedAt)
             VALUES (?, ?, ?, ?, ?, ?, NULL, NULL, ?, ?)`,
            [`identity-${userId}-${provider}`, userId, provider, subject, userId, userId, now, now],
        );
    }
    await pool.execute(
        `INSERT INTO session
      (id, userId, token, expiresAt, createdAt, updatedAt)
     VALUES (?, ?, ?, ?, ?, ?)`,
        [sessionId, userId, `token-${userId}`, new Date(now.getTime() + 86_400_000), now, now],
    );
}
