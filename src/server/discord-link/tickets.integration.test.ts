import { afterAll, beforeAll, beforeEach, describe, expect, it } from "bun:test";
import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import { PrismaClient } from "../../generated/prisma/web/client";
import mysql from "mysql2/promise";

import { parseMariaDbConnection, assertSeparateDatabases } from "../database/config";
import { runBetterAuthSchemaMigrations } from "../auth-schema";
import { runWebMigrations } from "../migrations";
import { createSecureToken, hashToken } from "../security/tokens";
import { PrismaDiscordLinkTicketStore } from "./tickets";

const testDatabaseUrl = process.env.TEST_DATABASE_URL;
const describeDatabase = testDatabaseUrl ? describe : describe.skip;
const pool = testDatabaseUrl ? mysql.createPool({ uri: testDatabaseUrl, timezone: "Z" }) : null;
const prisma = testDatabaseUrl ? new PrismaClient({ adapter: new PrismaMariaDb(parseMariaDbConnection(testDatabaseUrl, "web")) }) : null;
const store = prisma ? new PrismaDiscordLinkTicketStore(prisma) : null;
const now = new Date("2026-07-15T12:00:00.000Z");
const testDiscordUserIds = [
    "123456789012345678",
    "preserved-1",
    "preserved-2",
    "preserved-3",
    "preserved-4",
    "preserved-5",
    "preserved-6",
];

describeDatabase("Prisma Discord link tickets", () => {
    beforeAll(async () => {
        if (!pool || !prisma) throw new Error("TEST_DATABASE_URL is required");
        assertDisposableDatabase();
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

function assertDisposableDatabase(): void {
    if (!testDatabaseUrl) throw new Error("TEST_DATABASE_URL is required");
    if (process.env.WEB_DATABASE_URL) assertSeparateDatabases(process.env.WEB_DATABASE_URL, testDatabaseUrl);
    if (process.env.BOT_DATABASE_URL) assertSeparateDatabases(testDatabaseUrl, process.env.BOT_DATABASE_URL);
}
