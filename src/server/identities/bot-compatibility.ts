import mysql, { type Pool, type PoolConnection, type RowDataPacket } from "mysql2/promise";

import type { UserIdentity } from "./model";

type BotSyncOperation = "set_osu" | "clear_osu" | "delete_user";

interface IdentitySubjectRow extends RowDataPacket {
    providerUserId: string;
}

interface PendingSyncRow extends RowDataPacket {
    id: string;
    operation: BotSyncOperation;
    discordProviderUserId: string;
    osuProviderUserId: string | null;
}

interface LockRow extends RowDataPacket {
    acquired: number | string | null;
}

export class BotCompatibilitySyncError extends Error {
    readonly code = "bot_sync_pending";

    constructor() {
        super("Temporary Bot identity synchronization is pending");
        this.name = "BotCompatibilitySyncError";
    }
}

/**
 * Temporary compatibility bridge. Remove this adapter and its queue after Bot
 * stores `hanami_user_id` and resolves identities from Hanami Web.
 */
export class TemporaryBotIdentityCompatibility {
    constructor(
        private readonly webPool: Pool,
        private readonly getBotDatabaseUrl: () => string | undefined = () => process.env.BOT_DATABASE_URL,
    ) {}

    async identityLinked(connection: PoolConnection, identity: UserIdentity): Promise<void> {
        if (identity.provider !== "discord" && identity.provider !== "osu") return;
        const pair = await getProviderPair(connection, identity.userId);
        if (!pair.discord || !pair.osu) return;
        await enqueue(connection, identity.userId, "set_osu", pair.discord, pair.osu);
    }

    async identityUnlinked(connection: PoolConnection, identity: UserIdentity): Promise<void> {
        if (identity.provider !== "osu") return;
        const [discordRows] = await connection.execute<IdentitySubjectRow[]>(
            "SELECT providerUserId FROM userIdentity WHERE userId = ? AND provider = 'discord' LIMIT 1",
            [identity.userId],
        );
        const discordProviderUserId = discordRows[0]?.providerUserId;
        if (!discordProviderUserId) return;
        await enqueue(connection, identity.userId, "clear_osu", discordProviderUserId, identity.providerUserId);
    }

    async accountDeleted(connection: PoolConnection, userId: string, discordProviderUserId: string): Promise<void> {
        await enqueue(connection, userId, "delete_user", discordProviderUserId, null);
    }

    async flushPendingForUser(userId: string): Promise<{ pending: boolean }> {
        const connection = await this.webPool.getConnection();
        const lockName = `hanami-bot-identity-sync:${userId}`;
        let lockAcquired = false;

        try {
            const [lockRows] = await connection.execute<LockRow[]>("SELECT GET_LOCK(?, 5) AS acquired", [lockName]);
            lockAcquired = Number(lockRows[0]?.acquired) === 1;
            if (!lockAcquired) return { pending: true };

            const [rows] = await connection.execute<PendingSyncRow[]>(
                `SELECT id, operation, discordProviderUserId, osuProviderUserId
                   FROM botIdentitySync
                  WHERE userId = ? AND completedAt IS NULL
                  ORDER BY updatedAt, createdAt, id`,
                [userId],
            );
            if (rows.length === 0) return { pending: false };

            const databaseUrl = this.getBotDatabaseUrl();
            if (!databaseUrl) {
                await markFailed(connection, rows, "configuration_missing");
                throw new BotCompatibilitySyncError();
            }

            let botConnection: Awaited<ReturnType<typeof mysql.createConnection>> | null = null;
            try {
                botConnection = await mysql.createConnection(databaseUrl);
                for (const row of rows) {
                    await applyBotOperation(botConnection, row);
                    await connection.execute(
                        `UPDATE botIdentitySync
                            SET completedAt = CURRENT_TIMESTAMP(3),
                                attemptedAt = CURRENT_TIMESTAMP(3),
                                attemptCount = attemptCount + 1,
                                lastErrorCode = NULL
                          WHERE id = ?`,
                        [row.id],
                    );
                }
            } catch (error) {
                await markFailed(connection, rows, readErrorCode(error));
                throw new BotCompatibilitySyncError();
            } finally {
                await botConnection?.end();
            }

            return { pending: false };
        } finally {
            if (lockAcquired) await connection.execute("SELECT RELEASE_LOCK(?)", [lockName]).catch(() => undefined);
            connection.release();
        }
    }

    async hasPendingForUser(userId: string): Promise<boolean> {
        const [rows] = await this.webPool.execute<RowDataPacket[]>(
            "SELECT id FROM botIdentitySync WHERE userId = ? AND completedAt IS NULL LIMIT 1",
            [userId],
        );
        return rows.length > 0;
    }

    async flushPending(limit = 100): Promise<number> {
        const [rows] = await this.webPool.execute<Array<RowDataPacket & { userId: string }>>(
            `SELECT DISTINCT userId
               FROM botIdentitySync
              WHERE completedAt IS NULL
              ORDER BY updatedAt
              LIMIT ?`,
            [limit],
        );
        let completedUsers = 0;
        for (const row of rows) {
            try {
                const result = await this.flushPendingForUser(row.userId);
                if (!result.pending) completedUsers += 1;
            } catch {
                // Each record keeps its retry state; another user can still sync.
            }
        }
        return completedUsers;
    }
}

async function getProviderPair(connection: PoolConnection, userId: string): Promise<{ discord: string | null; osu: string | null }> {
    const [rows] = await connection.execute<Array<IdentitySubjectRow & { provider: string }>>(
        "SELECT provider, providerUserId FROM userIdentity WHERE userId = ? AND provider IN ('discord', 'osu')",
        [userId],
    );
    return {
        discord: rows.find((row) => row.provider === "discord")?.providerUserId ?? null,
        osu: rows.find((row) => row.provider === "osu")?.providerUserId ?? null,
    };
}

async function enqueue(
    connection: PoolConnection,
    userId: string,
    operation: BotSyncOperation,
    discordProviderUserId: string,
    osuProviderUserId: string | null,
): Promise<void> {
    const dedupeKey = `${operation}:${discordProviderUserId}:${osuProviderUserId ?? "-"}`;
    const now = new Date();
    await connection.execute(
        `INSERT INTO botIdentitySync
            (id, userId, dedupeKey, operation, discordProviderUserId, osuProviderUserId,
             createdAt, updatedAt, attemptedAt, completedAt, attemptCount, lastErrorCode)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, NULL, NULL, 0, NULL)
         ON DUPLICATE KEY UPDATE
             userId = VALUES(userId),
             updatedAt = VALUES(updatedAt),
             attemptedAt = NULL,
             completedAt = NULL,
             attemptCount = 0,
             lastErrorCode = NULL`,
        [crypto.randomUUID(), userId, dedupeKey, operation, discordProviderUserId, osuProviderUserId, now, now],
    );
}

async function applyBotOperation(connection: Awaited<ReturnType<typeof mysql.createConnection>>, sync: PendingSyncRow): Promise<void> {
    switch (sync.operation) {
        case "set_osu":
            if (!sync.osuProviderUserId) throw new Error("Missing osu! subject for Bot synchronization");
            await connection.execute(
                `INSERT INTO users (id, banchoId)
                 VALUES (?, ?)
                 ON DUPLICATE KEY UPDATE banchoId = VALUES(banchoId)`,
                [sync.discordProviderUserId, sync.osuProviderUserId],
            );
            return;
        case "clear_osu":
            if (!sync.osuProviderUserId) throw new Error("Missing osu! subject for Bot synchronization");
            await connection.execute("UPDATE users SET banchoId = NULL WHERE id = ? AND banchoId = ?", [
                sync.discordProviderUserId,
                sync.osuProviderUserId,
            ]);
            return;
        case "delete_user":
            await connection.execute("DELETE FROM users WHERE id = ?", [sync.discordProviderUserId]);
    }
}

async function markFailed(connection: PoolConnection, rows: PendingSyncRow[], code: string): Promise<void> {
    for (const row of rows) {
        await connection.execute(
            `UPDATE botIdentitySync
                SET attemptedAt = CURRENT_TIMESTAMP(3),
                    attemptCount = attemptCount + 1,
                    lastErrorCode = ?
              WHERE id = ?`,
            [code.slice(0, 80), row.id],
        );
    }
}

function readErrorCode(error: unknown): string {
    if (typeof error === "object" && error !== null && "code" in error && typeof error.code === "string") {
        return error.code;
    }
    return "sync_failed";
}
