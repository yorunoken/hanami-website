import type { BetterAuthOptions } from "better-auth";
import { getMigrations } from "better-auth/db/migration";

// Disposable migration tests still use Better Auth's schema generator until the legacy bootstrap is removed.
export async function runBetterAuthSchemaMigrations(options: BetterAuthOptions): Promise<void> {
    const { runMigrations } = await getMigrations(options);
    await runMigrations();
}
