const osuClaimPrefix = "https://hanami.yorunoken.com/claims/";

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

    claims[`${osuClaimPrefix}osu_id`] = profile.osuId;
    claims[`${osuClaimPrefix}osu_username`] = profile.username;
    if (profile.avatarUrl) claims[`${osuClaimPrefix}osu_avatar`] = profile.avatarUrl;
    return claims;
}
