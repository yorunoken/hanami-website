import { describe, expect, it } from "bun:test";

import { hasValidBotAuthorization } from "./bot-auth";

describe("Discord bot authentication", () => {
    it("accepts only an exact bearer secret", () => {
        expect(hasValidBotAuthorization("Bearer correct-secret", "correct-secret")).toBe(true);
        expect(hasValidBotAuthorization(null, "correct-secret")).toBe(false);
        expect(hasValidBotAuthorization("correct-secret", "correct-secret")).toBe(false);
        expect(hasValidBotAuthorization("Bearer wrong-secret", "correct-secret")).toBe(false);
        expect(hasValidBotAuthorization("Bearer correct-secret ", "correct-secret")).toBe(false);
    });
});
