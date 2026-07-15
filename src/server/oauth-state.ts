import type { Pool, ResultSetHeader } from "mysql2/promise";

import { createSecureToken, hashToken, isSecureToken } from "./security/tokens";

export const OSU_OAUTH_STATE_LIFETIME_MS = 10 * 60 * 1_000;

export interface OAuthStateBinding {
    userId: string;
    sessionId: string;
}

export interface OAuthStateStore {
    create(input: OAuthStateBinding & { stateHash: string; createdAt: Date; expiresAt: Date }): Promise<void>;
    consume(input: OAuthStateBinding & { stateHash: string; now: Date }): Promise<boolean>;
}

export class MySqlOAuthStateStore implements OAuthStateStore {
    constructor(private readonly pool: Pool) {}

    async create(input: OAuthStateBinding & { stateHash: string; createdAt: Date; expiresAt: Date }): Promise<void> {
        await this.pool.execute(
            `INSERT INTO osuOAuthState
                (id, stateHash, userId, sessionId, createdAt, expiresAt, consumedAt)
             VALUES (?, ?, ?, ?, ?, ?, NULL)`,
            [crypto.randomUUID(), input.stateHash, input.userId, input.sessionId, input.createdAt, input.expiresAt],
        );
    }

    async consume(input: OAuthStateBinding & { stateHash: string; now: Date }): Promise<boolean> {
        const connection = await this.pool.getConnection();
        try {
            await connection.beginTransaction();
            const [result] = await connection.execute<ResultSetHeader>(
                `UPDATE osuOAuthState
                    SET consumedAt = ?
                  WHERE stateHash = ?
                    AND userId = ?
                    AND sessionId = ?
                    AND consumedAt IS NULL
                    AND expiresAt > ?`,
                [input.now, input.stateHash, input.userId, input.sessionId, input.now],
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
