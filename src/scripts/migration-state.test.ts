import { describe, expect, test } from "bun:test";

import { classifyWebDatabaseTables } from "./migration-state";

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

describe("classifyWebDatabaseTables", () => {
    test("recognizes an empty database", () => {
        expect(classifyWebDatabaseTables([])).toBe("empty");
    });

    test("recognizes an existing Prisma migration history", () => {
        expect(classifyWebDatabaseTables(["_prisma_migrations", "user", "unexpected"])).toBe("prisma-history");
    });

    test("recognizes exactly the legacy Web table set", () => {
        expect(classifyWebDatabaseTables(legacyTables)).toBe("legacy");
    });

    test("rejects a partial or unexpected table set", () => {
        expect(classifyWebDatabaseTables(["user", "session"])).toBe("unexpected");
        expect(classifyWebDatabaseTables([...legacyTables, "unexpected"])).toBe("unexpected");
    });
});
