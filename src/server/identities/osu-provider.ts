import type { OAuth2Tokens } from "@better-auth/core/oauth2";
import type { GenericOAuthConfig, GenericOAuthUserInfo } from "better-auth/plugins";

import { createOsuPlaceholderEmail } from "@/lib/osu-identity";

export interface OsuProfile {
    id: string;
    username: string;
    avatarUrl: string | null;
}

export function createOsuOAuthProvider(environment: NodeJS.ProcessEnv = process.env): GenericOAuthConfig<"osu"> {
    const clientId = environment.OSU_AUTH_CLIENT_ID ?? environment.OSU_CLIENT_ID;
    const clientSecret = environment.OSU_AUTH_CLIENT_SECRET ?? environment.OSU_CLIENT_SECRET;
    if (!clientId || !clientSecret) throw new Error("OSU_CLIENT_ID and OSU_CLIENT_SECRET are required for osu! authentication.");

    return {
        providerId: "osu",
        name: "osu!",
        clientId,
        clientSecret,
        authorizationUrl: "https://osu.ppy.sh/oauth/authorize",
        tokenUrl: "https://osu.ppy.sh/oauth/token",
        scopes: ["identify"],
        pkce: true,
        authentication: "post",
        accountSubject: (context) => {
            const profile = parseOsuProfile(context.profile);
            if (!profile) throw new Error("osu! returned an invalid identity profile.");
            return profile.id;
        },
        getUserInfo: fetchOsuUserInfo,
        mapProfileToUser: mapOsuProfileToUser,
        overrideUserInfo: true,
    };
}

export async function fetchOsuUserInfo(tokens: OAuth2Tokens): Promise<GenericOAuthUserInfo | null> {
    if (!tokens.accessToken) return null;

    const response = await fetch("https://osu.ppy.sh/api/v2/me/osu", {
        headers: { Accept: "application/json", Authorization: `Bearer ${tokens.accessToken}` },
    });
    if (!response.ok) return null;

    const profile = parseOsuProfile(await response.json());
    return profile
        ? {
              id: profile.id,
              username: profile.username,
              name: profile.username,
              emailVerified: false,
              image: profile.avatarUrl ?? undefined,
          }
        : null;
}

export function mapOsuProfileToUser(profile: unknown): {
    name: string;
    email: string;
    emailVerified: false;
    image?: string;
} {
    const parsed = parseOsuProfile(profile);
    if (!parsed) throw new Error("osu! returned an invalid identity profile.");
    return {
        name: parsed.username,
        email: createOsuPlaceholderEmail(parsed.id),
        emailVerified: false,
        ...(parsed.avatarUrl ? { image: parsed.avatarUrl } : {}),
    };
}

export function parseOsuProfile(value: unknown): OsuProfile | null {
    if (!isRecord(value)) return null;
    const rawId = value.id ?? value.sub;
    const id = typeof rawId === "number" || typeof rawId === "string" ? String(rawId) : "";
    if (!/^[1-9]\d{0,19}$/.test(id)) return null;
    if (typeof value.username !== "string") return null;
    const username = value.username.trim();
    if (!username || username.length > 255 || hasControlCharacters(username)) return null;

    let avatarUrl: string | null = null;
    if (value.avatar_url !== undefined && value.avatar_url !== null) {
        if (typeof value.avatar_url !== "string" || !value.avatar_url.trim()) return null;
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
