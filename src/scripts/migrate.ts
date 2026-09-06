import { webPrisma } from "../server/database/web";
import { classifyWebDatabaseTables } from "./migration-state";

const webSchemaPath = "prisma/web/schema.prisma";

interface TableMetadataRow {
    tableName: string;
}

async function readWebTableNames(): Promise<string[]> {
    const rows = await webPrisma.$queryRaw<TableMetadataRow[]>`
        SELECT TABLE_NAME AS tableName
          FROM information_schema.tables
         WHERE TABLE_SCHEMA = DATABASE()
           AND TABLE_TYPE = 'BASE TABLE'
         ORDER BY TABLE_NAME
    `;
    return rows.map((row) => row.tableName);
}

async function runPrismaMigrationCommand(command: "deploy" | "resolve", ...args: string[]): Promise<void> {
    const child = Bun.spawn([process.execPath, "x", "prisma", "migrate", command, ...args], {
        stdin: "ignore",
        stdout: "inherit",
        stderr: "inherit",
    });
    const exitCode = await child.exited;
    if (exitCode !== 0) throw new Error(`Prisma Web migration command failed with exit code ${exitCode}`);
}

export async function runWebPrismaMigrations(): Promise<void> {
    const state = classifyWebDatabaseTables(await readWebTableNames());
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
    } catch {
        console.error("Web database migration failed.");
        process.exitCode = 1;
    } finally {
        await webPrisma.$disconnect();
    }
}
