import type { Pool, PoolConnection, ResultSetHeader, RowDataPacket } from "mysql2/promise";

import { safelyEqualHashes } from "../security/tokens";
import type { CompanionAuthorizationInput, CompanionPlatform } from "./protocol";

export interface AuthorizationRequestRecord extends CompanionAuthorizationInput {
    id: string;
    userId: string;
    sessionId: string;
}

export interface NewTokenSet {
    accessTokenId: string;
    accessTokenHash: string;
    accessTokenExpiresAt: Date;
    refreshTokenId: string;
    refreshTokenHash: string;
    refreshTokenExpiresAt: Date;
}

export interface CompanionDeviceMetadata {
    id: string;
    displayName: string;
    platform: CompanionPlatform;
    createdAt: Date;
    lastUsedAt: Date;
    revokedAt: Date | null;
}

export interface CompanionStore {
    createAuthorizationRequest(
        input: CompanionAuthorizationInput & {
            id: string;
            userId: string;
            sessionId: string;
            csrfTokenHash: string;
            now: Date;
            expiresAt: Date;
        },
    ): Promise<void>;
    consumeAuthorizationRequest(input: {
        id: string;
        userId: string;
        sessionId: string;
        csrfTokenHash: string;
        now: Date;
    }): Promise<AuthorizationRequestRecord | null>;
    createAuthorizationCode(input: AuthorizationRequestRecord & { codeHash: string; now: Date; expiresAt: Date }): Promise<void>;
    redeemAuthorizationCode(input: {
        codeHash: string;
        clientId: string;
        redirectUri: string;
        codeChallenge: string;
        deviceId: string;
        familyId: string;
        tokens: NewTokenSet;
        now: Date;
    }): Promise<boolean>;
    rotateRefreshToken(input: {
        refreshTokenHash: string;
        clientId: string;
        tokens: NewTokenSet;
        now: Date;
    }): Promise<"rotated" | "invalid" | "reuse_detected">;
    revokeByTokenHash(input: { tokenHash: string; clientId: string; now: Date }): Promise<void>;
    listDevices(userId: string): Promise<CompanionDeviceMetadata[]>;
    revokeDevice(input: { userId: string; deviceId: string; now: Date }): Promise<boolean>;
}

interface AuthorizationRequestRow extends RowDataPacket {
    id: string;
    userId: string;
    sessionId: string;
    clientId: string;
    redirectUri: string;
    state: string;
    codeChallenge: string;
    codeChallengeMethod: "S256";
    deviceName: string;
    platform: CompanionPlatform;
    csrfTokenHash: string;
    expiresAt: Date;
    consumedAt: Date | null;
}

interface AuthorizationCodeRow extends RowDataPacket {
    id: string;
    codeHash: string;
    userId: string;
    clientId: string;
    redirectUri: string;
    codeChallenge: string;
    deviceName: string;
    platform: CompanionPlatform;
    expiresAt: Date;
    usedAt: Date | null;
}

interface RefreshTokenRow extends RowDataPacket {
    id: string;
    tokenHash: string;
    familyId: string;
    deviceId: string;
    userId: string;
    clientId: string;
    expiresAt: Date;
    usedAt: Date | null;
    revokedAt: Date | null;
    familyRevokedAt: Date | null;
}

interface FamilyLookupRow extends RowDataPacket {
    familyId: string;
}

interface DeviceRow extends RowDataPacket {
    id: string;
    displayName: string;
    platform: CompanionPlatform;
    createdAt: Date;
    lastUsedAt: Date;
    revokedAt: Date | null;
}

interface CountRow extends RowDataPacket {
    count: number | string;
}

export class MySqlCompanionStore implements CompanionStore {
    constructor(private readonly pool: Pool) {}

    async createAuthorizationRequest(
        input: CompanionAuthorizationInput & {
            id: string;
            userId: string;
            sessionId: string;
            csrfTokenHash: string;
            now: Date;
            expiresAt: Date;
        },
    ): Promise<void> {
        await withTransaction(this.pool, async (connection) => {
            await cleanupTransientRecords(connection, input.now);
            await connection.execute("DELETE FROM companionAuthorizationRequest WHERE userId = ? AND sessionId = ?", [
                input.userId,
                input.sessionId,
            ]);
            await connection.execute(
                `INSERT INTO companionAuthorizationRequest
                    (id, userId, sessionId, clientId, redirectUri, state, codeChallenge, codeChallengeMethod,
                     deviceName, platform, csrfTokenHash, createdAt, expiresAt, consumedAt)
                 VALUES (?, ?, ?, ?, ?, ?, ?, 'S256', ?, ?, ?, ?, ?, NULL)`,
                [
                    input.id,
                    input.userId,
                    input.sessionId,
                    input.clientId,
                    input.redirectUri,
                    input.state,
                    input.codeChallenge,
                    input.deviceName,
                    input.platform,
                    input.csrfTokenHash,
                    input.now,
                    input.expiresAt,
                ],
            );
        });
    }

    async consumeAuthorizationRequest(input: {
        id: string;
        userId: string;
        sessionId: string;
        csrfTokenHash: string;
        now: Date;
    }): Promise<AuthorizationRequestRecord | null> {
        return withTransaction(this.pool, async (connection) => {
            await cleanupTransientRecords(connection, input.now);
            const [rows] = await connection.execute<AuthorizationRequestRow[]>(
                `SELECT id, userId, sessionId, clientId, redirectUri, state, codeChallenge, codeChallengeMethod,
                        deviceName, platform, csrfTokenHash, expiresAt, consumedAt
                   FROM companionAuthorizationRequest
                  WHERE id = ? AND userId = ? AND sessionId = ?
                  LIMIT 1 FOR UPDATE`,
                [input.id, input.userId, input.sessionId],
            );
            const row = rows[0];
            if (
                !row ||
                row.consumedAt ||
                row.expiresAt.getTime() <= input.now.getTime() ||
                !safelyEqualHashes(row.csrfTokenHash, input.csrfTokenHash)
            ) {
                return null;
            }

            const [result] = await connection.execute<ResultSetHeader>(
                "UPDATE companionAuthorizationRequest SET consumedAt = ? WHERE id = ? AND consumedAt IS NULL",
                [input.now, row.id],
            );
            if (result.affectedRows !== 1) return null;

            return {
                id: row.id,
                userId: row.userId,
                sessionId: row.sessionId,
                clientId: "hanami-companion",
                redirectUri: row.redirectUri,
                state: row.state,
                codeChallenge: row.codeChallenge,
                codeChallengeMethod: "S256",
                deviceName: row.deviceName,
                platform: row.platform,
            };
        });
    }

    async createAuthorizationCode(input: AuthorizationRequestRecord & { codeHash: string; now: Date; expiresAt: Date }): Promise<void> {
        await withTransaction(this.pool, async (connection) => {
            await cleanupTransientRecords(connection, input.now);
            await connection.execute("DELETE FROM companionAuthorizationCode WHERE userId = ? AND clientId = ? AND usedAt IS NULL", [
                input.userId,
                input.clientId,
            ]);
            await connection.execute(
                `INSERT INTO companionAuthorizationCode
                (id, codeHash, userId, clientId, redirectUri, codeChallenge, codeChallengeMethod,
                 deviceName, platform, createdAt, expiresAt, usedAt)
             VALUES (?, ?, ?, ?, ?, ?, 'S256', ?, ?, ?, ?, NULL)`,
                [
                    crypto.randomUUID(),
                    input.codeHash,
                    input.userId,
                    input.clientId,
                    input.redirectUri,
                    input.codeChallenge,
                    input.deviceName,
                    input.platform,
                    input.now,
                    input.expiresAt,
                ],
            );
        });
    }

    async redeemAuthorizationCode(input: {
        codeHash: string;
        clientId: string;
        redirectUri: string;
        codeChallenge: string;
        deviceId: string;
        familyId: string;
        tokens: NewTokenSet;
        now: Date;
    }): Promise<boolean> {
        return withTransaction(this.pool, async (connection) => {
            await cleanupTransientRecords(connection, input.now);
            const [rows] = await connection.execute<AuthorizationCodeRow[]>(
                `SELECT id, codeHash, userId, clientId, redirectUri, codeChallenge, deviceName, platform, expiresAt, usedAt
                   FROM companionAuthorizationCode
                  WHERE codeHash = ?
                  LIMIT 1 FOR UPDATE`,
                [input.codeHash],
            );
            const code = rows[0];
            if (
                !code ||
                !safelyEqualHashes(code.codeHash, input.codeHash) ||
                code.usedAt ||
                code.expiresAt.getTime() <= input.now.getTime() ||
                code.clientId !== input.clientId ||
                code.redirectUri !== input.redirectUri ||
                !safelyEqualHashes(code.codeChallenge, input.codeChallenge)
            ) {
                return false;
            }

            const [consumeResult] = await connection.execute<ResultSetHeader>(
                "UPDATE companionAuthorizationCode SET usedAt = ? WHERE id = ? AND usedAt IS NULL",
                [input.now, code.id],
            );
            if (consumeResult.affectedRows !== 1) return false;

            let [deviceCounts] = await connection.execute<CountRow[]>("SELECT COUNT(*) AS count FROM companionDevice WHERE userId = ?", [
                code.userId,
            ]);
            if (Number(deviceCounts[0]?.count ?? 0) >= 50) {
                await connection.execute(
                    `DELETE FROM companionDevice
                      WHERE userId = ? AND revokedAt IS NOT NULL
                      ORDER BY revokedAt ASC
                      LIMIT 1`,
                    [code.userId],
                );
                [deviceCounts] = await connection.execute<CountRow[]>("SELECT COUNT(*) AS count FROM companionDevice WHERE userId = ?", [
                    code.userId,
                ]);
            }
            if (Number(deviceCounts[0]?.count ?? 0) >= 50) return false;

            await connection.execute(
                `INSERT INTO companionDevice (id, userId, displayName, platform, createdAt, lastUsedAt, revokedAt)
                 VALUES (?, ?, ?, ?, ?, ?, NULL)`,
                [input.deviceId, code.userId, code.deviceName, code.platform, input.now, input.now],
            );
            await connection.execute(
                `INSERT INTO companionTokenFamily (id, deviceId, userId, clientId, createdAt, lastUsedAt, revokedAt)
                 VALUES (?, ?, ?, ?, ?, ?, NULL)`,
                [input.familyId, input.deviceId, code.userId, code.clientId, input.now, input.now],
            );
            await insertAccessToken(connection, input.familyId, input.deviceId, code.userId, input.tokens, input.now);
            await insertRefreshToken(connection, input.familyId, input.tokens, input.now, null);
            return true;
        });
    }

    async rotateRefreshToken(input: {
        refreshTokenHash: string;
        clientId: string;
        tokens: NewTokenSet;
        now: Date;
    }): Promise<"rotated" | "invalid" | "reuse_detected"> {
        return withTransaction(this.pool, async (connection) => {
            await cleanupTransientRecords(connection, input.now);
            const [rows] = await connection.execute<RefreshTokenRow[]>(
                `SELECT refreshToken.id, refreshToken.tokenHash, refreshToken.familyId, refreshToken.expiresAt,
                        refreshToken.usedAt, refreshToken.revokedAt, tokenFamily.deviceId, tokenFamily.userId,
                        tokenFamily.clientId, tokenFamily.revokedAt AS familyRevokedAt
                   FROM companionRefreshToken AS refreshToken
                   JOIN companionTokenFamily AS tokenFamily ON tokenFamily.id = refreshToken.familyId
                  WHERE refreshToken.tokenHash = ?
                  LIMIT 1 FOR UPDATE`,
                [input.refreshTokenHash],
            );
            const token = rows[0];
            if (!token || !safelyEqualHashes(token.tokenHash, input.refreshTokenHash) || token.clientId !== input.clientId) {
                return "invalid";
            }
            if (token.usedAt) {
                await revokeFamily(connection, token.familyId, token.deviceId, input.now);
                return "reuse_detected";
            }
            if (token.revokedAt || token.familyRevokedAt || token.expiresAt.getTime() <= input.now.getTime()) return "invalid";

            await connection.execute(
                "UPDATE companionAccessToken SET revokedAt = COALESCE(revokedAt, ?) WHERE familyId = ? AND revokedAt IS NULL",
                [input.now, token.familyId],
            );
            await insertAccessToken(connection, token.familyId, token.deviceId, token.userId, input.tokens, input.now);
            await insertRefreshToken(connection, token.familyId, input.tokens, input.now, token.id);
            const [consumeResult] = await connection.execute<ResultSetHeader>(
                `UPDATE companionRefreshToken
                    SET usedAt = ?, replacedByTokenId = ?
                  WHERE id = ? AND usedAt IS NULL AND revokedAt IS NULL`,
                [input.now, input.tokens.refreshTokenId, token.id],
            );
            if (consumeResult.affectedRows !== 1) {
                await revokeFamily(connection, token.familyId, token.deviceId, input.now);
                return "reuse_detected";
            }
            await connection.execute("UPDATE companionTokenFamily SET lastUsedAt = ? WHERE id = ?", [input.now, token.familyId]);
            await connection.execute("UPDATE companionDevice SET lastUsedAt = ? WHERE id = ?", [input.now, token.deviceId]);
            return "rotated";
        });
    }

    async revokeByTokenHash(input: { tokenHash: string; clientId: string; now: Date }): Promise<void> {
        await withTransaction(this.pool, async (connection) => {
            const [refreshRows] = await connection.execute<FamilyLookupRow[]>(
                `SELECT tokenFamily.id AS familyId
                   FROM companionRefreshToken AS token
                   JOIN companionTokenFamily AS tokenFamily ON tokenFamily.id = token.familyId
                  WHERE token.tokenHash = ? AND tokenFamily.clientId = ?
                  LIMIT 1 FOR UPDATE`,
                [input.tokenHash, input.clientId],
            );
            let familyId = refreshRows[0]?.familyId;
            if (!familyId) {
                const [accessRows] = await connection.execute<FamilyLookupRow[]>(
                    `SELECT tokenFamily.id AS familyId
                       FROM companionAccessToken AS token
                       JOIN companionTokenFamily AS tokenFamily ON tokenFamily.id = token.familyId
                      WHERE token.tokenHash = ? AND tokenFamily.clientId = ?
                      LIMIT 1 FOR UPDATE`,
                    [input.tokenHash, input.clientId],
                );
                familyId = accessRows[0]?.familyId;
            }
            if (!familyId) return;

            const [deviceRows] = await connection.execute<RowDataPacket[]>(
                "SELECT deviceId FROM companionTokenFamily WHERE id = ? LIMIT 1 FOR UPDATE",
                [familyId],
            );
            const deviceId = typeof deviceRows[0]?.deviceId === "string" ? deviceRows[0].deviceId : null;
            if (deviceId) await revokeFamily(connection, familyId, deviceId, input.now);
        });
    }

    async listDevices(userId: string): Promise<CompanionDeviceMetadata[]> {
        const [rows] = await this.pool.execute<DeviceRow[]>(
            `SELECT id, displayName, platform, createdAt, lastUsedAt, revokedAt
               FROM companionDevice
              WHERE userId = ?
              ORDER BY createdAt DESC`,
            [userId],
        );
        return rows.map((row) => ({ ...row }));
    }

    async revokeDevice(input: { userId: string; deviceId: string; now: Date }): Promise<boolean> {
        return withTransaction(this.pool, async (connection) => {
            const [rows] = await connection.execute<RowDataPacket[]>(
                "SELECT id FROM companionDevice WHERE id = ? AND userId = ? LIMIT 1 FOR UPDATE",
                [input.deviceId, input.userId],
            );
            if (!rows[0]) return false;

            const [families] = await connection.execute<FamilyLookupRow[]>(
                "SELECT id AS familyId FROM companionTokenFamily WHERE deviceId = ? AND userId = ? FOR UPDATE",
                [input.deviceId, input.userId],
            );
            for (const family of families) await revokeFamily(connection, family.familyId, input.deviceId, input.now);
            await connection.execute("UPDATE companionDevice SET revokedAt = COALESCE(revokedAt, ?) WHERE id = ?", [
                input.now,
                input.deviceId,
            ]);
            return true;
        });
    }
}

async function insertAccessToken(
    connection: PoolConnection,
    familyId: string,
    deviceId: string,
    userId: string,
    tokens: NewTokenSet,
    now: Date,
): Promise<void> {
    await connection.execute(
        `INSERT INTO companionAccessToken
            (id, tokenHash, familyId, deviceId, userId, createdAt, expiresAt, lastUsedAt, revokedAt)
         VALUES (?, ?, ?, ?, ?, ?, ?, NULL, NULL)`,
        [tokens.accessTokenId, tokens.accessTokenHash, familyId, deviceId, userId, now, tokens.accessTokenExpiresAt],
    );
}

async function insertRefreshToken(
    connection: PoolConnection,
    familyId: string,
    tokens: NewTokenSet,
    now: Date,
    parentTokenId: string | null,
): Promise<void> {
    await connection.execute(
        `INSERT INTO companionRefreshToken
            (id, tokenHash, familyId, parentTokenId, replacedByTokenId, createdAt, expiresAt, usedAt, revokedAt)
         VALUES (?, ?, ?, ?, NULL, ?, ?, NULL, NULL)`,
        [tokens.refreshTokenId, tokens.refreshTokenHash, familyId, parentTokenId, now, tokens.refreshTokenExpiresAt],
    );
}

async function revokeFamily(connection: PoolConnection, familyId: string, deviceId: string, now: Date): Promise<void> {
    await connection.execute("UPDATE companionTokenFamily SET revokedAt = COALESCE(revokedAt, ?) WHERE id = ?", [now, familyId]);
    await connection.execute("UPDATE companionAccessToken SET revokedAt = COALESCE(revokedAt, ?) WHERE familyId = ?", [now, familyId]);
    await connection.execute("UPDATE companionRefreshToken SET revokedAt = COALESCE(revokedAt, ?) WHERE familyId = ?", [now, familyId]);
    await connection.execute("UPDATE companionDevice SET revokedAt = COALESCE(revokedAt, ?) WHERE id = ?", [now, deviceId]);
}

async function cleanupTransientRecords(connection: PoolConnection, now: Date): Promise<void> {
    await connection.execute("DELETE FROM companionAuthorizationRequest WHERE expiresAt <= ? OR consumedAt IS NOT NULL LIMIT 1000", [now]);
    await connection.execute("DELETE FROM companionAuthorizationCode WHERE expiresAt <= ? OR usedAt IS NOT NULL LIMIT 1000", [now]);
    await connection.execute("DELETE FROM companionAccessToken WHERE expiresAt <= ? LIMIT 1000", [now]);
    await connection.execute("DELETE FROM companionRefreshToken WHERE expiresAt <= ? LIMIT 1000", [now]);
}

async function withTransaction<T>(pool: Pool, callback: (connection: PoolConnection) => Promise<T>): Promise<T> {
    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();
        const result = await callback(connection);
        await connection.commit();
        return result;
    } catch (error) {
        await connection.rollback();
        throw error;
    } finally {
        connection.release();
    }
}
