import { afterAll, beforeAll, beforeEach, describe, expect, it } from "bun:test";
import mysql, { type RowDataPacket } from "mysql2/promise";

import { runWebMigrations } from "../migrations";
import { prepareDisposableBetterAuthSchema, readDisposableDatabaseUrl } from "../testing/better-auth-schema";
import { TemporaryBotIdentityCompatibility } from "./bot-compatibility";
import { UserIdentityRepository } from "./repository";

const webUrl = readDisposableDatabaseUrl("TEST_DATABASE_URL", process.env.WEB_DATABASE_URL);
const botUrl = readDisposableDatabaseUrl("TEST_BOT_DATABASE_URL", process.env.BOT_DATABASE_URL);
const enabled = Boolean(webUrl && botUrl && webUrl !== botUrl);
const describeDatabase = enabled ? describe : describe.skip;
const webPool = webUrl ? mysql.createPool({ uri: webUrl, timezone: "Z" }) : null;
const botPool = botUrl ? mysql.createPool({ uri: botUrl, timezone: "Z" }) : null;
const compatibility = webPool && botUrl ? new TemporaryBotIdentityCompatibility(webPool, () => botUrl) : null;
const repository = webPool && compatibility ? new UserIdentityRepository(webPool, compatibility) : null;
const now = new Date("2026-07-18T12:00:00.000Z");

describeDatabase("temporary Bot identity compatibility", () => {
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
        await seedUser("user-1");
    });

    afterAll(async () => {
        await webPool?.end();
        await botPool?.end();
    });

    it("mirrors the canonical osu! subject under the linked Discord subject", async () => {
        if (!repository || !compatibility || !botPool) throw new Error("Compatibility test is unavailable");
        await repository.linkIdentity("user-1", { provider: "discord", providerUserId: "123456789012345678" });
        await repository.linkIdentity("user-1", { provider: "osu", providerUserId: "24680" });
        expect(await compatibility.flushPendingForUser("user-1")).toEqual({ pending: false });

        const [rows] = await botPool.execute<Array<RowDataPacket & { id: string; banchoId: string }>>("SELECT id, banchoId FROM users");
        expect(rows).toEqual([expect.objectContaining({ id: "123456789012345678", banchoId: "24680" })]);
    });

    it("does not create a Bot row for an osu!-only canonical user", async () => {
        if (!repository || !compatibility || !botPool) throw new Error("Compatibility test is unavailable");
        await repository.linkIdentity("user-1", { provider: "osu", providerUserId: "24680" });
        expect(await compatibility.flushPendingForUser("user-1")).toEqual({ pending: false });
        const [rows] = await botPool.execute<RowDataPacket[]>("SELECT id FROM users");
        expect(rows).toHaveLength(0);
    });

    it("clears Bot banchoId only while it still points to the unlinked osu! subject", async () => {
        if (!repository || !compatibility || !botPool) throw new Error("Compatibility test is unavailable");
        await repository.linkIdentity("user-1", { provider: "discord", providerUserId: "123456789012345678" });
        await repository.linkIdentity("user-1", { provider: "osu", providerUserId: "24680" });
        await compatibility.flushPendingForUser("user-1");
        await botPool.execute("UPDATE users SET banchoId = '99999' WHERE id = '123456789012345678'");

        await repository.unlinkIdentity("user-1", "osu");
        await compatibility.flushPendingForUser("user-1");
        const [rows] = await botPool.execute<Array<RowDataPacket & { banchoId: string }>>(
            "SELECT banchoId FROM users WHERE id = '123456789012345678'",
        );
        expect(rows[0]?.banchoId).toBe("99999");
    });
});

async function seedUser(userId: string): Promise<void> {
    if (!webPool) throw new Error("Disposable Web test database is unavailable");
    await webPool.execute(
        `INSERT INTO user
            (id, name, email, emailVerified, image, createdAt, updatedAt)
         VALUES (?, 'Yoru', ?, FALSE, NULL, ?, ?)`,
        [userId, `${userId}@example.test`, now, now],
    );
}
