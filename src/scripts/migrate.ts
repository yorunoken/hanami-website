import { webDatabase } from "../server/auth";
import { runWebMigrations } from "../server/migrations";

try {
    await runWebMigrations(webDatabase);
    console.log("Web database migrations are up to date.");
} finally {
    await webDatabase.end();
}
