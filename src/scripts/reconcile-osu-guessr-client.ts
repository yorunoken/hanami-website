import { reconcileOsuGuessrClient } from "../server/oauth-provider/config";
import { webPrisma } from "../server/database/web";

export async function reconcileConfiguredOsuGuessrClient(): Promise<void> {
    await reconcileOsuGuessrClient(webPrisma);
}

if (import.meta.url === `file://${process.argv[1]}`) {
    try {
        await reconcileConfiguredOsuGuessrClient();
    } catch (error) {
        console.error(error instanceof Error ? error.message : "Failed to reconcile the osu!guessr OAuth client.");
        process.exitCode = 1;
    } finally {
        await webPrisma.$disconnect();
    }
}
