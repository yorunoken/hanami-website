import { describe, expect, test } from "bun:test";

import { PrismaMigrationCommandError, formatMigrationError } from "./migration-errors";

describe("formatMigrationError", () => {
    test("prints a known refusal", () => {
        expect(formatMigrationError(new Error("Refusing Web migration because the database has a partial or unexpected table set"))).toBe(
            "Refusing Web migration because the database has a partial or unexpected table set",
        );
    });

    test("prints a subprocess exit message without credentials", () => {
        const error = new PrismaMigrationCommandError(1, "Error: P1001 cannot reach mysql://deploy:super-secret@db.example/hanami_test");

        expect(formatMigrationError(error)).toBe(
            "Web database migration failed because the Web database connection could not be established.",
        );
    });

    test("uses a role-specific generic message for unknown Prisma connection errors", () => {
        expect(formatMigrationError(new Error("PrismaClientInitializationError: P1001 cannot reach database"), "Bot")).toBe(
            "Bot database migration failed because the Bot database connection could not be established.",
        );
    });

    test("prints non-connection subprocess exit messages with sanitized output", () => {
        const error = new PrismaMigrationCommandError(2, "Refusing migration for mysql://deploy:super-secret@db.example/hanami_test");

        expect(formatMigrationError(error)).toBe(
            "Prisma Web migration command failed with exit code 2: Refusing migration for mysql://deploy:***@db.example/hanami_test",
        );
    });
});
