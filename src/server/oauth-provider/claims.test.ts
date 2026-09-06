import { describe, expect, test } from "bun:test";

import { buildOsuClaims } from "./claims";

const profile = {
    osuId: "24680",
    username: "Yoru",
    avatarUrl: "https://a.ppy.sh/24680",
};

function createPrisma(profileValue: typeof profile | null) {
    return {
        osuProfile: {
            findUnique: async () => profileValue,
        },
    };
}

describe("OAuth claims", () => {
    test("uses the Hanami user id as a stable subject", async () => {
        const claims = await buildOsuClaims("hanami-user-1", ["openid"], createPrisma(profile));

        expect(claims.sub).toBe("hanami-user-1");
    });

    test("adds only namespaced osu claims when the osu scope is granted", async () => {
        const claims = await buildOsuClaims("hanami-user-1", ["openid", "osu"], createPrisma(profile));

        expect(claims).toMatchObject({
            sub: "hanami-user-1",
            "https://hanami.yorunoken.com/claims/osu_id": "24680",
            "https://hanami.yorunoken.com/claims/osu_username": "Yoru",
            "https://hanami.yorunoken.com/claims/osu_avatar": "https://a.ppy.sh/24680",
        });
        expect(Object.keys(claims)).toHaveLength(4);
        expect(claims).not.toHaveProperty("email");
        expect(claims).not.toHaveProperty("discord_id");
        expect(claims).not.toHaveProperty("access_token");
    });

    test("does not query or expose osu profile claims without the osu scope", async () => {
        let reads = 0;
        const prisma = {
            osuProfile: {
                findUnique: async () => {
                    reads += 1;
                    return profile;
                },
            },
        };

        await expect(buildOsuClaims("hanami-user-1", ["openid"], prisma)).resolves.toEqual({ sub: "hanami-user-1" });
        expect(reads).toBe(0);
    });

    test("omits missing osu identity without leaking canonical or Discord identity", async () => {
        const claims = await buildOsuClaims("hanami-user-1", ["openid", "osu"], createPrisma(null));

        expect(claims).toEqual({ sub: "hanami-user-1" });
    });
});
