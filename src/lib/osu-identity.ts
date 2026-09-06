const osuPlaceholderDomain = "users.hanami.invalid";
const osuSubjectPattern = /^[1-9]\d{0,19}$/;

export function createOsuPlaceholderEmail(providerAccountId: string): string {
    if (!osuSubjectPattern.test(providerAccountId)) throw new Error("osu! returned an invalid provider account ID.");
    return `osu-${providerAccountId}@${osuPlaceholderDomain}`;
}

export function isOsuPlaceholderEmail(email: string | null | undefined): boolean {
    return Boolean(email && new RegExp(`^osu-${osuSubjectPattern.source.slice(1, -1)}@${osuPlaceholderDomain}$`, "i").test(email));
}
