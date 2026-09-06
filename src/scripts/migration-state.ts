export const expectedLegacyWebTables = [
    "user",
    "session",
    "account",
    "verification",
    "webSchemaMigration",
    "accountDeletionReauthChallenge",
    "discordLinkTicket",
    "osuOAuthState",
    "companionAuthorizationRequest",
    "companionAuthorizationCode",
    "companionDevice",
    "companionTokenFamily",
    "companionAccessToken",
    "companionRefreshToken",
] as const;

export type WebDatabaseMigrationState = "empty" | "prisma-history" | "legacy" | "unexpected";

export function classifyWebDatabaseTables(tableNames: readonly string[]): WebDatabaseMigrationState {
    const tables = new Set(tableNames);
    if (tables.has("_prisma_migrations")) return "prisma-history";
    if (tables.size === 0) return "empty";
    if (tables.size === expectedLegacyWebTables.length && expectedLegacyWebTables.every((table) => tables.has(table))) return "legacy";
    return "unexpected";
}
