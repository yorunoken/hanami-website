import { describe, expect, it } from "bun:test";

import { buildOsuClaims } from "../oauth-provider/claims";
import { deleteOsuProfile, synchronizeOsuProfile } from "./osu-profile";

describe("durable osu profile lifecycle", () => {
    it("refreshes the durable profile from an updated account access token", async () => {
        const database = makeDatabase();

        await synchronizeOsuProfile({ userId: "user-1", accountId: "24680", accessToken: "fresh-token" }, database, async () => ({
            id: "24680",
            name: "Fresh name",
            image: "https://a.ppy.sh/24680",
            emailVerified: false,
        }));

        expect(database.state).toEqual([{ userId: "user-1", osuId: "24680", username: "Fresh name", avatarUrl: "https://a.ppy.sh/24680" }]);
    });

    it("does not fetch or overwrite a profile when an account update has no access token", async () => {
        const database = makeDatabase([{ userId: "user-1", osuId: "24680", username: "Existing", avatarUrl: null }]);
        let fetches = 0;

        await synchronizeOsuProfile({ userId: "user-1", accountId: "24680", accessToken: null }, database, async () => {
            fetches += 1;
            return null;
        });

        expect(fetches).toBe(0);
        expect(database.state[0]?.username).toBe("Existing");
    });

    it("surfaces durable profile persistence failures to the authentication flow", async () => {
        const database = makeDatabase();
        database.osuProfile.upsert = async () => {
            throw new Error("Web database unavailable");
        };

        await expect(
            synchronizeOsuProfile({ userId: "user-1", accountId: "24680", accessToken: "fresh-token" }, database, async () => ({
                id: "24680",
                name: "Yoru",
                emailVerified: false,
            })),
        ).rejects.toThrow("Web database unavailable");
    });

    it("removes stale claims before unlink and allows the osu identity to be linked again", async () => {
        const database = makeDatabase([{ userId: "user-1", osuId: "24680", username: "Old", avatarUrl: null }]);

        await deleteOsuProfile("user-1", "24680", database);
        await expect(buildOsuClaims("user-1", ["openid", "osu"], database)).resolves.toEqual({ sub: "user-1" });
        await synchronizeOsuProfile({ userId: "user-2", accountId: "24680", accessToken: "relink-token" }, database, async () => ({
            id: "24680",
            name: "Relinked",
            emailVerified: false,
        }));

        expect(database.state).toEqual([{ userId: "user-2", osuId: "24680", username: "Relinked", avatarUrl: null }]);
    });
});

function makeDatabase(initial: Array<{ userId: string; osuId: string; username: string; avatarUrl: string | null }> = []) {
    const state = [...initial];
    return {
        state,
        osuProfile: {
            findUnique: async ({ where }: { where: { userId: string } }) =>
                state.find((profile) => profile.userId === where.userId) ?? null,
            upsert: async ({
                where,
                create,
                update,
            }: {
                where: { userId: string };
                create: { userId: string; osuId: string; username: string; avatarUrl: string | null };
                update: { osuId: string; username: string; avatarUrl: string | null };
            }) => {
                const conflicting = state.find((profile) => profile.osuId === create.osuId && profile.userId !== where.userId);
                if (conflicting) throw new Error("Duplicate osu id");
                const existing = state.find((profile) => profile.userId === where.userId);
                if (existing) Object.assign(existing, update);
                else state.push(create);
            },
            deleteMany: async ({ where }: { where: { userId: string; osuId: string } }) => {
                const index = state.findIndex((profile) => profile.userId === where.userId && profile.osuId === where.osuId);
                if (index >= 0) state.splice(index, 1);
            },
        },
    };
}
