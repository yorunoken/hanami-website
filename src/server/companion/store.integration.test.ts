import { afterAll, beforeAll, beforeEach, describe, expect, it } from "bun:test";
import mysql, { type RowDataPacket } from "mysql2/promise";

import { runWebMigrations } from "../migrations";
import { createSecureToken, hashToken } from "../security/tokens";
import { prepareDisposableBetterAuthSchema, readDisposableDatabaseUrl } from "../testing/better-auth-schema";
import { COMPANION_CLIENT_ID } from "./protocol";
import { createPkceChallenge } from "./security";
import { MySqlCompanionStore, type NewTokenSet } from "./store";

const testDatabaseUrl = readDisposableDatabaseUrl("TEST_DATABASE_URL", process.env.WEB_DATABASE_URL);
const describeDatabase = testDatabaseUrl ? describe : describe.skip;
const pool = testDatabaseUrl ? mysql.createPool({ uri: testDatabaseUrl, timezone: "Z" }) : null;
const store = pool ? new MySqlCompanionStore(pool) : null;
const now = new Date("2026-07-16T12:00:00.000Z");
const userId = "companion-store-user";
const redirectUri = "http://127.0.0.1:43127/callback";
const verifier = "a".repeat(43);

describeDatabase("MySQL Companion token store", () => {
    beforeAll(async () => {
        if (!pool) throw new Error("TEST_DATABASE_URL is required");
        await prepareDisposableBetterAuthSchema(pool);
        await runWebMigrations(pool, { skipIdentityBackfill: true });
    });

    beforeEach(async () => {
        if (!pool) throw new Error("TEST_DATABASE_URL is required");
        await pool.execute("DELETE FROM user WHERE id = ?", [userId]);
        await pool.execute(
            `INSERT INTO user (id, name, email, emailVerified, image, createdAt, updatedAt)
             VALUES (?, 'Companion test', ?, TRUE, NULL, ?, ?)`,
            [userId, `${userId}@example.test`, now, now],
        );
    });

    afterAll(async () => {
        if (pool) await pool.execute("DELETE FROM user WHERE id = ?", [userId]);
        await pool?.end();
    });

    it("allows only one concurrent authorization-code redemption", async () => {
        if (!store) throw new Error("Companion store is unavailable");
        const code = await issueCode();
        const codeHash = await hashToken(code);
        const codeChallenge = await createPkceChallenge(verifier);

        const results = await Promise.all(
            Array.from({ length: 8 }, async () =>
                store.redeemAuthorizationCode({
                    codeHash,
                    clientId: COMPANION_CLIENT_ID,
                    redirectUri,
                    codeChallenge,
                    deviceId: crypto.randomUUID(),
                    familyId: crypto.randomUUID(),
                    tokens: await createStoredTokens(),
                    now: new Date(now.getTime() + 1_000),
                }),
            ),
        );

        expect(results.filter(Boolean)).toHaveLength(1);
    });

    it("revokes the token family when a rotated refresh token is reused", async () => {
        if (!pool || !store) throw new Error("Companion store is unavailable");
        const code = await issueCode();
        const firstTokens = await createStoredTokens();
        const familyId = crypto.randomUUID();
        expect(
            await store.redeemAuthorizationCode({
                codeHash: await hashToken(code),
                clientId: COMPANION_CLIENT_ID,
                redirectUri,
                codeChallenge: await createPkceChallenge(verifier),
                deviceId: crypto.randomUUID(),
                familyId,
                tokens: firstTokens,
                now: new Date(now.getTime() + 1_000),
            }),
        ).toBe(true);

        const secondTokens = await createStoredTokens();
        expect(
            await store.rotateRefreshToken({
                refreshTokenHash: firstTokens.refreshTokenHash,
                clientId: COMPANION_CLIENT_ID,
                tokens: secondTokens,
                now: new Date(now.getTime() + 2_000),
            }),
        ).toBe("rotated");
        expect(
            await store.rotateRefreshToken({
                refreshTokenHash: firstTokens.refreshTokenHash,
                clientId: COMPANION_CLIENT_ID,
                tokens: await createStoredTokens(),
                now: new Date(now.getTime() + 3_000),
            }),
        ).toBe("reuse_detected");

        const [families] = await pool.execute<RowDataPacket[]>("SELECT revokedAt FROM companionTokenFamily WHERE id = ?", [familyId]);
        expect(families[0]?.revokedAt).not.toBeNull();
        expect(
            await store.rotateRefreshToken({
                refreshTokenHash: secondTokens.refreshTokenHash,
                clientId: COMPANION_CLIENT_ID,
                tokens: await createStoredTokens(),
                now: new Date(now.getTime() + 4_000),
            }),
        ).toBe("invalid");
    });
});

async function issueCode(): Promise<string> {
    if (!store) throw new Error("Companion store is unavailable");
    const code = createSecureToken();
    await store.createAuthorizationCode({
        id: crypto.randomUUID(),
        userId,
        sessionId: "unused-session-id",
        clientId: COMPANION_CLIENT_ID,
        redirectUri,
        state: "integration-state-123456",
        codeChallenge: await createPkceChallenge(verifier),
        codeChallengeMethod: "S256",
        deviceName: "Integration device",
        platform: "linux",
        codeHash: await hashToken(code),
        now,
        expiresAt: new Date(now.getTime() + 5 * 60_000),
    });
    return code;
}

async function createStoredTokens(): Promise<NewTokenSet> {
    const accessToken = createSecureToken();
    const refreshToken = createSecureToken();
    return {
        accessTokenId: crypto.randomUUID(),
        accessTokenHash: await hashToken(accessToken),
        accessTokenExpiresAt: new Date(now.getTime() + 15 * 60_000),
        refreshTokenId: crypto.randomUUID(),
        refreshTokenHash: await hashToken(refreshToken),
        refreshTokenExpiresAt: new Date(now.getTime() + 30 * 24 * 60 * 60_000),
    };
}
