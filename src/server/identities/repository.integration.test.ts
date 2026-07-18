import { afterAll, beforeAll, beforeEach, describe, expect, it } from "bun:test";
import mysql from "mysql2/promise";

import { runWebMigrations } from "../migrations";
import { prepareDisposableBetterAuthSchema, readDisposableDatabaseUrl } from "../testing/better-auth-schema";
import { UserIdentityRepository } from "./repository";

const testDatabaseUrl = readDisposableDatabaseUrl("TEST_DATABASE_URL", process.env.WEB_DATABASE_URL);
const describeDatabase = testDatabaseUrl ? describe : describe.skip;
const pool = testDatabaseUrl ? mysql.createPool({ uri: testDatabaseUrl, timezone: "Z" }) : null;
const repository = pool ? new UserIdentityRepository(pool) : null;
const now = new Date("2026-07-18T12:00:00.000Z");

describeDatabase("MySQL canonical identity repository", () => {
    beforeAll(async () => {
        if (!pool) throw new Error("A disposable TEST_DATABASE_URL is required");
        await prepareDisposableBetterAuthSchema(pool);
        await runWebMigrations(pool, { skipIdentityBackfill: true });
    });

    beforeEach(async () => {
        if (!pool) throw new Error("A disposable TEST_DATABASE_URL is required");
        await pool.execute("DELETE FROM botIdentitySync");
        await pool.execute("DELETE FROM session");
        await pool.execute("DELETE FROM account");
        await pool.execute("DELETE FROM user");
        await seedUser("user-1", "same-name@example.test");
        await seedUser("user-2", "same-name@example.test");
    });

    afterAll(async () => {
        await pool?.end();
    });

    it("links Discord and osu! to one canonical user and resolves future-facing lookups", async () => {
        if (!repository) throw new Error("Identity repository is unavailable");
        const discord = await repository.linkIdentity("user-1", {
            provider: "discord",
            providerUserId: "123456789012345678",
            username: "same-name",
            displayName: "Same Name",
            avatarUrl: "https://example.test/discord.png",
        });
        const osu = await repository.linkIdentity("user-1", {
            provider: "osu",
            providerUserId: "24680",
            username: "same-name",
            displayName: "Same Name",
            avatarUrl: "https://a.ppy.sh/24680",
        });

        expect((await repository.getUserByCanonicalId("user-1"))?.id).toBe("user-1");
        expect(await repository.getIdentity("discord", discord.providerUserId)).toMatchObject({ userId: "user-1" });
        expect(await repository.getUserIdentities("user-1")).toHaveLength(2);
        expect(await repository.getPrimaryOsuIdentity("user-1")).toMatchObject({ id: osu.id, providerUserId: "24680" });
    });

    it("makes a repeated link idempotent while refreshing profile snapshots", async () => {
        if (!repository) throw new Error("Identity repository is unavailable");
        const first = await repository.linkIdentity("user-1", {
            provider: "osu",
            providerUserId: "24680",
            username: "old-name",
        });
        const second = await repository.linkIdentity(
            "user-1",
            {
                provider: "osu",
                providerUserId: "24680",
                username: "new-name",
            },
            new Date(now.getTime() + 1_000),
        );

        expect(second.id).toBe(first.id);
        expect(second.linkedAt).toEqual(first.linkedAt);
        expect((await repository.getUserIdentities("user-1"))[0]?.username).toBe("new-name");
    });

    it("rejects a provider subject owned by another canonical user", async () => {
        if (!repository) throw new Error("Identity repository is unavailable");
        await repository.linkIdentity("user-1", { provider: "osu", providerUserId: "24680" });
        await expect(repository.linkIdentity("user-2", { provider: "osu", providerUserId: "24680" })).rejects.toEqual(
            expect.objectContaining({ reason: "provider_owned" }),
        );
    });

    it("rejects a second identity from the same provider for one user", async () => {
        if (!repository) throw new Error("Identity repository is unavailable");
        await repository.linkIdentity("user-1", { provider: "discord", providerUserId: "123456789012345678" });
        await expect(repository.linkIdentity("user-1", { provider: "discord", providerUserId: "222222222222222222" })).rejects.toEqual(
            expect.objectContaining({ reason: "provider_slot_occupied" }),
        );
    });

    it("enforces one Better Auth provider account per canonical user at the database boundary", async () => {
        if (!pool) throw new Error("Identity repository is unavailable");
        await pool.execute(
            `INSERT INTO account (id, accountId, providerId, userId, createdAt, updatedAt)
             VALUES ('account-1', '123456789012345678', 'discord', 'user-1', ?, ?)`,
            [now, now],
        );
        await expect(
            pool.execute(
                `INSERT INTO account (id, accountId, providerId, userId, createdAt, updatedAt)
                 VALUES ('account-2', '222222222222222222', 'discord', 'user-1', ?, ?)`,
                [now, now],
            ),
        ).rejects.toEqual(expect.objectContaining({ code: "ER_DUP_ENTRY" }));
    });

    it("never merges users because their names or emails match", async () => {
        if (!repository) throw new Error("Identity repository is unavailable");
        await repository.linkIdentity("user-1", {
            provider: "discord",
            providerUserId: "123456789012345678",
            username: "same-name",
        });
        await repository.linkIdentity("user-2", {
            provider: "osu",
            providerUserId: "24680",
            username: "same-name",
        });

        expect(await repository.getUserIdentities("user-1")).toHaveLength(1);
        expect(await repository.getUserIdentities("user-2")).toHaveLength(1);
    });

    it("unlinks only the selected provider identity", async () => {
        if (!repository) throw new Error("Identity repository is unavailable");
        await repository.linkIdentity("user-1", { provider: "discord", providerUserId: "123456789012345678" });
        await repository.linkIdentity("user-1", { provider: "osu", providerUserId: "24680" });

        expect(await repository.unlinkIdentity("user-1", "osu")).toMatchObject({ providerUserId: "24680" });
        expect(await repository.getUserIdentities("user-1")).toEqual([
            expect.objectContaining({ provider: "discord", providerUserId: "123456789012345678" }),
        ]);
    });
});

async function seedUser(userId: string, email: string): Promise<void> {
    if (!pool) throw new Error("Identity repository is unavailable");
    await pool.execute(
        `INSERT INTO user
            (id, name, email, emailVerified, image, createdAt, updatedAt)
         VALUES (?, 'Same Name', ?, FALSE, NULL, ?, ?)`,
        [userId, `${userId}-${email}`, now, now],
    );
}
