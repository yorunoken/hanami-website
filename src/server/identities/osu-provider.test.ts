import { describe, expect, it } from "bun:test";

import { createOsuOAuthProvider, parseOsuProfile } from "./osu-provider";

describe("osu! Better Auth provider", () => {
    it("uses authorization code PKCE and the minimum identify scope", () => {
        const config = createOsuOAuthProvider({
            OSU_AUTH_CLIENT_ID: "client-id",
            OSU_AUTH_CLIENT_SECRET: "client-secret",
        } as NodeJS.ProcessEnv);

        expect(config).toMatchObject({
            providerId: "osu",
            clientId: "client-id",
            clientSecret: "client-secret",
            pkce: true,
            scopes: ["identify"],
            authorizationUrl: "https://osu.ppy.sh/oauth/authorize",
            tokenUrl: "https://osu.ppy.sh/oauth/token",
        });
    });

    it("accepts only a bounded provider subject, username, and HTTP avatar", () => {
        expect(
            parseOsuProfile({
                id: 12345,
                username: "Yoru",
                avatar_url: "https://a.ppy.sh/12345",
                access_token: "must-not-be-copied",
            }),
        ).toEqual({
            id: "12345",
            username: "Yoru",
            avatarUrl: "https://a.ppy.sh/12345",
        });
        expect(parseOsuProfile({ id: "bad", username: "Yoru" })).toBeNull();
        expect(parseOsuProfile({ id: 12345, username: "Yoru", avatar_url: "javascript:alert(1)" })).toBeNull();
    });
});
