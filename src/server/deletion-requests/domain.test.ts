import { describe, expect, it } from "bun:test";

import {
    createRequestReference,
    isFreshAuthentication,
    isValidConfirmationPhrase,
    toPublicDeletionRequest,
    type DeletionRequestRecord,
} from "./domain";

describe("account deletion request domain", () => {
    it("accepts the exact confirmation phrase after whitespace normalization", () => {
        expect(isValidConfirmationPhrase("  DELETE  MY HANAMI\nACCOUNT ")).toBe(true);
        expect(isValidConfirmationPhrase("delete my hanami account")).toBe(false);
        expect(isValidConfirmationPhrase("DELETE MY ACCOUNT")).toBe(false);
    });

    it("uses a 15-minute session freshness window", () => {
        const now = Date.UTC(2026, 6, 14, 18, 0, 0);
        expect(isFreshAuthentication(new Date(now - 14 * 60_000), now)).toBe(true);
        expect(isFreshAuthentication(new Date(now - 15 * 60_000), now)).toBe(false);
    });

    it("creates non-sequential, non-enumerable request references", () => {
        const references = new Set(Array.from({ length: 100 }, () => createRequestReference()));
        expect(references.size).toBe(100);
        for (const reference of references) expect(reference).toMatch(/^HAN-[A-Za-z0-9_-]{20}$/);
    });

    it("never exposes operator notes or internal failure reasons", () => {
        const internal: DeletionRequestRecord = {
            id: "internal-id",
            userId: "user-1",
            requestReference: "HAN-abcdefghijklmnopqrst",
            status: "failed",
            requestedAt: "2026-07-14T18:00:00.000Z",
            reauthenticatedAt: "2026-07-14T17:59:00.000Z",
            updatedAt: "2026-07-14T18:05:00.000Z",
            completedAt: null,
            cancelledAt: null,
            operatorNote: "private note",
            failureReason: "database host and stack detail",
            canCancel: false,
            furtherAction: "",
        };

        const publicRecord = toPublicDeletionRequest(internal);
        expect(publicRecord).not.toHaveProperty("operatorNote");
        expect(publicRecord).not.toHaveProperty("failureReason");
        expect(JSON.stringify(publicRecord)).not.toContain("database host");
    });
});
