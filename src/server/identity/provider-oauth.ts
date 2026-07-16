import { generateCodeChallenge } from "better-auth/oauth2";
import { z } from "zod";

import { getDiscordCallbackUrl, getOsuCallbackUrl } from "../config";
import type { IdentityProvider, ProviderProfileSnapshot } from "./types";

const discordProfileSchema = z.object({
    id: z.string().regex(/^\d{2,20}$/),
    username: z.string().min(1).max(255),
    global_name: z.string().min(1).max(255).nullable().optional(),
    avatar: z.string().nullable().optional(),
    discriminator: z.string().optional(),
    email: z.string().email().nullable().optional(),
    verified: z.boolean().optional(),
});

const osuProfileSchema = z.object({
    id: z.union([z.number().int().positive(), z.string().regex(/^\d+$/)]),
    username: z.string().min(1).max(255),
    avatar_url: z.string().url().nullable().optional(),
});

const tokenResponseSchema = z.object({
    access_token: z.string().min(1),
    token_type: z.string().optional(),
    expires_in: z.number().optional(),
});

export function hasProviderConfiguration(provider: IdentityProvider): boolean {
    if (provider === "discord") return Boolean(process.env.DISCORD_CLIENT_ID && process.env.DISCORD_CLIENT_SECRET);
    return Boolean(process.env.OSU_CLIENT_ID && process.env.OSU_CLIENT_SECRET);
}

export async function createProviderAuthorizationUrl(
    provider: IdentityProvider,
    state: string,
    codeVerifier: string,
): Promise<string> {
    const challenge = await generateCodeChallenge(codeVerifier);
    if (provider === "discord") {
        const clientId = requireEnvironment("DISCORD_CLIENT_ID");
        const url = new URL("https://discord.com/api/oauth2/authorize");
        url.searchParams.set("client_id", clientId);
        url.searchParams.set("redirect_uri", getDiscordCallbackUrl());
        url.searchParams.set("response_type", "code");
        url.searchParams.set("scope", "identify email");
        url.searchParams.set("state", state);
        url.searchParams.set("code_challenge", challenge);
        url.searchParams.set("code_challenge_method", "S256");
        url.searchParams.set("prompt", "consent");
        return url.toString();
    }

    const clientId = requireEnvironment("OSU_CLIENT_ID");
    const url = new URL("https://osu.ppy.sh/oauth/authorize");
    url.searchParams.set("client_id", clientId);
    url.searchParams.set("redirect_uri", getOsuCallbackUrl());
    url.searchParams.set("response_type", "code");
    url.searchParams.set("scope", "identify");
    url.searchParams.set("state", state);
    url.searchParams.set("code_challenge", challenge);
    url.searchParams.set("code_challenge_method", "S256");
    return url.toString();
}

export async function exchangeProviderCode(
    provider: IdentityProvider,
    code: string,
    codeVerifier: string,
): Promise<ProviderProfileSnapshot> {
    const accessToken = await exchangeAuthorizationCode(provider, code, codeVerifier);
    return provider === "discord" ? fetchDiscordProfile(accessToken) : fetchOsuProfile(accessToken);
}

async function exchangeAuthorizationCode(provider: IdentityProvider, code: string, codeVerifier: string): Promise<string> {
    const body = new URLSearchParams({
        client_id: requireEnvironment(provider === "discord" ? "DISCORD_CLIENT_ID" : "OSU_CLIENT_ID"),
        client_secret: requireEnvironment(provider === "discord" ? "DISCORD_CLIENT_SECRET" : "OSU_CLIENT_SECRET"),
        code,
        code_verifier: codeVerifier,
        grant_type: "authorization_code",
        redirect_uri: provider === "discord" ? getDiscordCallbackUrl() : getOsuCallbackUrl(),
    });
    const response = await fetchWithTimeout(
        provider === "discord" ? "https://discord.com/api/oauth2/token" : "https://osu.ppy.sh/oauth/token",
        {
            method: "POST",
            headers: { Accept: "application/json", "Content-Type": "application/x-www-form-urlencoded" },
            body,
        },
    );
    if (!response.ok) throw new Error(`provider_token_exchange_failed_${response.status}`);
    const contentLength = Number(response.headers.get("content-length") || 0);
    if (contentLength > 64 * 1024) throw new Error("provider_token_response_too_large");
    return tokenResponseSchema.parse(await response.json()).access_token;
}

async function fetchDiscordProfile(accessToken: string): Promise<ProviderProfileSnapshot> {
    const response = await fetchWithTimeout("https://discord.com/api/users/@me", {
        headers: { Accept: "application/json", Authorization: `Bearer ${accessToken}` },
    });
    if (!response.ok) throw new Error(`discord_profile_failed_${response.status}`);
    const profile = discordProfileSchema.parse(await readBoundedJson(response));
    const image = profile.avatar
        ? `https://cdn.discordapp.com/avatars/${profile.id}/${profile.avatar}.${profile.avatar.startsWith("a_") ? "gif" : "png"}`
        : null;
    return {
        accountId: profile.id,
        name: profile.global_name || profile.username,
        image,
        email: profile.verified && profile.email ? profile.email.toLowerCase() : null,
        emailVerified: Boolean(profile.verified && profile.email),
    };
}

async function fetchOsuProfile(accessToken: string): Promise<ProviderProfileSnapshot> {
    const response = await fetchWithTimeout("https://osu.ppy.sh/api/v2/me", {
        headers: { Accept: "application/json", Authorization: `Bearer ${accessToken}` },
    });
    if (!response.ok) throw new Error(`osu_profile_failed_${response.status}`);
    const profile = osuProfileSchema.parse(await readBoundedJson(response));
    return {
        accountId: String(profile.id),
        name: profile.username,
        image: profile.avatar_url || null,
        email: null,
        emailVerified: false,
    };
}

async function readBoundedJson(response: Response): Promise<unknown> {
    const contentLength = Number(response.headers.get("content-length") || 0);
    if (contentLength > 256 * 1024) throw new Error("provider_profile_response_too_large");
    const text = await response.text();
    if (Buffer.byteLength(text, "utf8") > 256 * 1024) throw new Error("provider_profile_response_too_large");
    return JSON.parse(text);
}

async function fetchWithTimeout(url: string, init: RequestInit): Promise<Response> {
    return fetch(url, { ...init, redirect: "error", signal: AbortSignal.timeout(8_000) });
}

function requireEnvironment(name: string): string {
    const value = process.env[name];
    if (!value) throw new Error(`missing_${name.toLowerCase()}`);
    return value;
}

