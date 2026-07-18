import mysql from "mysql2/promise";

import { prepareAuthenticationSchema, webDatabase } from "../server/auth";
import { runWebMigrations } from "../server/migrations";
import { formatBackfillConflicts, formatBackfillSummary, IdentityBackfillConflictError } from "../server/identities/backfill";

const botDatabaseUrl = process.env.BOT_DATABASE_URL;
if (!botDatabaseUrl) throw new Error("BOT_DATABASE_URL is required for the canonical identity backfill.");
const botPool = mysql.createPool({ uri: botDatabaseUrl, timezone: "Z" });

try {
    await runWebMigrations(webDatabase, {
        botPool,
        prepareAuthenticationSchema,
        onIdentityBackfill: (summary) => {
            console.log(`Canonical identity reconciliation: ${formatBackfillSummary(summary)}`);
        },
    });
    console.log("Web database migrations are up to date.");
} catch (error) {
    if (error instanceof IdentityBackfillConflictError) console.error(formatBackfillConflicts(error));
    throw error;
} finally {
    await botPool.end();
    await webDatabase.end();
}
