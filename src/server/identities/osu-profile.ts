import type { GenericOAuthUserInfo } from "better-auth/plugins";

import { fetchOsuUserInfo } from "./osu-provider";

export interface OsuProfileAccount {
    userId: string;
    accountId: string;
    accessToken?: string | null;
}

export interface OsuProfileLifecycleDatabase {
    osuProfile: {
        upsert(args: {
            where: { userId: string };
            create: { userId: string; osuId: string; username: string; avatarUrl: string | null };
            update: { osuId: string; username: string; avatarUrl: string | null };
        }): Promise<unknown>;
        deleteMany(args: { where: { userId: string; osuId: string } }): Promise<unknown>;
    };
}

export type OsuProfileFetcher = (tokens: { accessToken: string }) => Promise<GenericOAuthUserInfo | null>;

export async function synchronizeOsuProfile(
    account: OsuProfileAccount,
    database: OsuProfileLifecycleDatabase,
    fetchProfile: OsuProfileFetcher = fetchOsuUserInfo,
): Promise<void> {
    if (!account.accessToken) return;
    const profile = await fetchProfile({ accessToken: account.accessToken });
    if (!profile || profile.id !== account.accountId || typeof profile.name !== "string") return;

    await database.osuProfile.upsert({
        where: { userId: account.userId },
        create: {
            userId: account.userId,
            osuId: profile.id,
            username: profile.name,
            avatarUrl: profile.image ?? null,
        },
        update: {
            osuId: profile.id,
            username: profile.name,
            avatarUrl: profile.image ?? null,
        },
    });
}

export async function deleteOsuProfile(userId: string, osuId: string, database: OsuProfileLifecycleDatabase): Promise<void> {
    await database.osuProfile.deleteMany({ where: { userId, osuId } });
}
