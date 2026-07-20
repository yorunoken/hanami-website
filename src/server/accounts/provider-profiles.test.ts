import { describe, expect, it } from "bun:test";

import { defaultDiscordAvatar, parseDiscordProviderProfile } from "./provider-profiles";
import { toLinkedAccountView } from "./service";

describe("linked account provider presentation", () => {
    it("derives independently scoped Discord and osu! avatars for one canonical user", () => {
        const discord = toLinkedAccountView({
            providerId: "discord",
            accountId: "123456789012345678",
            displayName: "Discord Yoru",
            avatarUrl: "https://cdn.discordapp.com/avatars/123456789012345678/discord-hash.png",
        });
        const osu = toLinkedAccountView({
            providerId: "osu",
            accountId: "24680",
            displayName: "osu! Yoru",
            avatarUrl: null,
        });

        expect(discord).toMatchObject({
            avatarUrl: "https://cdn.discordapp.com/avatars/123456789012345678/discord-hash.png",
            profileUrl: null,
        });
        expect(osu).toMatchObject({
            avatarUrl: "https://a.ppy.sh/24680",
            profileUrl: "https://osu.ppy.sh/users/24680",
        });
        expect(discord.avatarUrl).not.toBe(osu.avatarUrl);
    });

    it("uses Discord's stored avatar hash and a Discord-only fallback", () => {
        expect(
            parseDiscordProviderProfile(
                { id: "123456789012345678", username: "yoru", global_name: "Yoru", avatar: "a_avatarhash" },
                "123456789012345678",
            ),
        ).toEqual({ displayName: "Yoru", avatarUrl: "https://cdn.discordapp.com/avatars/123456789012345678/a_avatarhash.gif" });

        expect(defaultDiscordAvatar("123456789012345678")).toBe("https://cdn.discordapp.com/embed/avatars/0.png");
        expect(
            toLinkedAccountView({ providerId: "discord", accountId: "123456789012345678", displayName: null, avatarUrl: null }).avatarUrl,
        ).toBeNull();
    });
});
