const OAUTH_STATE_LIFETIME_MS = 10 * 60 * 1000;

interface OAuthStatePayload {
    userId: string;
    nonce: string;
    expiresAt: number;
}

export async function createOAuthState(userId: string, secret: string, now = Date.now()): Promise<string> {
    const payload: OAuthStatePayload = {
        userId,
        nonce: crypto.randomUUID(),
        expiresAt: now + OAUTH_STATE_LIFETIME_MS,
    };
    const encoded = Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
    const signature = await sign(encoded, secret);
    return `${encoded}.${signature}`;
}

export async function validateOAuthState(state: string, userId: string, secret: string, now = Date.now()): Promise<boolean> {
    const [encoded, signature, extra] = state.split(".");
    if (!encoded || !signature || extra) return false;

    const key = await importHmacKey(secret);
    const validSignature = await crypto.subtle.verify("HMAC", key, Buffer.from(signature, "base64url"), new TextEncoder().encode(encoded));
    if (!validSignature) return false;

    try {
        const parsed: unknown = JSON.parse(Buffer.from(encoded, "base64url").toString("utf8"));
        if (!isOAuthStatePayload(parsed)) return false;
        return parsed.userId === userId && parsed.expiresAt >= now && parsed.expiresAt <= now + OAUTH_STATE_LIFETIME_MS;
    } catch {
        return false;
    }
}

async function sign(value: string, secret: string): Promise<string> {
    const key = await importHmacKey(secret);
    const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(value));
    return Buffer.from(signature).toString("base64url");
}

function importHmacKey(secret: string): Promise<CryptoKey> {
    return crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign", "verify"]);
}

function isOAuthStatePayload(value: unknown): value is OAuthStatePayload {
    if (typeof value !== "object" || value === null) return false;
    const payload = value as Record<string, unknown>;
    return typeof payload.userId === "string" && typeof payload.nonce === "string" && typeof payload.expiresAt === "number";
}
