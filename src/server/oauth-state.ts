import type { Pool, ResultSetHeader, RowDataPacket } from "mysql2/promise";

import { createSecureToken, hashToken, isSecureToken, safelyEqualHashes } from "./security/tokens";

export const OSU_OAUTH_STATE_LIFETIME_MS = 10 * 60 * 1_000;

export interface OAuthStateBinding {
    userId: string;
    sessionId: string;
}

export interface OAuthStateStore {
    create(input: OAuthStateBinding & { stateHash: string; createdAt: Date; expiresAt: Date }): Promise<void>;
    consume(input: OAuthStateBinding & { stateHash: string; now: Date }): Promise<boolean>;
}

interface OAuthStateRow extends RowDataPacket {
    id: string;
    stateHash: string;
}

export class MySqlOAuthStateStore implements OAuthStateStore {
    constructor(private readonly pool: Pool) {}

    async create(input: OAuthStateBinding & { stateHash: string; createdAt: Date; expiresAt: Date }): Promise<void> {
        const connection = await this.pool.getConnection();
        try {
            await connection.beginTransaction();
            await cleanupExpiredStates(connection, input.createdAt);
            await connection.execute(
                `DELETE FROM osuOAuthState
                  WHERE userId = ? AND sessionId = ?`,
                [input.userId, input.sessionId],
            );
            await connection.execute(
                `INSERT INTO osuOAuthState
                (id, stateHash, userId, sessionId, createdAt, expiresAt, consumedAt)
             VALUES (?, ?, ?, ?, ?, ?, NULL)`,
                [crypto.randomUUID(), input.stateHash, input.userId, input.sessionId, input.createdAt, input.expiresAt],
            );
            await connection.commit();
        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
    }

    async consume(input: OAuthStateBinding & { stateHash: string; now: Date }): Promise<boolean> {
        const connection = await this.pool.getConnection();
        try {
            await connection.beginTransaction();
            await cleanupExpiredStates(connection, input.now);
            const [states] = await connection.execute<OAuthStateRow[]>(
                `SELECT id, stateHash
                   FROM osuOAuthState
                  WHERE userId = ?
                    AND sessionId = ?
                    AND consumedAt IS NULL
                    AND expiresAt > ?
                  FOR UPDATE`,
                [input.userId, input.sessionId, input.now],
            );
            const state = states.find((candidate) => safelyEqualHashes(candidate.stateHash, input.stateHash));
            if (!state) {
                await connection.rollback();
                return false;
            }

            const [result] = await connection.execute<ResultSetHeader>(
                `UPDATE osuOAuthState
                    SET consumedAt = ?
                  WHERE id = ?
                    AND consumedAt IS NULL
                    AND expiresAt > ?`,
                [input.now, state.id, input.now],
            );
            if (result.affectedRows !== 1) {
                await connection.rollback();
                return false;
            }

            await connection.commit();
            return true;
        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
    }
}

async function cleanupExpiredStates(connection: { execute: Pool["execute"] }, now: Date): Promise<void> {
    await connection.execute(
        `DELETE FROM osuOAuthState
          WHERE expiresAt <= ? OR consumedAt IS NOT NULL
          LIMIT 1000`,
        [now],
    );
}

export async function createOAuthState(store: OAuthStateStore, binding: OAuthStateBinding, now = new Date()): Promise<string> {
    const state = createSecureToken();
    await store.create({
        ...binding,
        stateHash: await hashToken(state),
        createdAt: now,
        expiresAt: new Date(now.getTime() + OSU_OAUTH_STATE_LIFETIME_MS),
    });
    return state;
}

export async function consumeOAuthState(
    store: OAuthStateStore,
    state: unknown,
    binding: OAuthStateBinding,
    now = new Date(),
): Promise<boolean> {
    if (!isSecureToken(state)) return false;
    return store.consume({ ...binding, stateHash: await hashToken(state), now });
}
