const TOKEN_BYTES = 32;
const TOKEN_PATTERN = /^[A-Za-z0-9_-]{43}$/;

export function createSecureToken(): string {
    return Buffer.from(crypto.getRandomValues(new Uint8Array(TOKEN_BYTES))).toString("base64url");
}

export function isSecureToken(value: unknown): value is string {
    if (typeof value !== "string" || !TOKEN_PATTERN.test(value)) return false;

    try {
        return Buffer.from(value, "base64url").byteLength === TOKEN_BYTES;
    } catch {
        return false;
    }
}

export async function hashToken(value: string): Promise<string> {
    const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
    return Buffer.from(digest).toString("hex");
}
