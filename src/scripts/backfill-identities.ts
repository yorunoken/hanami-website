import mysql from "mysql2/promise";

import { webDatabase } from "../server/database";
import { formatBackfillConflicts, formatBackfillSummary, IdentityBackfillConflictError } from "../server/identities/backfill";
import { runIdentityBackfillWithLock } from "../server/migrations";

const botDatabaseUrl = process.env.BOT_DATABASE_URL;
if (!botDatabaseUrl) throw new Error("BOT_DATABASE_URL is required for the canonical identity backfill.");
const botPool = mysql.createPool({ uri: botDatabaseUrl, timezone: "Z" });

try {
    const summary = await runIdentityBackfillWithLock(webDatabase, botPool);
    console.log(`Canonical identity reconciliation complete: ${formatBackfillSummary(summary)}`);
} catch (error) {
    if (error instanceof IdentityBackfillConflictError) console.error(formatBackfillConflicts(error));
    throw error;
} finally {
    await botPool.end();
    await webDatabase.end();
}
