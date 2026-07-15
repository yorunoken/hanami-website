import type { Pool, PoolConnection, ResultSetHeader, RowDataPacket } from "mysql2/promise";

import type { DiscordLinkRequest } from "./validation";

export const DISCORD_LINK_TICKET_LIFETIME_MS = 5 * 60 * 1_000;

export interface DiscordLinkTicket extends DiscordLinkRequest {
    id: string;
    createdAt: Date;
    expiresAt: Date;
}

export interface DiscordLinkTicketStore {
    issue(input: DiscordLinkRequest & { tokenHash: string; now: Date }): Promise<DiscordLinkTicket>;
    consume(tokenHash: string, now: Date): Promise<DiscordLinkTicket | null>;
}

interface TicketRow extends RowDataPacket, DiscordLinkTicket {}

interface LockRow extends RowDataPacket {
    acquired: number | string | null;
}

export class MySqlDiscordLinkTicketStore implements DiscordLinkTicketStore {
    constructor(private readonly pool: Pool) {}

    async issue(input: DiscordLinkRequest & { tokenHash: string; now: Date }): Promise<DiscordLinkTicket> {
        const connection = await this.pool.getConnection();
        const lockName = `hanami-discord-link:${input.discordUserId}`;
        let lockAcquired = false;

        try {
            const [lockRows] = await connection.execute<LockRow[]>("SELECT GET_LOCK(?, 5) AS acquired", [lockName]);
            lockAcquired = Number(lockRows[0]?.acquired) === 1;
            if (!lockAcquired) throw new Error("Could not acquire the Discord link issuance lock");

            await connection.beginTransaction();
            await connection.execute(
                `UPDATE discordLinkTicket
                    SET invalidatedAt = ?
                  WHERE discordUserId = ?
                    AND consumedAt IS NULL
                    AND invalidatedAt IS NULL`,
                [input.now, input.discordUserId],
            );

            const ticket: DiscordLinkTicket = {
                id: crypto.randomUUID(),
                discordUserId: input.discordUserId,
                username: input.username,
                displayName: input.displayName,
                avatarUrl: input.avatarUrl,
                createdAt: input.now,
                expiresAt: new Date(input.now.getTime() + DISCORD_LINK_TICKET_LIFETIME_MS),
            };

            await connection.execute(
                `INSERT INTO discordLinkTicket
                    (id, tokenHash, discordUserId, username, displayName, avatarUrl, createdAt, expiresAt, consumedAt, invalidatedAt)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, NULL, NULL)`,
                [
                    ticket.id,
                    input.tokenHash,
                    ticket.discordUserId,
                    ticket.username,
                    ticket.displayName,
                    ticket.avatarUrl,
                    ticket.createdAt,
                    ticket.expiresAt,
                ],
            );
            await connection.commit();
            return ticket;
        } catch (error) {
            await connection.rollback().catch(() => undefined);
            throw error;
        } finally {
            if (lockAcquired) await connection.execute("SELECT RELEASE_LOCK(?)", [lockName]).catch(() => undefined);
            connection.release();
        }
    }

    async consume(tokenHash: string, now: Date): Promise<DiscordLinkTicket | null> {
        return withTransaction(this.pool, async (connection) => {
            const [result] = await connection.execute<ResultSetHeader>(
                `UPDATE discordLinkTicket
                    SET consumedAt = ?
                  WHERE tokenHash = ?
                    AND consumedAt IS NULL
                    AND invalidatedAt IS NULL
                    AND expiresAt > ?`,
                [now, tokenHash, now],
            );
            if (result.affectedRows !== 1) return null;

            const [rows] = await connection.execute<TicketRow[]>(
                `SELECT id, discordUserId, username, displayName, avatarUrl, createdAt, expiresAt
                   FROM discordLinkTicket
                  WHERE tokenHash = ?
                  LIMIT 1`,
                [tokenHash],
            );
            return rows[0] ?? null;
        });
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
