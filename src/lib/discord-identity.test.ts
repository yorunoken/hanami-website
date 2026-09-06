import { describe, expect, it, mock } from "bun:test";

import {
    createDiscordPlaceholderEmail,
    getDiscordContactEmail,
    isDiscordPlaceholderEmail,
    mapDiscordProfileToUser,
    mapVerifiedDiscordProfileToUser,
} from "./discord-identity";

describe("Discord profile mapping", () => {
    it("keeps a provider email and its verification state", () => {
        expect(mapDiscordProfileToUser({ id: "123456789012345678", email: "player@example.com", verified: true })).toEqual({
            email: "player@example.com",
            emailVerified: true,
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

    it("runs ownership transfer only after mapping a verified Discord profile", async () => {
        const onVerifiedIdentity = mock(async () => undefined);

        await expect(
            mapVerifiedDiscordProfileToUser(
                {
                    id: "123456789012345678",
                    email: "player@example.com",
                    verified: true,
                    global_name: "Discord player",
                    username: "discord-player",
                    image_url: "https://cdn.discordapp.com/avatars/123456789012345678/avatar.png",
                },
                onVerifiedIdentity,
            ),
        ).resolves.toEqual({ email: "player@example.com", emailVerified: true });
        expect(onVerifiedIdentity).toHaveBeenCalledWith({
            discordId: "123456789012345678",
            displayName: "Discord player",
            avatarUrl: "https://cdn.discordapp.com/avatars/123456789012345678/avatar.png",
        });
    });
});
