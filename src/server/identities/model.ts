export const supportedIdentityProviders = ["discord", "osu"] as const;

export type SupportedIdentityProvider = (typeof supportedIdentityProviders)[number];

export interface UserIdentity {
    id: string;
    userId: string;
    provider: SupportedIdentityProvider;
    providerUserId: string;
    username: string | null;
    displayName: string | null;
    avatarUrl: string | null;
    metadata: Record<string, unknown> | null;
    linkedAt: Date;
    updatedAt: Date;
}

export interface LinkIdentityInput {
    provider: SupportedIdentityProvider;
    providerUserId: string;
    username?: string | null;
    displayName?: string | null;
    avatarUrl?: string | null;
    metadata?: Record<string, unknown> | null;
}

export class IdentityConflictError extends Error {
    readonly code = "identity_conflict";

    constructor(public readonly reason: "provider_owned" | "provider_slot_occupied") {
        super(reason);
        this.name = "IdentityConflictError";
    }
}

export class IdentityValidationError extends Error {
    readonly code = "identity_invalid";

    constructor(message: string) {
        super(message);
        this.name = "IdentityValidationError";
    }
}

export function isSupportedIdentityProvider(value: unknown): value is SupportedIdentityProvider {
    return typeof value === "string" && supportedIdentityProviders.includes(value as SupportedIdentityProvider);
}

export function normalizeIdentityInput(input: LinkIdentityInput): Required<LinkIdentityInput> {
    if (!isSupportedIdentityProvider(input.provider)) throw new IdentityValidationError("Unsupported identity provider");

    const providerUserId = input.providerUserId.trim();
    if (!providerUserId || providerUserId.length > 255 || hasControlCharacters(providerUserId)) {
        throw new IdentityValidationError("Invalid provider user ID");
    }
    if (input.provider === "discord" && !/^[1-9]\d{0,19}$/.test(providerUserId)) {
        throw new IdentityValidationError("Invalid Discord user ID");
    }
    if (input.provider === "osu" && !/^[1-9]\d{0,19}$/.test(providerUserId)) {
        throw new IdentityValidationError("Invalid osu! user ID");
    }

    const username = normalizeDisplayValue(input.username, "username");
    const displayName = normalizeDisplayValue(input.displayName, "display name");
    const avatarUrl = normalizeAvatarUrl(input.avatarUrl);
    const metadata = normalizeMetadata(input.metadata);

    return {
        provider: input.provider,
        providerUserId,
        username,
        displayName,
        avatarUrl,
        metadata,
    };
}

function normalizeDisplayValue(value: string | null | undefined, label: string): string | null {
    if (value === null || value === undefined) return null;
    const normalized = value.trim();
    if (!normalized) return null;
    if (normalized.length > 255 || hasControlCharacters(normalized)) {
        throw new IdentityValidationError(`Invalid provider ${label}`);
    }
    return normalized;
}

function normalizeAvatarUrl(value: string | null | undefined): string | null {
    if (value === null || value === undefined || value.trim() === "") return null;
    const normalized = value.trim();
    if (normalized.length > 2_048 || hasControlCharacters(normalized)) {
        throw new IdentityValidationError("Invalid provider avatar URL");
    }

    let url: URL;
    try {
        url = new URL(normalized);
    } catch {
        throw new IdentityValidationError("Invalid provider avatar URL");
    }
    if (url.protocol !== "https:" && url.protocol !== "http:") {
        throw new IdentityValidationError("Invalid provider avatar URL");
    }
    return url.toString();
}

function normalizeMetadata(value: Record<string, unknown> | null | undefined): Record<string, unknown> | null {
    if (value === null || value === undefined) return null;
    let serialized: string;
    try {
        serialized = JSON.stringify(value);
    } catch {
        throw new IdentityValidationError("Invalid provider metadata");
    }
    if (serialized.length > 8_192) throw new IdentityValidationError("Provider metadata is too large");
    return JSON.parse(serialized) as Record<string, unknown>;
}

function hasControlCharacters(value: string): boolean {
    for (const character of value) {
        const codePoint = character.codePointAt(0) ?? 0;
        if (codePoint <= 31 || codePoint === 127) return true;
    }
    return false;
}
