import { describe, expect, it } from "bun:test";

import {
    createDiscordPlaceholderEmail,
    getDiscordContactEmail,
    isDiscordPlaceholderEmail,
    mapDiscordProfileToUser,
} from "./discord-identity";

describe("Discord profile mapping", () => {
    it("uses a provider-specific placeholder even when Discord returns email", () => {
        expect(mapDiscordProfileToUser({ id: "123456789012345678", email: "player@example.com", verified: true })).toEqual({
            email: "discord-123456789012345678@users.hanami.invalid",
            emailVerified: false,
        });
    });

    it("maps a phone-only Discord account to a stable non-deliverable email", () => {
        const first = mapDiscordProfileToUser({ id: "123456789012345678", email: null, verified: true });
        const second = mapDiscordProfileToUser({ id: "123456789012345678", verified: true });

        expect(first).toEqual(second);
        expect(first.email).toBe("discord-123456789012345678@users.hanami.invalid");
        expect(first.emailVerified).toBe(false);
        expect(isDiscordPlaceholderEmail(first.email)).toBe(true);
    });

    it("never exposes a generated placeholder as contact information", () => {
        const placeholder = createDiscordPlaceholderEmail("123456789012345678");
        expect(getDiscordContactEmail(placeholder)).toBeNull();
        expect(getDiscordContactEmail("discord-123456789012345678@discord.invalid")).toBeNull();
        expect(getDiscordContactEmail("player@example.com")).toBe("player@example.com");
    });
});
