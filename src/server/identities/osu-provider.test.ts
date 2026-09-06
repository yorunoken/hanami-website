import { describe, expect, it, mock, spyOn } from "bun:test";

import { createOsuOAuthProvider, mapOsuProfileToUser, parseOsuProfile } from "./osu-provider";

describe("osu! Better Auth provider", () => {
    it("uses the exact osu provider id, identify scope, and PKCE", () => {
        const config = createOsuOAuthProvider({
            OSU_AUTH_CLIENT_ID: "client-id",
            OSU_AUTH_CLIENT_SECRET: "client-secret",
        } as NodeJS.ProcessEnv);

        expect(config).toMatchObject({
            providerId: "osu",
            clientId: "client-id",
            clientSecret: "client-secret",
            authorizationUrl: "https://osu.ppy.sh/oauth/authorize",
            tokenUrl: "https://osu.ppy.sh/oauth/token",
            scopes: ["identify"],
            pkce: true,
        });
        expect(config.overrideUserInfo).toBeUndefined();
    });

    it("maps only a validated osu! profile and creates a synthetic non-contact email", () => {
        const user = mapOsuProfileToUser({
            id: 24680,
            username: "Yoru",
            avatar_url: "https://a.ppy.sh/24680",
            email: "attacker@example.com",
            access_token: "must-not-be-copied",
        });

        expect(user).toEqual({
            name: "Yoru",
            email: "osu-24680@users.hanami.invalid",
            emailVerified: false,
            image: "https://a.ppy.sh/24680",
        });
    });

    it("fails closed for malformed profile subjects and avatars", () => {
        expect(parseOsuProfile({ id: "not-an-id", username: "Yoru" })).toBeNull();
        expect(parseOsuProfile({ id: 24680, username: "Yoru", avatar_url: "javascript:alert(1)" })).toBeNull();
        expect(() => mapOsuProfileToUser({ id: 24680, username: "\u0000" })).toThrow();
    });

    it("fetches the provider profile without accepting a mismatched subject", async () => {
        const fetch = spyOn(globalThis, "fetch").mockImplementation(
            mock(async () => Response.json({ id: 13579, username: "Yoru", avatar_url: null })) as unknown as typeof globalThis.fetch,
        );
        const config = createOsuOAuthProvider({
            OSU_AUTH_CLIENT_ID: "client-id",
            OSU_AUTH_CLIENT_SECRET: "client-secret",
        } as NodeJS.ProcessEnv);

        const profile = await config.getUserInfo?.({ accessToken: "token" });

        expect(profile).toMatchObject({ id: "13579", username: "Yoru", emailVerified: false });
        expect(await config.accountSubject?.({ profile: profile!, tokens: { accessToken: "token" } })).toBe("13579");
        expect(fetch).toHaveBeenCalledTimes(1);
        fetch.mockRestore();
    });
});
