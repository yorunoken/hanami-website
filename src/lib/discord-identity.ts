const discordPlaceholderDomain = "discord.invalid";

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
    const email = profile.email?.trim();
    if (email) return { email, emailVerified: profile.verified };

    return {
        email: createDiscordPlaceholderEmail(profile.id),
        emailVerified: false,
    };
}

export function isDiscordPlaceholderEmail(email: string | null | undefined): boolean {
    return Boolean(email?.toLowerCase().endsWith(`@${discordPlaceholderDomain}`));
}

export function getDiscordContactEmail(email: string | null | undefined): string | null {
    return email && !isDiscordPlaceholderEmail(email) ? email : null;
}
