const DEFAULT_BASE_URL = "http://localhost:3000";

export interface UnifiedAccountFlags {
    unifiedAccounts: boolean;
    dualProviderRegistration: boolean;
    legacyOsuLinking: boolean;
}

export function readBoolean(value: string | undefined, fallback = false): boolean {
    if (value === undefined || value === "") return fallback;
    return value.toLowerCase() === "true" || value === "1";
}

export function getBaseUrl(): string {
    return new URL(process.env.BETTER_AUTH_URL || DEFAULT_BASE_URL).origin;
}

export function getTrustedOrigins(): Array<string> {
    const baseOrigin = getBaseUrl();
    const configured = (process.env.BETTER_AUTH_TRUSTED_ORIGINS || "")
        .split(",")
        .map((origin) => origin.trim())
        .filter(Boolean)
        .map((origin) => new URL(origin).origin);

    if (process.env.NODE_ENV === "production") return Array.from(new Set([baseOrigin, ...configured]));

    return Array.from(
        new Set([
            baseOrigin,
            ...configured,
            "http://localhost:3000",
            "http://localhost:5173",
            "http://localhost:4173",
            "http://127.0.0.1:3000",
            "http://127.0.0.1:5173",
            "http://127.0.0.1:4173",
        ]),
    );
}

export function getUnifiedAccountFlags(): UnifiedAccountFlags {
    return {
        unifiedAccounts: readBoolean(process.env.HANAMI_UNIFIED_ACCOUNTS_ENABLED),
        dualProviderRegistration: readBoolean(process.env.HANAMI_DUAL_PROVIDER_REGISTRATION_ENABLED),
        legacyOsuLinking: readBoolean(process.env.LEGACY_OSU_LINKING_ENABLED, true),
    };
}

export function getOsuCallbackUrl(): string {
    return process.env.OSU_CALLBACK_URL || `${getBaseUrl()}/api/auth/hanami/callback/osu`;
}

export function getDiscordCallbackUrl(): string {
    return process.env.DISCORD_CALLBACK_URL || `${getBaseUrl()}/api/auth/hanami/callback/discord`;
}

export function isSecureProduction(): boolean {
    return process.env.NODE_ENV === "production";
}

