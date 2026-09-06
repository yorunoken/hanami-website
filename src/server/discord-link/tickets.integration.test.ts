import { afterAll, beforeAll, beforeEach, describe, expect, it } from "bun:test";
import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import { PrismaClient } from "../../generated/prisma/web/client";
import mysql, { type RowDataPacket } from "mysql2/promise";

import { assertDisposableTestDatabase, parseMariaDbConnection } from "../database/config";
import { runBetterAuthSchemaMigrations } from "../auth-schema";
import { runWebMigrations } from "../migrations";
import { createSecureToken, hashToken } from "../security/tokens";
import { PrismaDiscordLinkTicketStore, type DiscordLinkTicket } from "./tickets";

const testDatabaseUrl = process.env.TEST_DATABASE_URL;
const describeDatabase = testDatabaseUrl ? describe : describe.skip;
const pool = testDatabaseUrl ? mysql.createPool({ uri: testDatabaseUrl, timezone: "Z" }) : null;
const prisma = testDatabaseUrl ? new PrismaClient({ adapter: new PrismaMariaDb(parseMariaDbConnection(testDatabaseUrl, "web")) }) : null;
const store = prisma ? new PrismaDiscordLinkTicketStore(prisma) : null;
const now = new Date("2026-07-15T12:00:00.000Z");
const testDiscordUserIds = ["123456789012345678", "preserved-1", "preserved-2", "preserved-3", "preserved-4", "preserved-5", "preserved-6"];

describeDatabase("Prisma Discord link tickets", () => {
    beforeAll(async () => {
        if (!pool || !prisma) throw new Error("TEST_DATABASE_URL is required");
        assertDisposableTestDatabase(testDatabaseUrl, {
            webUrl: process.env.WEB_DATABASE_URL,
            botUrl: process.env.BOT_DATABASE_URL,
        });
        const testAuth = (await import("better-auth")).betterAuth({
            database: pool,
            baseURL: "https://hanami-ticket-test.invalid",
            secret: "hanami-ticket-test-secret-at-least-thirty-two-characters",
        });
        await runBetterAuthSchemaMigrations(testAuth.options);
        await runWebMigrations(pool);
    });

    beforeEach(async () => {
        if (!prisma) throw new Error("TEST_DATABASE_URL is required");
        await prisma.discordLinkTicket.deleteMany({ where: { discordUserId: { in: testDiscordUserIds } } });
    });

    afterAll(async () => {
        if (prisma) await prisma.discordLinkTicket.deleteMany({ where: { discordUserId: { in: testDiscordUserIds } } });
        await pool?.end();
        await prisma?.$disconnect();
    });

    it("rejects expired and already-consumed tickets", async () => {
        if (!store) throw new Error("Ticket store is unavailable");
        const expiredToken = createSecureToken();
        await issue(expiredToken, new Date(now.getTime() - 6 * 60_000));
        expect(await store.consume(await hashToken(expiredToken), now)).toBeNull();

        const usedToken = createSecureToken();
        await issue(usedToken, now);
        expect(await store.consume(await hashToken(usedToken), new Date(now.getTime() + 1_000))).not.toBeNull();
        expect(await store.consume(await hashToken(usedToken), new Date(now.getTime() + 2_000))).toBeNull();
    });

    it("allows only one concurrent consumer to succeed", async () => {
        if (!store) throw new Error("Ticket store is unavailable");
        const token = createSecureToken();
        await issue(token, now);
        const tokenHash = await hashToken(token);

        const results = await Promise.all(
            Array.from({ length: 8 }, (_, index) => store.consume(tokenHash, new Date(now.getTime() + index + 1))),
        );
        expect(results.filter(Boolean)).toHaveLength(1);
    });

    it("serializes concurrent issuance so only the newest ticket remains valid", async () => {
        if (!pool || !prisma || !store) throw new Error("Ticket store is unavailable");
        const olderToken = createSecureToken();
        const newerToken = createSecureToken();
        const olderNow = new Date(now.getTime() + 3_000);
        const newerNow = new Date(now.getTime() + 4_000);
        const lockName = "hanami-discord-link-ticket:123456789012345678";
        const lockConnection = await pool.getConnection();
        let concurrentIssues: Promise<[DiscordLinkTicket, DiscordLinkTicket]> | undefined;

        try {
            const [lockRows] = await lockConnection.execute<RowDataPacket[]>("SELECT GET_LOCK(?, 0) AS acquired", [lockName]);
            expect(Number(lockRows[0]?.acquired)).toBe(1);

            concurrentIssues = Promise.all([issue(olderToken, olderNow), issue(newerToken, newerNow)]);
            const state = await Promise.race([
                concurrentIssues.then(() => "completed" as const),
                new Promise<"waiting">((resolve) => setTimeout(() => resolve("waiting"), 100)),
            ]);
            expect(state).toBe("waiting");
        } finally {
            await lockConnection.execute("SELECT RELEASE_LOCK(?)", [lockName]).catch(() => undefined);
            lockConnection.release();
            await concurrentIssues?.catch(() => undefined);
        }

        if (!concurrentIssues) throw new Error("Concurrent issuance did not start");
        const [olderTicket, newerTicket] = await concurrentIssues;
        const activeTickets = await prisma.discordLinkTicket.findMany({
            where: { discordUserId: "123456789012345678", consumedAt: null, invalidatedAt: null },
            select: { id: true },
        });

        expect(activeTickets).toHaveLength(1);
        expect(activeTickets[0]?.id).toBe(newerTicket.id);
        expect(await store.consume(await hashToken(newerToken), new Date(now.getTime() + 5_000))).not.toBeNull();
        expect(await store.consume(await hashToken(olderToken), new Date(now.getTime() + 5_000))).toBeNull();
        expect(olderTicket.id).not.toBe(newerTicket.id);
    });

    it("invalidates an older unused ticket for the same Discord user", async () => {
        if (!store) throw new Error("Ticket store is unavailable");
        const oldToken = createSecureToken();
        const newToken = createSecureToken();
        await issue(oldToken, now);
        await issue(newToken, new Date(now.getTime() + 1_000));

        expect(await store.consume(await hashToken(oldToken), new Date(now.getTime() + 2_000))).toBeNull();
        expect(await store.consume(await hashToken(newToken), new Date(now.getTime() + 2_000))).not.toBeNull();
    });

    it("preserves six pre-existing ticket rows when issuing a new ticket", async () => {
        if (!prisma || !store) throw new Error("Ticket store is unavailable");
        await prisma.discordLinkTicket.createMany({
            data: testDiscordUserIds.slice(1).map((discordUserId, index) => ({
                id: `preserved-ticket-${index + 1}`,
                tokenHash: `preserved-token-${index + 1}`.padEnd(64, "0"),
                discordUserId,
                username: `preserved-${index + 1}`,
                displayName: `Preserved ${index + 1}`,
                avatarUrl: "https://example.test/avatar.png",
                createdAt: now,
                expiresAt: new Date(now.getTime() + 60_000),
            })),
        });

        await issue(createSecureToken(), now);

        expect(
            await prisma.discordLinkTicket.count({
                where: {
                    id: {
                        in: [
                            "preserved-ticket-1",
                            "preserved-ticket-2",
                            "preserved-ticket-3",
                            "preserved-ticket-4",
                            "preserved-ticket-5",
                            "preserved-ticket-6",
                        ],
                    },
                },
            }),
        ).toBe(6);
    });
});

async function issue(token: string, createdAt: Date) {
    if (!store) throw new Error("Ticket store is unavailable");
    return store.issue({
        discordUserId: "123456789012345678",
        username: "yoru",
        displayName: "Yoru",
        avatarUrl: "https://cdn.discordapp.com/avatars/123456789012345678/avatar.png",
        tokenHash: await hashToken(token),
        now: createdAt,
    });
}
