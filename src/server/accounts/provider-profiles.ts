import type { Pool } from "mysql2/promise";

import { parseOsuProfile } from "../identities/osu-provider";
import { isLoginProvider, type LoginProvider } from "./service";

export interface ProviderProfileSnapshot {
    provider: LoginProvider;
    accountId: string;
    displayName: string | null;
    avatarUrl: string | null;
}

export interface OAuthAccountSnapshot {
    providerId: string;
    accountId: string;
    accessToken?: string | null;
}

/**
 * Keeps display details attached to the provider account that supplied them.
 * It deliberately does not write the canonical Better Auth user profile.
 */
export class ProviderProfileStore {
    constructor(private readonly pool: Pool) {}

    async save(snapshot: ProviderProfileSnapshot): Promise<void> {
        await this.pool.execute(
            `INSERT INTO linkedAccountProfile (providerId, accountId, displayName, avatarUrl, updatedAt)
             VALUES (?, ?, ?, ?, ?)
             ON DUPLICATE KEY UPDATE displayName = VALUES(displayName), avatarUrl = VALUES(avatarUrl), updatedAt = VALUES(updatedAt)`,
            [snapshot.provider, snapshot.accountId, snapshot.displayName, snapshot.avatarUrl, new Date()],
        );
    }

    async remove(provider: LoginProvider, accountId: string): Promise<void> {
        await this.pool.execute("DELETE FROM linkedAccountProfile WHERE providerId = ? AND accountId = ?", [provider, accountId]);
    }

    async captureOAuthAccount(account: OAuthAccountSnapshot): Promise<void> {
        if (!isLoginProvider(account.providerId) || !account.accessToken) return;

        const snapshot =
            account.providerId === "discord"
                ? await fetchDiscordProfile(account.accountId, account.accessToken)
                : await fetchOsuProfile(account.accountId, account.accessToken);
        if (snapshot) await this.save(snapshot);
    }
}

async function fetchDiscordProfile(accountId: string, accessToken: string): Promise<ProviderProfileSnapshot | null> {
    const response = await fetch("https://discord.com/api/users/@me", {
        headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!response.ok) return null;

    const profile = parseDiscordProviderProfile(await response.json(), accountId);
    return profile
        ? {
              provider: "discord",
              accountId,
              displayName: profile.displayName,
              avatarUrl: profile.avatarUrl,
          }
        : null;
}

async function fetchOsuProfile(accountId: string, accessToken: string): Promise<ProviderProfileSnapshot | null> {
    const response = await fetch("https://osu.ppy.sh/api/v2/me/osu", {
        headers: { Accept: "application/json", Authorization: `Bearer ${accessToken}` },
    });
    if (!response.ok) return null;

    const profile = parseOsuProfile(await response.json());
    if (!profile || profile.id !== accountId) return null;
    return { provider: "osu", accountId, displayName: profile.username, avatarUrl: profile.avatarUrl };
}

export function parseDiscordProviderProfile(
    value: unknown,
    expectedAccountId: string,
): { displayName: string | null; avatarUrl: string } | null {
    if (!isRecord(value) || value.id !== expectedAccountId) return null;
    const username = readDisplayName(value.username);
    const displayName = readDisplayName(value.global_name) ?? username;
    if (!displayName) return null;

    const avatarHash = typeof value.avatar === "string" ? value.avatar : null;
    if (avatarHash && /^[A-Za-z0-9_]+$/.test(avatarHash)) {
        const extension = avatarHash.startsWith("a_") ? "gif" : "png";
        return { displayName, avatarUrl: `https://cdn.discordapp.com/avatars/${expectedAccountId}/${avatarHash}.${extension}` };
    }

    return { displayName, avatarUrl: defaultDiscordAvatar(expectedAccountId) };
}

export function defaultDiscordAvatar(accountId: string): string {
    if (!/^\d{17,20}$/.test(accountId)) return "https://cdn.discordapp.com/embed/avatars/0.png";
    return `https://cdn.discordapp.com/embed/avatars/${Number(BigInt(accountId) >> BigInt(22)) % 6}.png`;
}

function readDisplayName(value: unknown): string | null {
    if (typeof value !== "string") return null;
    const name = value.trim();
    return name && name.length <= 255 ? name : null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === "object" && value !== null;
}
