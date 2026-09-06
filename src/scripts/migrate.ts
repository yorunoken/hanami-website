import { webPrisma } from "../server/database/web";
import { formatMigrationError, PrismaMigrationCommandError } from "./migration-errors";
import { classifyWebDatabaseTables, type PrismaMigrationRecord } from "./migration-state";

const webSchemaPath = "prisma/web/schema.prisma";

interface TableMetadataRow {
    tableName: string;
}

interface LegacyMigrationRow {
    id: string;
}

interface PrismaMigrationRow {
    migrationName: string;
    finishedAt: Date | null;
    rolledBackAt: Date | null;
}

async function readWebDatabaseMetadata(): Promise<{
    tableNames: string[];
    legacyMigrationIds?: string[];
    prismaMigrations?: PrismaMigrationRecord[];
}> {
    const rows = await webPrisma.$queryRaw<TableMetadataRow[]>`
        SELECT TABLE_NAME AS tableName
          FROM information_schema.tables
         WHERE TABLE_SCHEMA = DATABASE()
           AND TABLE_TYPE = 'BASE TABLE'
         ORDER BY TABLE_NAME
    `;
    const tableNames = rows.map((row) => row.tableName);
    const tableSet = new Set(tableNames);
    const metadata: {
        tableNames: string[];
        legacyMigrationIds?: string[];
        prismaMigrations?: PrismaMigrationRecord[];
    } = { tableNames };

    if (tableSet.has("webSchemaMigration")) {
        const legacyRows = await webPrisma.$queryRaw<LegacyMigrationRow[]>`
            SELECT id
              FROM webSchemaMigration
             ORDER BY id
        `;
        metadata.legacyMigrationIds = legacyRows.map((row) => row.id);
    }

    if (tableSet.has("_prisma_migrations")) {
        const migrationRows = await webPrisma.$queryRaw<PrismaMigrationRow[]>`
            SELECT migration_name AS migrationName, finished_at AS finishedAt, rolled_back_at AS rolledBackAt
              FROM _prisma_migrations
             ORDER BY started_at, migration_name
        `;
        metadata.prismaMigrations = migrationRows.map((row) => ({
            migrationName: row.migrationName,
            finished: row.finishedAt !== null,
            rolledBack: row.rolledBackAt !== null,
        }));
    }

    return metadata;
}

async function runPrismaMigrationCommand(command: "deploy" | "resolve", ...args: string[]): Promise<void> {
    const child = Bun.spawn([process.execPath, "x", "prisma", "migrate", command, ...args], {
        stdin: "ignore",
        stdout: "pipe",
        stderr: "pipe",
    });
    const output = Promise.all([
        child.stdout ? new Response(child.stdout).text() : Promise.resolve(""),
        child.stderr ? new Response(child.stderr).text() : Promise.resolve(""),
    ]);
    const [exitCode, [stdout, stderr]] = await Promise.all([child.exited, output]);
    if (exitCode !== 0) throw new PrismaMigrationCommandError(exitCode, `${stdout}\n${stderr}`);
}

export async function runWebPrismaMigrations(): Promise<void> {
    const state = classifyWebDatabaseTables(await readWebDatabaseMetadata());
    if (state === "unexpected") {
        throw new Error("Refusing Web migration because the database has a partial or unexpected table set");
    }

    if (state === "legacy") {
        await runPrismaMigrationCommand("resolve", "--applied", "0_init", "--schema", webSchemaPath);
    }

    await runPrismaMigrationCommand("deploy", "--schema", webSchemaPath);
}

if (import.meta.url === `file://${process.argv[1]}`) {
    try {
        await runWebPrismaMigrations();
    } catch (error) {
        console.error(formatMigrationError(error));
        process.exitCode = 1;
    } finally {
        await webPrisma.$disconnect();
    }
}
