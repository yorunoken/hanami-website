import type { Pool, PoolConnection, ResultSetHeader, RowDataPacket } from "mysql2/promise";

import type { TemporaryBotIdentityCompatibility } from "../identities/bot-compatibility";
import { REAUTHENTICATION_WINDOW_MS } from "./domain";

export type AccountDeletionFailureCode = "account_not_found" | "challenge_invalid" | "challenge_stale" | "service_unavailable";

export class AccountDeletionStoreError extends Error {
    constructor(public readonly code: AccountDeletionFailureCode) {
        super(code);
        this.name = "AccountDeletionStoreError";
    }
}

export interface AccountDeletionStore {
    startReauthentication(input: { userId: string; tokenHash: string; now: Date; alreadyFresh: boolean }): Promise<void>;
    completeReauthentication(input: { userId: string; tokenHash: string; sessionCreatedAt: Date; now: Date }): Promise<Date>;
    deleteAccount(input: { userId: string; tokenHash: string; now: Date }): Promise<{ syncPending: boolean }>;
}

interface ChallengeRow extends RowDataPacket {
    id: string;
    userId: string;
    createdAt: Date;
    expiresAt: Date;
    reauthenticatedAt: Date | null;
    consumedAt: Date | null;
}

interface IdentityRow extends RowDataPacket {
    providerUserId: string;
}

export class MySqlAccountDeletionStore implements AccountDeletionStore {
    constructor(
        private readonly pool: Pool,
        private readonly botCompatibility: Pick<
            TemporaryBotIdentityCompatibility,
            "accountDeleted" | "flushPendingForUser" | "hasPendingForUser"
        >,
    ) {}

    async startReauthentication(input: { userId: string; tokenHash: string; now: Date; alreadyFresh: boolean }): Promise<void> {
        const expiresAt = new Date(input.now.getTime() + REAUTHENTICATION_WINDOW_MS);
        const reauthenticatedAt = input.alreadyFresh ? input.now : null;

        await this.pool.execute(
            `INSERT INTO accountDeletionReauthChallenge
         (id, userId, tokenHash, createdAt, expiresAt, reauthenticatedAt, consumedAt)
       VALUES (?, ?, ?, ?, ?, ?, NULL)
       ON DUPLICATE KEY UPDATE
         id = VALUES(id),
         tokenHash = VALUES(tokenHash),
         createdAt = VALUES(createdAt),
         expiresAt = VALUES(expiresAt),
         reauthenticatedAt = VALUES(reauthenticatedAt),
         consumedAt = NULL`,
            [crypto.randomUUID(), input.userId, input.tokenHash, input.now, expiresAt, reauthenticatedAt],
        );
    }

    async completeReauthentication(input: { userId: string; tokenHash: string; sessionCreatedAt: Date; now: Date }): Promise<Date> {
        return withTransaction(this.pool, async (connection) => {
            const challenge = await getChallengeForUpdate(connection, input.userId, input.tokenHash);
            assertChallengeUsable(challenge, input.now);

            if (challenge.reauthenticatedAt) return challenge.reauthenticatedAt;
            if (input.sessionCreatedAt.getTime() < challenge.createdAt.getTime() - 5_000) {
                throw new AccountDeletionStoreError("challenge_stale");
            }

            const [result] = await connection.execute<ResultSetHeader>(
                `UPDATE accountDeletionReauthChallenge
            SET reauthenticatedAt = ?
          WHERE id = ? AND reauthenticatedAt IS NULL AND consumedAt IS NULL`,
                [input.now, challenge.id],
            );
            if (result.affectedRows !== 1) throw new AccountDeletionStoreError("challenge_invalid");
            return input.now;
        });
    }

    async deleteAccount(input: { userId: string; tokenHash: string; now: Date }): Promise<{ syncPending: boolean }> {
        let discordProviderUserId: string | null = null;
        await withTransaction(this.pool, async (connection) => {
            const challenge = await getChallengeForUpdate(connection, input.userId, input.tokenHash);
            assertChallengeUsable(challenge, input.now);
            if (!challenge.reauthenticatedAt || input.now.getTime() - challenge.reauthenticatedAt.getTime() >= REAUTHENTICATION_WINDOW_MS) {
                throw new AccountDeletionStoreError("challenge_stale");
            }

            const [identityRows] = await connection.execute<IdentityRow[]>(
                "SELECT providerUserId FROM userIdentity WHERE userId = ? AND provider = 'discord' LIMIT 1 FOR UPDATE",
                [input.userId],
            );
            discordProviderUserId = identityRows[0]?.providerUserId ?? null;
            if (discordProviderUserId) {
                await this.botCompatibility.accountDeleted(connection, input.userId, discordProviderUserId);
            }

            await deleteLegacyRequestRecords(connection, input.userId);

            const [result] = await connection.execute<ResultSetHeader>("DELETE FROM user WHERE id = ?", [input.userId]);
            if (result.affectedRows !== 1) throw new AccountDeletionStoreError("account_not_found");
        });

        if (!discordProviderUserId) return { syncPending: false };
        await this.botCompatibility.flushPendingForUser(input.userId).catch(() => undefined);
        return { syncPending: await this.botCompatibility.hasPendingForUser(input.userId) };
    }
}

async function getChallengeForUpdate(connection: PoolConnection, userId: string, tokenHash: string): Promise<ChallengeRow> {
    const [rows] = await connection.execute<ChallengeRow[]>(
        `SELECT id, userId, createdAt, expiresAt, reauthenticatedAt, consumedAt
       FROM accountDeletionReauthChallenge
      WHERE userId = ? AND tokenHash = ?
      LIMIT 1
      FOR UPDATE`,
        [userId, tokenHash],
    );
    if (!rows[0]) throw new AccountDeletionStoreError("challenge_invalid");
    return rows[0];
}

function assertChallengeUsable(challenge: ChallengeRow, now: Date): void {
    if (challenge.consumedAt) throw new AccountDeletionStoreError("challenge_invalid");
    if (challenge.expiresAt.getTime() <= now.getTime()) throw new AccountDeletionStoreError("challenge_stale");
}

async function deleteLegacyRequestRecords(connection: PoolConnection, userId: string): Promise<void> {
    try {
        await connection.execute("DELETE FROM accountDeletionRequest WHERE userId = ?", [userId]);
    } catch (error) {
        if (!isMissingTableError(error)) throw error;
    }
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

function isMissingTableError(error: unknown): boolean {
    return typeof error === "object" && error !== null && "errno" in error && error.errno === 1146;
}
