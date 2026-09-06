const osuClaimPrefix = "https://hanami.yorunoken.com/claims/";

export const osuClaimNames = [`${osuClaimPrefix}osu_id`, `${osuClaimPrefix}osu_username`, `${osuClaimPrefix}osu_avatar`] as const;

export interface OsuClaimsDatabase {
    osuProfile: {
        findUnique(args: { where: { userId: string }; select: { osuId: true; username: true; avatarUrl: true } }): Promise<{
            osuId: string;
            username: string;
            avatarUrl: string | null;
        } | null>;
    };
}

export async function buildOsuClaims(
    userId: string,
    scopes: readonly string[],
    database: OsuClaimsDatabase,
): Promise<Record<string, string>> {
    const claims: Record<string, string> = { sub: userId };
    if (!scopes.includes("osu")) return claims;

    const profile = await database.osuProfile.findUnique({
        where: { userId },
        select: { osuId: true, username: true, avatarUrl: true },
    });
    if (!profile) return claims;

    claims[osuClaimNames[0]] = profile.osuId;
    claims[osuClaimNames[1]] = profile.username;
    if (profile.avatarUrl) claims[osuClaimNames[2]] = profile.avatarUrl;
    return claims;
}
