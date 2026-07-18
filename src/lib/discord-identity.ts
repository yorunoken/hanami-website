const discordPlaceholderDomain = "users.hanami.invalid";
const legacyDiscordPlaceholderDomain = "discord.invalid";

export interface DiscordIdentityProfile {
    id: string;
    email?: string | null;
    verified: boolean;
}

export function createDiscordPlaceholderEmail(providerAccountId: string): string {
    if (!/^\d+$/.test(providerAccountId)) throw new Error("Discord returned an invalid provider account ID.");
    return `discord-${providerAccountId}@${discordPlaceholderDomain}`;
}

export function mapDiscordProfileToUser(profile: DiscordIdentityProfile): { email: string; emailVerified: boolean } {
    return {
        email: createDiscordPlaceholderEmail(profile.id),
        emailVerified: false,
    };
}

export function isDiscordPlaceholderEmail(email: string | null | undefined): boolean {
    const normalized = email?.toLowerCase();
    return Boolean(normalized?.endsWith(`@${discordPlaceholderDomain}`) || normalized?.endsWith(`@${legacyDiscordPlaceholderDomain}`));
}

export function getDiscordContactEmail(email: string | null | undefined): string | null {
    return email && !isDiscordPlaceholderEmail(email) ? email : null;
}
