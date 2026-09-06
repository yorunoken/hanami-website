import { afterAll, beforeAll, beforeEach, describe, expect, it } from "bun:test";
import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import { PrismaClient } from "../../generated/prisma/web/client";

import { assertDisposableTestDatabase, parseMariaDbConnection } from "../database/config";
import { createChallengeToken, hashChallengeToken } from "./domain";
import { PrismaDeletionRequestStore } from "./store";

const testDatabaseUrl = process.env.TEST_DATABASE_URL;
const describeDatabase = testDatabaseUrl ? describe : describe.skip;
const prisma = testDatabaseUrl ? new PrismaClient({ adapter: new PrismaMariaDb(parseMariaDbConnection(testDatabaseUrl, "web")) }) : null;
const deletedBotAccounts: string[] = [];
const store = prisma
    ? new PrismaDeletionRequestStore(prisma!, async (discordAccountId) => {
          deletedBotAccounts.push(discordAccountId);
      })
    : null;
const now = new Date("2026-07-14T18:00:00.000Z");
let disposableDatabaseVerified = false;

describeDatabase("Prisma immediate account deletion store", () => {
    beforeAll(async () => {
        if (!prisma) throw new Error("TEST_DATABASE_URL is required");
        assertDisposableTestDatabase(testDatabaseUrl, {
            webUrl: process.env.WEB_DATABASE_URL,
            botUrl: process.env.BOT_DATABASE_URL,
        });
        disposableDatabaseVerified = true;
        await deployTestMigrations(testDatabaseUrl!);
    });

    beforeEach(async () => {
        if (!prisma) throw new Error("TEST_DATABASE_URL is required");
        deletedBotAccounts.length = 0;
        await prisma.user.deleteMany({ where: { id: "user-1" } });
        await seedUser("user-1", "discord-1", "session-1");
    });

    afterAll(async () => {
        if (disposableDatabaseVerified && prisma) await prisma.user.deleteMany({ where: { id: "user-1" } });
        await prisma?.$disconnect();
    });

    it("deletes the Bot record and Better Auth user after verified confirmation", async () => {
        if (!store) throw new Error("Database test store is unavailable");
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

async function deployTestMigrations(databaseUrl: string): Promise<void> {
    const child = Bun.spawn([process.execPath, "src/scripts/migrate.ts"], {
        env: { ...process.env, WEB_DATABASE_URL: databaseUrl, BOT_DATABASE_URL: "" },
        stdout: "pipe",
        stderr: "pipe",
    });
    const [code, error] = await Promise.all([child.exited, new Response(child.stderr).text()]);
    if (code !== 0) throw new Error(error);
}

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
