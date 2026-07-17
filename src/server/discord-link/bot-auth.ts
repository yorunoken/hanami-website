import { createHash, timingSafeEqual } from "node:crypto";

export function hasValidBotAuthorization(authorization: string | null, expectedSecret: string): boolean {
    const suppliedSecret = readBearerToken(authorization);
    if (!suppliedSecret || !expectedSecret) return false;

    const suppliedDigest = createHash("sha256").update(suppliedSecret, "utf8").digest();
    const expectedDigest = createHash("sha256").update(expectedSecret, "utf8").digest();
    return timingSafeEqual(suppliedDigest, expectedDigest);
}

export function getBotLinkSecret(): string {
    const secret = process.env.BOT_LINK_SECRET;
    if (!secret) throw new Error("BOT_LINK_SECRET environment variable is not set.");
    if (Buffer.byteLength(secret, "utf8") < 32) throw new Error("BOT_LINK_SECRET must contain at least 32 bytes.");
    return secret;
}

function readBearerToken(authorization: string | null): string | null {
    if (!authorization?.startsWith("Bearer ")) return null;
    const token = authorization.slice("Bearer ".length);
    return token && token === token.trim() ? token : null;
}
