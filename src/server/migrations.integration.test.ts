import { afterAll, beforeAll, describe, expect, it } from "bun:test";
import { betterAuth } from "better-auth";
import mysql, { type RowDataPacket } from "mysql2/promise";

import { runBetterAuthSchemaMigrations } from "./auth-schema";
import { runWebMigrations } from "./migrations";

const databaseUrl = process.env.TEST_EMPTY_DATABASE_URL;
const describeDatabase = databaseUrl ? describe : describe.skip;
const pool = databaseUrl ? mysql.createPool({ uri: databaseUrl, timezone: "Z" }) : null;

describeDatabase("empty database migration bootstrap", () => {
    beforeAll(async () => {
        if (!pool) throw new Error("TEST_EMPTY_DATABASE_URL is required");
        const [rows] = await pool.query<RowDataPacket[]>(
            "SELECT COUNT(*) AS count FROM information_schema.tables WHERE table_schema = DATABASE()",
        );
        if (Number(rows[0]?.count) !== 0) throw new Error("TEST_EMPTY_DATABASE_URL must point to an empty disposable database");
    });

    afterAll(async () => {
        await pool?.end();
    });

    it("creates Better Auth tables before Hanami foreign keys and reruns safely", async () => {
        if (!pool) throw new Error("TEST_EMPTY_DATABASE_URL is required");
        const testAuth = betterAuth({
            database: pool,
            baseURL: "https://hanami-migration.test",
            secret: "hanami-migration-test-secret-at-least-thirty-two-characters",
        });
        const options = {
            prepareAuthenticationSchema: () => runBetterAuthSchemaMigrations(testAuth.options),
        };

        await runWebMigrations(pool, options);
        await runWebMigrations(pool, options);

        const [tableRows] = await pool.query<RowDataPacket[]>(
            "SELECT TABLE_NAME, TABLE_COLLATION FROM information_schema.tables WHERE table_schema = DATABASE() ORDER BY TABLE_NAME",
        );
        expect(tableRows.map((row) => row.TABLE_NAME)).toEqual([
            "account",
            "accountDeletionReauthChallenge",
            "companionAccessToken",
            "companionAuthorizationCode",
            "companionAuthorizationRequest",
            "companionDevice",
            "companionRefreshToken",
            "companionTokenFamily",
            "discordLinkTicket",
            "osuOAuthState",
            "session",
            "user",
            "verification",
            "webSchemaMigration",
        ]);

        const [databaseRows] = await pool.query<RowDataPacket[]>(
            "SELECT DEFAULT_CHARACTER_SET_NAME, DEFAULT_COLLATION_NAME FROM information_schema.schemata WHERE schema_name = DATABASE()",
        );
        expect(databaseRows[0]?.DEFAULT_CHARACTER_SET_NAME).toBe("utf8mb4");
        expect(new Set(tableRows.map((row) => row.TABLE_COLLATION))).toEqual(new Set([databaseRows[0]?.DEFAULT_COLLATION_NAME]));

        const [migrationRows] = await pool.query<RowDataPacket[]>("SELECT id FROM webSchemaMigration ORDER BY id");
        expect(migrationRows.map((row) => row.id)).toEqual([
            "20260715_account_deletion_reauthentication",
            "20260715_discord_magic_link_and_osu_state",
            "20260716_companion_oauth",
        ]);
    });
});
