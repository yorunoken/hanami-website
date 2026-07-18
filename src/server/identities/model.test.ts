import { describe, expect, it } from "bun:test";

import { IdentityValidationError, normalizeIdentityInput } from "./model";

describe("provider identity validation", () => {
    it("stores numeric provider subjects as strings and normalizes profile snapshots", () => {
        expect(
            normalizeIdentityInput({
                provider: "osu",
                providerUserId: "12345",
                username: "  player  ",
                displayName: "Player",
                avatarUrl: "https://a.ppy.sh/12345",
            }),
        ).toMatchObject({
            provider: "osu",
            providerUserId: "12345",
            username: "player",
            displayName: "Player",
            avatarUrl: "https://a.ppy.sh/12345",
        });
    });

    it("rejects malformed IDs, unsafe avatars, and oversized metadata", () => {
        expect(() => normalizeIdentityInput({ provider: "discord", providerUserId: "not-numeric" })).toThrow(IdentityValidationError);
        expect(() =>
            normalizeIdentityInput({
                provider: "osu",
                providerUserId: "123",
                avatarUrl: "javascript:alert(1)",
            }),
        ).toThrow(IdentityValidationError);
        expect(() =>
            normalizeIdentityInput({
                provider: "osu",
                providerUserId: "123",
                metadata: { value: "x".repeat(8_193) },
            }),
        ).toThrow(IdentityValidationError);
    });
});
