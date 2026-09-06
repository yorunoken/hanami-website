import { describe, expect, test } from "bun:test";

import { classifyWebDatabaseTables, expectedLegacyWebMigrationIds } from "./migration-state";

const legacyTables = [
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
];

const centralIdentityTables = [
    "osuProfile",
    "jwks",
    "oauthClient",
    "oauthResource",
    "oauthClientResource",
    "oauthRefreshToken",
    "oauthAccessToken",
    "oauthConsent",
    "oauthClientAssertion",
];

const successfulPrismaHistory = [{ migrationName: "0_init", finished: true, rolledBack: false }];
const successfulCentralIdentityHistory = [
    ...successfulPrismaHistory,
    { migrationName: "1_central_identity", finished: true, rolledBack: false },
];

describe("classifyWebDatabaseTables", () => {
    test("recognizes an empty database", () => {
        expect(classifyWebDatabaseTables({ tableNames: [] })).toBe("empty");
    });

    test("recognizes an existing Prisma migration history", () => {
        expect(
            classifyWebDatabaseTables({
                tableNames: ["_prisma_migrations", ...legacyTables],
                prismaMigrations: successfulPrismaHistory,
            }),
        ).toBe("prisma-history");
    });

    test("recognizes the completed central identity history on restart", () => {
        expect(
            classifyWebDatabaseTables({
                tableNames: ["_prisma_migrations", ...legacyTables, ...centralIdentityTables],
                prismaMigrations: successfulCentralIdentityHistory,
            }),
        ).toBe("prisma-history");
    });

    test("recognizes exactly the legacy Web table set", () => {
        expect(
            classifyWebDatabaseTables({
                tableNames: legacyTables,
                legacyMigrationIds: [...expectedLegacyWebMigrationIds],
            }),
        ).toBe("legacy");
    });

    test("rejects a partial or unexpected table set", () => {
        expect(classifyWebDatabaseTables({ tableNames: ["user", "session"] })).toBe("unexpected");
        expect(
            classifyWebDatabaseTables({
                tableNames: ["_prisma_migrations", "user", "session"],
                prismaMigrations: successfulPrismaHistory,
            }),
        ).toBe("unexpected");
        expect(
            classifyWebDatabaseTables({
                tableNames: ["_prisma_migrations", ...legacyTables],
                prismaMigrations: [],
            }),
        ).toBe("unexpected");
        expect(
            classifyWebDatabaseTables({
                tableNames: legacyTables,
                legacyMigrationIds: ["20260715_account_deletion_reauthentication"],
            }),
        ).toBe("unexpected");
    });

    test("rejects an incomplete or rolled-back Prisma baseline", () => {
        expect(
            classifyWebDatabaseTables({
                tableNames: ["_prisma_migrations", ...legacyTables],
                prismaMigrations: [{ migrationName: "0_init", finished: false, rolledBack: false }],
            }),
        ).toBe("unexpected");
        expect(
            classifyWebDatabaseTables({
                tableNames: ["_prisma_migrations", ...legacyTables, ...centralIdentityTables],
                prismaMigrations: [...successfulPrismaHistory, { migrationName: "1_central_identity", finished: false, rolledBack: false }],
            }),
        ).toBe("unexpected");
        expect(
            classifyWebDatabaseTables({
                tableNames: ["_prisma_migrations", ...legacyTables, ...centralIdentityTables],
                prismaMigrations: [...successfulPrismaHistory, { migrationName: "1_central_identity", finished: true, rolledBack: true }],
            }),
        ).toBe("unexpected");
    });

    test("rejects partial and extra central identity histories", () => {
        expect(
            classifyWebDatabaseTables({
                tableNames: ["_prisma_migrations", ...legacyTables, ...centralIdentityTables.slice(0, -1)],
                prismaMigrations: successfulCentralIdentityHistory,
            }),
        ).toBe("unexpected");
        expect(
            classifyWebDatabaseTables({
                tableNames: ["_prisma_migrations", ...legacyTables, ...centralIdentityTables, "unexpectedTable"],
                prismaMigrations: successfulCentralIdentityHistory,
            }),
        ).toBe("unexpected");
        expect(
            classifyWebDatabaseTables({
                tableNames: ["_prisma_migrations", ...legacyTables, ...centralIdentityTables],
                prismaMigrations: [...successfulCentralIdentityHistory, { migrationName: "2_unknown", finished: true, rolledBack: false }],
            }),
        ).toBe("unexpected");
    });
});
