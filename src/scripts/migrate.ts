import mysql from "mysql2/promise";

import { webDatabase } from "../server/database";
import { runWebMigrations } from "../server/migrations";

const botDatabaseUrl = process.env.BOT_DATABASE_URL;
if (!botDatabaseUrl) throw new Error("BOT_DATABASE_URL is required for the canonical identity backfill.");
const botPool = mysql.createPool({ uri: botDatabaseUrl, timezone: "Z" });

try {
    await runWebMigrations(webDatabase, {
        botPool,
        onIdentityBackfill: (summary) => {
            console.log(
                `Canonical identity backfill: created=${summary.created} updated=${summary.updated} skipped=${summary.skipped} conflicts=${summary.conflicts.length}`,
            );
        },
    });
    console.log("Web database migrations are up to date.");
} finally {
    await botPool.end();
    await webDatabase.end();
}
