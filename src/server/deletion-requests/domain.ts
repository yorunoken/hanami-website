export const DELETION_CONFIRMATION_PHRASE = "DELETE MY HANAMI ACCOUNT";
export const REAUTHENTICATION_WINDOW_MS = 15 * 60 * 1000;

export function normalizeConfirmationPhrase(value: string): string {
    return value.trim().replace(/\s+/g, " ");
}

export function isValidConfirmationPhrase(value: unknown): boolean {
    return typeof value === "string" && normalizeConfirmationPhrase(value) === DELETION_CONFIRMATION_PHRASE;
}

export function isFreshAuthentication(sessionCreatedAt: Date, now = Date.now()): boolean {
    const age = now - sessionCreatedAt.getTime();
    return age >= 0 && age < REAUTHENTICATION_WINDOW_MS;
}

export function createChallengeToken(): string {
    return Buffer.from(crypto.getRandomValues(new Uint8Array(32))).toString("base64url");
}

export async function hashChallengeToken(token: string): Promise<string> {
    const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(token));
    return Buffer.from(digest).toString("hex");
}
