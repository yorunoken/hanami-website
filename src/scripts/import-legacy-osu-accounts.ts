import mysql from "mysql2/promise";

import { formatLegacyOsuImportSummary, importLegacyOsuAccounts, LegacyOsuImportConflictError } from "../server/accounts/import-legacy-osu";
import { webDatabase } from "../server/database";

const botDatabaseUrl = process.env.BOT_DATABASE_URL;
if (!botDatabaseUrl) throw new Error("BOT_DATABASE_URL is required for the legacy osu! account import.");
const botPool = mysql.createPool({ uri: botDatabaseUrl, timezone: "Z" });

try {
    const summary = await importLegacyOsuAccounts(webDatabase, botPool);
    console.log(`Legacy osu! account import complete: ${formatLegacyOsuImportSummary(summary)}`);
} catch (error) {
    if (error instanceof LegacyOsuImportConflictError) {
        console.error(formatLegacyOsuImportSummary(error.summary));
        for (const conflict of error.summary.conflicts) console.error(`- ${conflict}`);
    }
    throw error;
} finally {
    await botPool.end();
    await webDatabase.end();
}
