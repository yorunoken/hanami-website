const osuPlaceholderDomain = "users.hanami.invalid";

export function createOsuPlaceholderEmail(providerAccountId: string): string {
    if (!/^[1-9]\d{0,19}$/.test(providerAccountId)) throw new Error("osu! returned an invalid provider account ID.");
    return `osu-${providerAccountId}@${osuPlaceholderDomain}`;
}

export function isOsuPlaceholderEmail(email: string | null | undefined): boolean {
    return Boolean(email?.toLowerCase().endsWith(`@${osuPlaceholderDomain}`) && email.toLowerCase().startsWith("osu-"));
}
