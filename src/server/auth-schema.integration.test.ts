import { afterAll, beforeEach, describe, expect, it } from "bun:test";
import { betterAuth } from "better-auth";
import mysql, { type RowDataPacket } from "mysql2/promise";

import { runBetterAuthSchemaMigrations } from "./auth-schema";
import { runWebMigrations } from "./migrations";
import { readDisposableDatabaseUrl } from "./testing/better-auth-schema";

const databaseUrl = readDisposableDatabaseUrl("TEST_EMPTY_DATABASE_URL", process.env.WEB_DATABASE_URL);
const describeDatabase = databaseUrl ? describe : describe.skip;
const pool = databaseUrl ? mysql.createPool({ uri: databaseUrl, timezone: "Z" }) : null;

describeDatabase("empty database migration bootstrap", () => {
    beforeEach(async () => {
        if (!pool) throw new Error("A disposable TEST_EMPTY_DATABASE_URL is required");
        await resetDisposableSchema();
    });

    afterAll(async () => {
        await pool?.end();
    });

    it("creates Better Auth tables before Hanami foreign keys and reruns safely", async () => {
        if (!pool) throw new Error("A disposable TEST_EMPTY_DATABASE_URL is required");
        const testAuth = betterAuth({
            database: pool,
            baseURL: "https://hanami-empty-database.test",
            secret: "empty-database-test-secret-at-least-thirty-two-characters",
        });
        const options = {
            prepareAuthenticationSchema: () => runBetterAuthSchemaMigrations(testAuth.options),
        };

        await runWebMigrations(pool, options);
        await runWebMigrations(pool, options);

        const [tableRows] = await pool.query<RowDataPacket[]>(
            `SELECT TABLE_NAME
               FROM information_schema.tables
              WHERE table_schema = DATABASE()
                AND TABLE_NAME IN ('user', 'session', 'account', 'verification', 'userIdentity', 'botIdentitySync')
              ORDER BY TABLE_NAME`,
        );
        expect(tableRows.map((row) => row.TABLE_NAME)).toEqual(["account", "session", "user", "verification"]);
    });

    it("fails with an actionable message when an empty database bypasses authentication bootstrap", async () => {
        if (!pool) throw new Error("A disposable TEST_EMPTY_DATABASE_URL is required");
        await expect(runWebMigrations(pool)).rejects.toThrow("Better Auth database tables are missing");
    });
});

async function resetDisposableSchema(): Promise<void> {
    if (!pool) return;
    const connection = await pool.getConnection();
    try {
        const [rows] = await connection.query<RowDataPacket[]>(
            "SELECT TABLE_NAME FROM information_schema.tables WHERE table_schema = DATABASE()",
        );
        await connection.query("SET FOREIGN_KEY_CHECKS = 0");
        for (const row of rows) {
            const tableName = String(row.TABLE_NAME);
            if (!/^[A-Za-z0-9_]+$/.test(tableName)) throw new Error("Disposable database contains an unsafe table name");
            await connection.query(`DROP TABLE \`${tableName}\``);
        }
    } finally {
        await connection.query("SET FOREIGN_KEY_CHECKS = 1");
        connection.release();
    }
}
