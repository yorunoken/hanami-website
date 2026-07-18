import { afterAll, beforeAll, beforeEach, describe, expect, it } from "bun:test";
import mysql from "mysql2/promise";

import { runWebMigrations } from "../migrations";
import { createSecureToken, hashToken } from "../security/tokens";
import { prepareDisposableBetterAuthSchema, readDisposableDatabaseUrl } from "../testing/better-auth-schema";
import { MySqlDiscordLinkTicketStore } from "./tickets";

const testDatabaseUrl = readDisposableDatabaseUrl("TEST_DATABASE_URL", process.env.WEB_DATABASE_URL);
const describeDatabase = testDatabaseUrl ? describe : describe.skip;
const pool = testDatabaseUrl ? mysql.createPool({ uri: testDatabaseUrl, timezone: "Z" }) : null;
const store = pool ? new MySqlDiscordLinkTicketStore(pool) : null;
const now = new Date("2026-07-15T12:00:00.000Z");

describeDatabase("MySQL Discord link tickets", () => {
    beforeAll(async () => {
        if (!pool) throw new Error("TEST_DATABASE_URL is required");
        await prepareDisposableBetterAuthSchema(pool);
        await runWebMigrations(pool);
    });

    beforeEach(async () => {
        if (!pool) throw new Error("TEST_DATABASE_URL is required");
        await pool.execute("DELETE FROM discordLinkTicket");
    });

    afterAll(async () => {
        await pool?.end();
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
