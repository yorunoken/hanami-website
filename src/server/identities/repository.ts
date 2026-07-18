import type { Pool, PoolConnection, ResultSetHeader, RowDataPacket } from "mysql2/promise";

import type { TemporaryBotIdentityCompatibility } from "./bot-compatibility";
import {
    IdentityConflictError,
    type LinkIdentityInput,
    normalizeIdentityInput,
    type SupportedIdentityProvider,
    type UserIdentity,
} from "./model";

interface IdentityRow extends RowDataPacket {
    id: string;
    userId: string;
    provider: SupportedIdentityProvider;
    providerUserId: string;
    username: string | null;
    displayName: string | null;
    avatarUrl: string | null;
    metadata: string | Record<string, unknown> | null;
    linkedAt: Date;
    updatedAt: Date;
}

interface UserRow extends RowDataPacket {
    id: string;
    name: string;
    image: string | null;
    createdAt: Date;
    updatedAt: Date;
}

export interface CanonicalUser {
    id: string;
    name: string;
    image: string | null;
    createdAt: Date;
    updatedAt: Date;
}

export class UserIdentityRepository {
    constructor(
        private readonly pool: Pool,
        private readonly botCompatibility?: TemporaryBotIdentityCompatibility,
    ) {}

    async getUserByCanonicalId(userId: string): Promise<CanonicalUser | null> {
        const [rows] = await this.pool.execute<UserRow[]>("SELECT id, name, image, createdAt, updatedAt FROM user WHERE id = ? LIMIT 1", [
            userId,
        ]);
        return rows[0] ?? null;
    }

    async getIdentity(provider: SupportedIdentityProvider, providerUserId: string): Promise<UserIdentity | null> {
        const normalized = normalizeIdentityInput({ provider, providerUserId });
        const [rows] = await this.pool.execute<IdentityRow[]>(
            `SELECT id, userId, provider, providerUserId, username, displayName, avatarUrl, metadata, linkedAt, updatedAt
               FROM userIdentity
              WHERE provider = ? AND providerUserId = ?
              LIMIT 1`,
            [normalized.provider, normalized.providerUserId],
        );
        return rows[0] ? mapIdentity(rows[0]) : null;
    }

    async getUserIdentities(userId: string): Promise<UserIdentity[]> {
        const [rows] = await this.pool.execute<IdentityRow[]>(
            `SELECT id, userId, provider, providerUserId, username, displayName, avatarUrl, metadata, linkedAt, updatedAt
               FROM userIdentity
              WHERE userId = ?
              ORDER BY FIELD(provider, 'discord', 'osu'), linkedAt`,
            [userId],
        );
        return rows.map(mapIdentity);
    }

    async getPrimaryOsuIdentity(userId: string): Promise<UserIdentity | null> {
        const [rows] = await this.pool.execute<IdentityRow[]>(
            `SELECT id, userId, provider, providerUserId, username, displayName, avatarUrl, metadata, linkedAt, updatedAt
               FROM userIdentity
              WHERE userId = ? AND provider = 'osu'
              LIMIT 1`,
            [userId],
        );
        return rows[0] ? mapIdentity(rows[0]) : null;
    }

    async linkIdentity(userId: string, input: LinkIdentityInput, now = new Date()): Promise<UserIdentity> {
        const normalized = normalizeIdentityInput(input);
        return withTransaction(this.pool, async (connection) => {
            const [subjectRows] = await connection.execute<IdentityRow[]>(
                `SELECT id, userId, provider, providerUserId, username, displayName, avatarUrl, metadata, linkedAt, updatedAt
                   FROM userIdentity
                  WHERE provider = ? AND providerUserId = ?
                  LIMIT 1
                  FOR UPDATE`,
                [normalized.provider, normalized.providerUserId],
            );
            const subjectIdentity = subjectRows[0];
            if (subjectIdentity && subjectIdentity.userId !== userId) throw new IdentityConflictError("provider_owned");

            const [slotRows] = await connection.execute<IdentityRow[]>(
                `SELECT id, userId, provider, providerUserId, username, displayName, avatarUrl, metadata, linkedAt, updatedAt
                   FROM userIdentity
                  WHERE userId = ? AND provider = ?
                  LIMIT 1
                  FOR UPDATE`,
                [userId, normalized.provider],
            );
            const slotIdentity = slotRows[0];
            if (slotIdentity && slotIdentity.providerUserId !== normalized.providerUserId) {
                throw new IdentityConflictError("provider_slot_occupied");
            }

            const id = subjectIdentity?.id ?? slotIdentity?.id ?? crypto.randomUUID();
            const linkedAt = subjectIdentity?.linkedAt ?? slotIdentity?.linkedAt ?? now;
            await connection.execute(
                `INSERT INTO userIdentity
                    (id, userId, provider, providerUserId, username, displayName, avatarUrl, metadata, linkedAt, updatedAt)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                 ON DUPLICATE KEY UPDATE
                    username = VALUES(username),
                    displayName = VALUES(displayName),
                    avatarUrl = VALUES(avatarUrl),
                    metadata = VALUES(metadata),
                    updatedAt = VALUES(updatedAt)`,
                [
                    id,
                    userId,
                    normalized.provider,
                    normalized.providerUserId,
                    normalized.username,
                    normalized.displayName,
                    normalized.avatarUrl,
                    normalized.metadata ? JSON.stringify(normalized.metadata) : null,
                    linkedAt,
                    now,
                ],
            );

            const identity: UserIdentity = {
                id,
                userId,
                ...normalized,
                linkedAt,
                updatedAt: now,
            };
            await this.botCompatibility?.identityLinked(connection, identity);
            return identity;
        });
    }

    async unlinkIdentity(userId: string, provider: SupportedIdentityProvider): Promise<UserIdentity | null> {
        return withTransaction(this.pool, async (connection) => {
            const [rows] = await connection.execute<IdentityRow[]>(
                `SELECT id, userId, provider, providerUserId, username, displayName, avatarUrl, metadata, linkedAt, updatedAt
                   FROM userIdentity
                  WHERE userId = ? AND provider = ?
                  LIMIT 1
                  FOR UPDATE`,
                [userId, provider],
            );
            const row = rows[0];
            if (!row) return null;

            const identity = mapIdentity(row);
            const [result] = await connection.execute<ResultSetHeader>("DELETE FROM userIdentity WHERE id = ?", [identity.id]);
            if (result.affectedRows !== 1) return null;
            await this.botCompatibility?.identityUnlinked(connection, identity);
            return identity;
        });
    }

    async assertProviderSlotAvailable(userId: string, provider: SupportedIdentityProvider, providerUserId: string): Promise<void> {
        const normalized = normalizeIdentityInput({ provider, providerUserId });
        const [rows] = await this.pool.execute<IdentityRow[]>(
            "SELECT userId, providerUserId FROM userIdentity WHERE userId = ? AND provider = ? LIMIT 1",
            [userId, provider],
        );
        const identity = rows[0];
        if (identity && identity.providerUserId !== normalized.providerUserId) {
            throw new IdentityConflictError("provider_slot_occupied");
        }
    }
}

function mapIdentity(row: IdentityRow): UserIdentity {
    return {
        id: row.id,
        userId: row.userId,
        provider: row.provider,
        providerUserId: row.providerUserId,
        username: row.username,
        displayName: row.displayName,
        avatarUrl: row.avatarUrl,
        metadata: parseMetadata(row.metadata),
        linkedAt: new Date(row.linkedAt),
        updatedAt: new Date(row.updatedAt),
    };
}

function parseMetadata(value: IdentityRow["metadata"]): Record<string, unknown> | null {
    if (!value) return null;
    if (typeof value === "object") return value;
    try {
        const parsed: unknown = JSON.parse(value);
        return typeof parsed === "object" && parsed !== null ? (parsed as Record<string, unknown>) : null;
    } catch {
        return null;
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
