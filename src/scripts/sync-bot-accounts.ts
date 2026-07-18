import { botAccountCompatibility } from "../server/accounts/runtime";
import { webDatabase } from "../server/database";

if (!process.env.BOT_DATABASE_URL) throw new Error("BOT_DATABASE_URL is required for Bot account synchronization.");

try {
    const summary = await botAccountCompatibility.synchronizeAll();
    console.log(`Temporary Bot account synchronization complete: ${summary.synchronized} mapping(s) synchronized.`);
} finally {
    await webDatabase.end();
}
