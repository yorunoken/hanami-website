import { createSecureToken, hashToken, safelyEqualHashes } from "../security/tokens";

export { createSecureToken, hashToken };

export async function createPkceChallenge(verifier: string): Promise<string> {
    const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(verifier));
    return Buffer.from(digest).toString("base64url");
}

export function verifyPkceChallenge(actualChallenge: string, expectedChallenge: string): boolean {
    return safelyEqualHashes(actualChallenge, expectedChallenge);
}
