import type { BetterAuthOptions } from "better-auth";
import { getMigrations } from "better-auth/db/migration";

export async function runBetterAuthSchemaMigrations(options: BetterAuthOptions): Promise<void> {
    const { runMigrations } = await getMigrations(options);
    await runMigrations();
}
