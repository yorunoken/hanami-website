const discordPlaceholderDomain = "users.hanami.invalid";
const legacyDiscordPlaceholderDomain = "discord.invalid";

export interface DiscordIdentityProfile {
    id: string;
    email?: string | null;
    verified: boolean;
    global_name?: string | null;
    username?: string | null;
    image_url?: string | null;
}

export interface VerifiedDiscordIdentity {
    discordId: string;
    displayName: string;
    avatarUrl: string;
}

export function createDiscordPlaceholderEmail(providerAccountId: string): string {
    if (!/^\d+$/.test(providerAccountId)) throw new Error("Discord returned an invalid provider account ID.");
    return `discord-${providerAccountId}@${discordPlaceholderDomain}`;
}

export function mapDiscordProfileToUser(profile: DiscordIdentityProfile): { email: string; emailVerified: boolean } {
    const email = profile.email?.trim();
    if (email) return { email, emailVerified: profile.verified };

    return {
        email: createDiscordPlaceholderEmail(profile.id),
        emailVerified: false,
    };
}

export async function mapVerifiedDiscordProfileToUser(
    profile: DiscordIdentityProfile,
    onVerifiedIdentity: (identity: VerifiedDiscordIdentity) => Promise<void>,
): Promise<{ email: string; emailVerified: boolean }> {
    const user = mapDiscordProfileToUser(profile);
    const displayName = profile.global_name?.trim() || profile.username?.trim();
    const avatarUrl = profile.image_url?.trim();
    if (!displayName || !avatarUrl) throw new Error("Discord returned an incomplete identity profile.");
    await onVerifiedIdentity({ discordId: profile.id, displayName, avatarUrl });
    return user;
}

export function isDiscordPlaceholderEmail(email: string | null | undefined): boolean {
    const normalized = email?.toLowerCase();
    return Boolean(normalized?.endsWith(`@${discordPlaceholderDomain}`) || normalized?.endsWith(`@${legacyDiscordPlaceholderDomain}`));
}

export function getDiscordContactEmail(email: string | null | undefined): string | null {
    return email && !isDiscordPlaceholderEmail(email) ? email : null;
}
