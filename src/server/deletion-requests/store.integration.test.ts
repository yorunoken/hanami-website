import { afterAll, beforeAll, beforeEach, describe, expect, it } from "bun:test";
import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import { PrismaClient } from "../../generated/prisma/web/client";
import mysql from "mysql2/promise";

import { assertSeparateDatabases, parseMariaDbConnection } from "../database/config";
import { runBetterAuthSchemaMigrations } from "../auth-schema";
import { runWebMigrations } from "../migrations";
import { createChallengeToken, hashChallengeToken } from "./domain";
import { PrismaDeletionRequestStore } from "./store";

const testDatabaseUrl = process.env.TEST_DATABASE_URL;
const describeDatabase = testDatabaseUrl ? describe : describe.skip;
const pool = testDatabaseUrl ? mysql.createPool({ uri: testDatabaseUrl, timezone: "Z" }) : null;
const prisma = testDatabaseUrl ? new PrismaClient({ adapter: new PrismaMariaDb(parseMariaDbConnection(testDatabaseUrl, "web")) }) : null;
const deletedBotAccounts: string[] = [];
const store = pool
    ? new PrismaDeletionRequestStore(prisma!, async (discordAccountId) => {
          deletedBotAccounts.push(discordAccountId);
      })
    : null;
const now = new Date("2026-07-14T18:00:00.000Z");

describeDatabase("Prisma immediate account deletion store", () => {
    beforeAll(async () => {
        if (!pool || !prisma) throw new Error("TEST_DATABASE_URL is required");
        assertDisposableDatabase();
        const testAuth = (await import("better-auth")).betterAuth({
            database: pool,
            baseURL: "https://hanami-deletion-test.invalid",
            secret: "hanami-deletion-test-secret-at-least-thirty-two-characters",
        });
        await runBetterAuthSchemaMigrations(testAuth.options);
        await runWebMigrations(pool);
    });

    beforeEach(async () => {
        if (!prisma) throw new Error("TEST_DATABASE_URL is required");
        deletedBotAccounts.length = 0;
        await prisma.user.deleteMany({ where: { id: "user-1" } });
        await seedUser("user-1", "discord-1", "session-1");
    });

    afterAll(async () => {
        await pool?.end();
        await prisma?.$disconnect();
    });

    it("deletes the Bot record and Better Auth user after verified confirmation", async () => {
        if (!pool || !store) throw new Error("Database test store is unavailable");
        const tokenHash = await hashChallengeToken(createChallengeToken());
        await store.startReauthentication({ userId: "user-1", tokenHash, now, alreadyFresh: true });
        await store.deleteAccount({ userId: "user-1", tokenHash, now: new Date(now.getTime() + 1_000) });

        expect(deletedBotAccounts).toEqual(["discord-1"]);
        if (!prisma) throw new Error("Database test store is unavailable");
        expect(await prisma.user.findUnique({ where: { id: "user-1" } })).toBeNull();
        expect(await prisma.account.count({ where: { userId: "user-1" } })).toBe(0);
        expect(await prisma.session.count({ where: { userId: "user-1" } })).toBe(0);
        expect(await prisma.accountDeletionReauthChallenge.count({ where: { userId: "user-1" } })).toBe(0);
    });

    it("keeps the web account when linked-service deletion fails", async () => {
        if (!pool) throw new Error("Database test store is unavailable");
        if (!prisma) throw new Error("Database test store is unavailable");
        const failingStore = new PrismaDeletionRequestStore(prisma, async () => {
            throw new Error("Bot database unavailable");
        });
        const tokenHash = await hashChallengeToken(createChallengeToken());
        await failingStore.startReauthentication({ userId: "user-1", tokenHash, now, alreadyFresh: true });

        await expect(failingStore.deleteAccount({ userId: "user-1", tokenHash, now: new Date(now.getTime() + 1_000) })).rejects.toThrow(
            "Bot database unavailable",
        );
        expect(await prisma.user.findUnique({ where: { id: "user-1" } })).not.toBeNull();
    });
});

async function seedUser(userId: string, discordId: string, sessionId: string): Promise<void> {
    if (!prisma) throw new Error("TEST_DATABASE_URL is required");
    await prisma.user.create({
        data: {
            id: userId,
            name: userId,
            email: `${userId}@example.test`,
            emailVerified: true,
            createdAt: now,
            updatedAt: now,
            accounts: {
                create: {
                    id: `account-${userId}`,
                    accountId: discordId,
                    providerId: "discord",
                    createdAt: now,
                    updatedAt: now,
                },
            },
            sessions: {
                create: {
                    id: sessionId,
                    token: `token-${userId}`,
                    expiresAt: new Date(now.getTime() + 86_400_000),
                    createdAt: now,
                    updatedAt: now,
                },
            },
        },
    });
}

function assertDisposableDatabase(): void {
    if (!testDatabaseUrl) throw new Error("TEST_DATABASE_URL is required");
    if (process.env.WEB_DATABASE_URL) assertSeparateDatabases(process.env.WEB_DATABASE_URL, testDatabaseUrl);
    if (process.env.BOT_DATABASE_URL) assertSeparateDatabases(testDatabaseUrl, process.env.BOT_DATABASE_URL);
}
