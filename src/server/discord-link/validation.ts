import { isRecord } from "../security/http";

const DISCORD_SNOWFLAKE_PATTERN = /^\d{17,20}$/;
const DISCORD_AVATAR_HOSTS = new Set(["cdn.discordapp.com", "media.discordapp.net"]);

export interface DiscordLinkRequest {
    discordUserId: string;
    username: string;
    displayName: string;
    avatarUrl: string;
}

export function parseDiscordLinkRequest(value: unknown): DiscordLinkRequest | null {
    if (!isRecord(value)) return null;

    const discordUserId = readString(value.discordUserId, 17, 20);
    const username = readString(value.username, 1, 32);
    const displayName = readString(value.displayName, 1, 100);
    const avatarUrl = readDiscordAvatarUrl(value.avatarUrl);

    if (!discordUserId || !DISCORD_SNOWFLAKE_PATTERN.test(discordUserId) || !username || !displayName || !avatarUrl) return null;
    if (BigInt(discordUserId) <= BigInt(0)) return null;

    return { discordUserId, username, displayName, avatarUrl };
}

function readString(value: unknown, minimumLength: number, maximumLength: number): string | null {
    if (typeof value !== "string" || value !== value.trim()) return null;
    if (value.length < minimumLength || value.length > maximumLength) return null;
    if (/\p{C}/u.test(value)) return null;
    return value;
}

function readDiscordAvatarUrl(value: unknown): string | null {
    const avatarUrl = readString(value, 1, 2_048);
    if (!avatarUrl) return null;

    try {
        const url = new URL(avatarUrl);
        if (url.protocol !== "https:" || !DISCORD_AVATAR_HOSTS.has(url.hostname) || url.username || url.password) return null;
        return url.toString();
    } catch {
        return null;
    }
}
