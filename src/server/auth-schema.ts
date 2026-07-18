import type { BetterAuthOptions } from "better-auth";
import { getMigrations } from "better-auth/db/migration";

/**
 * Uses the installed Better Auth schema (including plugin fields) as the source
 * of truth. Hanami-owned migrations run only after these base tables exist.
 */
export async function runBetterAuthSchemaMigrations(options: BetterAuthOptions): Promise<void> {
    const { runMigrations } = await getMigrations(options);
    await runMigrations();
}
