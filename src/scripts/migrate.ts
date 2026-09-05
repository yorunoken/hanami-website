import { prepareAuthenticationSchema, webDatabase } from "../server/auth";
import { runWebMigrations } from "../server/migrations";

try {
    await runWebMigrations(webDatabase, { prepareAuthenticationSchema });
    console.log("Web database migrations are up to date.");
} finally {
    await webDatabase.end();
}
