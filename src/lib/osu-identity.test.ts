import { describe, expect, it } from "bun:test";

import { createOsuPlaceholderEmail, isOsuPlaceholderEmail } from "./osu-identity";

describe("osu identity values", () => {
    it("creates a deterministic non-contact email for a valid osu! subject", () => {
        const email = createOsuPlaceholderEmail("24680");

        expect(email).toBe("osu-24680@users.hanami.invalid");
        expect(isOsuPlaceholderEmail(email)).toBe(true);
    });

    it("rejects malformed subjects instead of creating an unsafe email", () => {
        expect(() => createOsuPlaceholderEmail("0")).toThrow();
        expect(() => createOsuPlaceholderEmail("24680@example.com")).toThrow();
        expect(isOsuPlaceholderEmail("person@example.com")).toBe(false);
    });
});
