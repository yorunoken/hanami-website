import type { OAuth2Tokens } from "@better-auth/core/oauth2";
import type { GenericOAuthConfig } from "better-auth/plugins";

import { createOsuPlaceholderEmail } from "@/lib/osu-identity";

interface OsuProfile {
    id: string;
    username: string;
    avatarUrl: string | null;
}

export function createOsuOAuthProvider(environment: NodeJS.ProcessEnv = process.env): GenericOAuthConfig {
    return {
        providerId: "osu",
        clientId: environment.OSU_AUTH_CLIENT_ID as string,
        clientSecret: environment.OSU_AUTH_CLIENT_SECRET as string,
        authorizationUrl: "https://osu.ppy.sh/oauth/authorize",
        tokenUrl: "https://osu.ppy.sh/oauth/token",
        scopes: ["identify"],
        pkce: true,
        authentication: "post",
        overrideUserInfo: true,
        getUserInfo: fetchOsuUserInfo,
    };
}

async function fetchOsuUserInfo(tokens: OAuth2Tokens) {
    if (!tokens.accessToken) return null;

    const response = await fetch("https://osu.ppy.sh/api/v2/me/osu", {
        headers: {
            Accept: "application/json",
            Authorization: `Bearer ${tokens.accessToken}`,
        },
    });
    if (!response.ok) return null;

    const profile = parseOsuProfile(await response.json());
    if (!profile) return null;

    return {
        id: profile.id,
        name: profile.username,
        email: createOsuPlaceholderEmail(profile.id),
        emailVerified: false,
        image: profile.avatarUrl ?? undefined,
    };
}

export function parseOsuProfile(value: unknown): OsuProfile | null {
    if (!isRecord(value)) return null;
    const rawId = value.id;
    const id = typeof rawId === "number" || typeof rawId === "string" ? String(rawId) : "";
    if (!/^[1-9]\d{0,19}$/.test(id)) return null;
    if (typeof value.username !== "string") return null;
    const username = value.username.trim();
    if (!username || username.length > 255 || hasControlCharacters(username)) return null;

    let avatarUrl: string | null = null;
    if (typeof value.avatar_url === "string" && value.avatar_url.trim()) {
        try {
            const parsed = new URL(value.avatar_url);
            if (parsed.protocol !== "https:" && parsed.protocol !== "http:") return null;
            avatarUrl = parsed.toString();
        } catch {
            return null;
        }
    }

    return { id, username, avatarUrl };
}

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === "object" && value !== null;
}

function hasControlCharacters(value: string): boolean {
    for (const character of value) {
        const codePoint = character.codePointAt(0) ?? 0;
        if (codePoint <= 31 || codePoint === 127) return true;
    }
    return false;
}
