import { afterAll, beforeAll, describe, expect, it } from "bun:test";
import mysql, { type RowDataPacket } from "mysql2/promise";

import { assertDisposableTestDatabase } from "./database/config";
import { expectedCurrentWebTables } from "../scripts/migration-state";

const databaseUrl = process.env.TEST_EMPTY_DATABASE_URL;
const describeDatabase = databaseUrl ? describe : describe.skip;
const pool = databaseUrl ? mysql.createPool({ uri: databaseUrl, timezone: "Z" }) : null;

describeDatabase("empty database migration bootstrap", () => {
    beforeAll(async () => {
        if (!pool) throw new Error("TEST_EMPTY_DATABASE_URL is required");
        assertDisposableTestDatabase(databaseUrl);
        const [rows] = await pool.query<RowDataPacket[]>(
            "SELECT COUNT(*) AS count FROM information_schema.tables WHERE table_schema = DATABASE()",
        );
        if (Number(rows[0]?.count) !== 0) throw new Error("TEST_EMPTY_DATABASE_URL must point to an empty disposable database");
    });

    afterAll(async () => {
        await pool?.end();
    });

    it("applies the Prisma Web baseline and reruns safely", async () => {
        if (!pool) throw new Error("TEST_EMPTY_DATABASE_URL is required");
        for (let run = 0; run < 2; run += 1) {
            const child = Bun.spawn([process.execPath, "src/scripts/migrate.ts"], {
                env: { ...process.env, WEB_DATABASE_URL: databaseUrl },
                stdin: "ignore",
                stdout: "pipe",
                stderr: "pipe",
            });
            const [exitCode, output] = await Promise.all([
                child.exited,
                Promise.all([
                    child.stdout ? new Response(child.stdout).text() : Promise.resolve(""),
                    child.stderr ? new Response(child.stderr).text() : Promise.resolve(""),
                ]),
            ]);
            expect(exitCode).toBe(0);
            expect(`${output[0]}${output[1]}`).not.toContain("password");
        }

        const [tableRows] = await pool.query<RowDataPacket[]>(
            "SELECT TABLE_NAME, TABLE_COLLATION FROM information_schema.tables WHERE table_schema = DATABASE() ORDER BY TABLE_NAME",
        );
        expect(new Set(tableRows.map((row) => row.TABLE_NAME))).toEqual(new Set(["_prisma_migrations", ...expectedCurrentWebTables]));

        const [databaseRows] = await pool.query<RowDataPacket[]>(
            "SELECT DEFAULT_CHARACTER_SET_NAME, DEFAULT_COLLATION_NAME FROM information_schema.schemata WHERE schema_name = DATABASE()",
        );
        expect(databaseRows[0]?.DEFAULT_CHARACTER_SET_NAME).toBe("utf8mb4");
        expect(new Set(tableRows.filter((row) => row.TABLE_NAME !== "_prisma_migrations").map((row) => row.TABLE_COLLATION))).toEqual(
            new Set([databaseRows[0]?.DEFAULT_COLLATION_NAME]),
        );

        const [migrationRows] = await pool.query<RowDataPacket[]>(
            "SELECT migration_name, finished_at, rolled_back_at FROM _prisma_migrations",
        );
        expect(migrationRows).toHaveLength(2);
        expect(migrationRows.map((row) => row.migration_name).sort()).toEqual(["0_init", "1_central_identity"]);
        expect(migrationRows.every((row) => row.finished_at !== null)).toBe(true);
        expect(migrationRows.every((row) => row.rolled_back_at === null)).toBe(true);
    });
});
