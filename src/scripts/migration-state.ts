import { expectedWebMigrationIds } from "../server/migrations";

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

export const expectedLegacyWebMigrationIds = expectedWebMigrationIds;

export interface PrismaMigrationRecord {
    migrationName: string;
    finished: boolean;
    rolledBack: boolean;
}

interface AllowedPrismaWebState {
    migrationNames: readonly string[];
    tableNames: readonly string[];
}

export const allowedPrismaWebStates: readonly AllowedPrismaWebState[] = [
    {
        migrationNames: ["0_init"],
        tableNames: expectedLegacyWebTables,
    },
];

export type WebDatabaseMigrationState = "empty" | "prisma-history" | "legacy" | "unexpected";

export interface WebDatabaseMetadata {
    tableNames: readonly string[];
    legacyMigrationIds?: readonly string[];
    prismaMigrations?: readonly PrismaMigrationRecord[];
}

export function classifyWebDatabaseTables(metadata: WebDatabaseMetadata): WebDatabaseMigrationState {
    const tables = new Set(metadata.tableNames);
    if (tables.size === 0) return "empty";

    if (tables.has("_prisma_migrations")) {
        const prismaTables = new Set(metadata.tableNames.filter((table) => table !== "_prisma_migrations"));
        const records = metadata.prismaMigrations ?? [];
        const allSuccessful = records.every((record) => record.finished && !record.rolledBack);
        const hasAllowedState = allowedPrismaWebStates.some(
            (allowedState) =>
                allSuccessful &&
                sameValues(
                    records.map((record) => record.migrationName),
                    allowedState.migrationNames,
                ) &&
                sameValues([...prismaTables], allowedState.tableNames),
        );
        return hasAllowedState ? "prisma-history" : "unexpected";
    }

    if (sameValues([...tables], expectedLegacyWebTables) && sameValues(metadata.legacyMigrationIds ?? [], expectedLegacyWebMigrationIds)) {
        return "legacy";
    }

    return "unexpected";
}

function sameValues(actual: readonly string[], expected: readonly string[]): boolean {
    if (actual.length !== expected.length) return false;
    const actualValues = [...actual].sort();
    const expectedValues = [...expected].sort();
    return actualValues.every((value, index) => value === expectedValues[index]);
}
