import { afterAll, beforeAll, beforeEach, describe, expect, it } from "bun:test";
import mysql, { type RowDataPacket } from "mysql2/promise";

import { runWebMigrations } from "../migrations";
import { createChallengeToken, hashChallengeToken } from "./domain";
import { MySqlAccountDeletionStore } from "./store";

const testDatabaseUrl = process.env.TEST_DATABASE_URL;
const describeDatabase = testDatabaseUrl ? describe : describe.skip;
const pool = testDatabaseUrl ? mysql.createPool({ uri: testDatabaseUrl, timezone: "Z" }) : null;
const deletedBotAccounts: string[] = [];
const store = pool
    ? new MySqlAccountDeletionStore(pool, async (discordAccountId) => {
          deletedBotAccounts.push(discordAccountId);
      })
    : null;
const now = new Date("2026-07-14T18:00:00.000Z");

describeDatabase("MySQL immediate account deletion store", () => {
    beforeAll(async () => {
        if (!pool) throw new Error("TEST_DATABASE_URL is required");
        await runWebMigrations(pool);
    });

    beforeEach(async () => {
        if (!pool) throw new Error("TEST_DATABASE_URL is required");
        deletedBotAccounts.length = 0;
        await pool.execute("DELETE FROM accountDeletionReauthChallenge");
        await pool.execute("DELETE FROM session");
        await pool.execute("DELETE FROM account");
        await pool.execute("DELETE FROM user");
        await seedUser("user-1", "discord-1", "session-1");
    });

    afterAll(async () => {
        await pool?.end();
    });

    it("deletes the Bot record and Better Auth user after verified confirmation", async () => {
        if (!pool || !store) throw new Error("Database test store is unavailable");
        const tokenHash = await hashChallengeToken(createChallengeToken());
        await store.startReauthentication({ userId: "user-1", tokenHash, now, alreadyFresh: true });
        await store.deleteAccount({ userId: "user-1", tokenHash, now: new Date(now.getTime() + 1_000) });

        expect(deletedBotAccounts).toEqual(["discord-1"]);
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

    it("keeps the web account when linked-service deletion fails", async () => {
        if (!pool) throw new Error("Database test store is unavailable");
        const failingStore = new MySqlAccountDeletionStore(pool, async () => {
            throw new Error("Bot database unavailable");
        });
        const tokenHash = await hashChallengeToken(createChallengeToken());
        await failingStore.startReauthentication({ userId: "user-1", tokenHash, now, alreadyFresh: true });

        await expect(failingStore.deleteAccount({ userId: "user-1", tokenHash, now: new Date(now.getTime() + 1_000) })).rejects.toThrow(
            "Bot database unavailable",
        );
        const [users] = await pool.execute<RowDataPacket[]>("SELECT id FROM user WHERE id = ?", ["user-1"]);
        expect(users).toHaveLength(1);
    });
});

async function seedUser(userId: string, discordId: string, sessionId: string): Promise<void> {
    if (!pool) throw new Error("TEST_DATABASE_URL is required");
    await pool.execute(
        `INSERT INTO user
      (id, name, email, emailVerified, image, createdAt, updatedAt)
     VALUES (?, ?, ?, TRUE, NULL, ?, ?)`,
        [userId, userId, `${userId}@example.test`, now, now],
    );
    await pool.execute(
        `INSERT INTO account
      (id, accountId, providerId, userId, createdAt, updatedAt)
     VALUES (?, ?, 'discord', ?, ?, ?)`,
        [`account-${userId}`, discordId, userId, now, now],
    );
    await pool.execute(
        `INSERT INTO session
      (id, userId, token, expiresAt, createdAt, updatedAt)
     VALUES (?, ?, ?, ?, ?, ?)`,
        [sessionId, userId, `token-${userId}`, new Date(now.getTime() + 86_400_000), now, now],
    );
}
