import { afterAll, beforeEach, describe, expect, it } from "bun:test";
import mysql, { type RowDataPacket } from "mysql2/promise";

import { createChallengeToken, hashChallengeToken } from "./domain";
import { DeletionRequestStoreError, MySqlDeletionRequestStore } from "./store";

const testDatabaseUrl = process.env.TEST_DATABASE_URL;
const describeDatabase = testDatabaseUrl ? describe : describe.skip;
const pool = testDatabaseUrl ? mysql.createPool({ uri: testDatabaseUrl, timezone: "Z" }) : null;
const store = pool ? new MySqlDeletionRequestStore(pool) : null;
const now = new Date("2026-07-14T18:00:00.000Z");

describeDatabase("MySQL account deletion request store", () => {
    beforeEach(async () => {
        if (!pool) throw new Error("TEST_DATABASE_URL is required");
        await pool.execute("DELETE FROM accountDeletionRequest");
        await pool.execute("DELETE FROM accountDeletionReauthChallenge");
        await pool.execute("DELETE FROM session");
        await pool.execute("DELETE FROM account");
        await pool.execute("DELETE FROM user");
        await seedUser("user-1", "discord-1", "session-1");
    });

    afterAll(async () => {
        await pool?.end();
    });

    it("creates a durable request, consumes reauthentication, and revokes sessions", async () => {
        if (!pool || !store) throw new Error("Database test store is unavailable");
        const challenge = createChallengeToken();
        const tokenHash = await hashChallengeToken(challenge);
        await store.startReauthentication({
            userId: "user-1",
            tokenHash,
            now,
            alreadyFresh: true,
        });

        const request = await store.createRequest({
            userId: "user-1",
            tokenHash,
            now: new Date(now.getTime() + 1_000),
        });
        expect(request.status).toBe("pending");
        expect(request.requestReference).toMatch(/^HAN-[A-Za-z0-9_-]{20}$/);

        const [sessionRows] = await pool.execute<RowDataPacket[]>("SELECT id FROM session WHERE userId = ?", ["user-1"]);
        const [challengeRows] = await pool.execute<Array<RowDataPacket & { consumedAt: Date | null }>>(
            "SELECT consumedAt FROM accountDeletionReauthChallenge WHERE userId = ?",
            ["user-1"],
        );
        expect(sessionRows).toHaveLength(0);
        expect(challengeRows[0]?.consumedAt).toBeInstanceOf(Date);
    });

    it("rejects stale sessions and consumed challenge replay", async () => {
        if (!store) throw new Error("Database test store is unavailable");
        const staleChallenge = createChallengeToken();
        const staleHash = await hashChallengeToken(staleChallenge);
        await store.startReauthentication({
            userId: "user-1",
            tokenHash: staleHash,
            now,
            alreadyFresh: false,
        });
        await expect(
            store.completeReauthentication({
                userId: "user-1",
                tokenHash: staleHash,
                sessionCreatedAt: new Date(now.getTime() - 60_000),
                now: new Date(now.getTime() + 1_000),
            }),
        ).rejects.toMatchObject({ code: "challenge_stale" });

        await store.startReauthentication({
            userId: "user-1",
            tokenHash: staleHash,
            now,
            alreadyFresh: true,
        });
        await store.createRequest({
            userId: "user-1",
            tokenHash: staleHash,
            now: new Date(now.getTime() + 1_000),
        });
        await expect(
            store.createRequest({
                userId: "user-1",
                tokenHash: staleHash,
                now: new Date(now.getTime() + 2_000),
            }),
        ).rejects.toMatchObject({ code: "challenge_invalid" });
    });

    it("enforces one active request and user-scoped reads", async () => {
        if (!store) throw new Error("Database test store is unavailable");
        const firstHash = await hashChallengeToken(createChallengeToken());
        await store.startReauthentication({
            userId: "user-1",
            tokenHash: firstHash,
            now,
            alreadyFresh: true,
        });
        await store.createRequest({
            userId: "user-1",
            tokenHash: firstHash,
            now: new Date(now.getTime() + 1_000),
        });

        const secondHash = await hashChallengeToken(createChallengeToken());
        await store.startReauthentication({
            userId: "user-1",
            tokenHash: secondHash,
            now: new Date(now.getTime() + 2_000),
            alreadyFresh: true,
        });
        await expect(
            store.createRequest({
                userId: "user-1",
                tokenHash: secondHash,
                now: new Date(now.getTime() + 3_000),
            }),
        ).rejects.toBeInstanceOf(DeletionRequestStoreError);

        await seedUser("user-2", "discord-2", "session-2");
        const userOne = await store.getAccountSummary("user-1");
        const userTwo = await store.getAccountSummary("user-2");
        expect(userOne.discordAccountId).toBe("discord-1");
        expect(userOne.request?.status).toBe("pending");
        expect(userTwo.discordAccountId).toBe("discord-2");
        expect(userTwo.request).toBeNull();
    });

    it("cancels only before processing", async () => {
        if (!pool || !store) throw new Error("Database test store is unavailable");
        const tokenHash = await hashChallengeToken(createChallengeToken());
        await store.startReauthentication({
            userId: "user-1",
            tokenHash,
            now,
            alreadyFresh: true,
        });
        await store.createRequest({
            userId: "user-1",
            tokenHash,
            now: new Date(now.getTime() + 1_000),
        });
        const cancelled = await store.cancelRequest("user-1", new Date(now.getTime() + 2_000));
        expect(cancelled.status).toBe("cancelled");

        await pool.execute("UPDATE accountDeletionRequest SET status = 'processing', cancelledAt = NULL WHERE userId = ?", ["user-1"]);
        await expect(store.cancelRequest("user-1", new Date(now.getTime() + 3_000))).rejects.toMatchObject({ code: "not_cancellable" });
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
