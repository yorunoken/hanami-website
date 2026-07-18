import mysql, { type Pool, type RowDataPacket } from "mysql2/promise";

import { logSafeFailure } from "../security/http";
import type { AccountService } from "./service";

interface ProviderPairRow extends RowDataPacket {
    userId: string;
    discordProviderUserId: string;
    osuProviderUserId: string;
}

/**
 * Temporary, best-effort compatibility for the Discord-keyed Bot schema.
 * Remove this after Bot stores `hanami_user_id`.
 */
export class TemporaryBotAccountCompatibility {
    constructor(
        private readonly webPool: Pool,
        private readonly accounts: AccountService,
        private readonly getDatabaseUrl: () => string | undefined = () => process.env.BOT_DATABASE_URL,
    ) {}

    async synchronizeUser(userId: string): Promise<void> {
        const methods = await this.accounts.listLoginMethods(userId);
        const discord = methods.find((method) => method.provider === "discord");
        const osu = methods.find((method) => method.provider === "osu");
        if (!discord || !osu) return;
        await this.withBotConnection((connection) =>
            connection.execute(
                `INSERT INTO users (id, banchoId)
                 VALUES (?, ?)
                 ON DUPLICATE KEY UPDATE banchoId = VALUES(banchoId)`,
                [discord.providerUserId, osu.providerUserId],
            ),
        );
    }

    async accountRemoved(userId: string, provider: "discord" | "osu", providerUserId: string): Promise<void> {
        if (provider === "discord") {
            await this.deleteDiscordUser(providerUserId);
            return;
        }

        const discord = (await this.accounts.listLoginMethods(userId)).find((method) => method.provider === "discord");
        if (!discord) return;
        await this.withBotConnection((connection) =>
            connection.execute("UPDATE users SET banchoId = NULL WHERE id = ? AND banchoId = ?", [discord.providerUserId, providerUserId]),
        );
    }

    async deleteDiscordUser(discordProviderUserId: string): Promise<void> {
        await this.withBotConnection((connection) => connection.execute("DELETE FROM users WHERE id = ?", [discordProviderUserId]));
    }

    async synchronizeAll(): Promise<{ synchronized: number }> {
        const [rows] = await this.webPool.execute<ProviderPairRow[]>(
            `SELECT discord.userId,
                    discord.accountId AS discordProviderUserId,
                    osu.accountId AS osuProviderUserId
               FROM account AS discord
               JOIN account AS osu ON osu.userId = discord.userId AND osu.providerId = 'osu'
              WHERE discord.providerId = 'discord'
              ORDER BY discord.userId`,
        );
        if (rows.length === 0) return { synchronized: 0 };

        await this.withBotConnection(async (connection) => {
            for (const row of rows) {
                await connection.execute(
                    `INSERT INTO users (id, banchoId)
                     VALUES (?, ?)
                     ON DUPLICATE KEY UPDATE banchoId = VALUES(banchoId)`,
                    [row.discordProviderUserId, row.osuProviderUserId],
                );
            }
        });
        return { synchronized: rows.length };
    }

    async runBestEffort(operation: string, callback: () => Promise<void>): Promise<void> {
        try {
            await callback();
        } catch (error) {
            logSafeFailure(`temporary Bot compatibility: ${operation}`, error);
        }
    }

    private async withBotConnection<T>(
        callback: (connection: Awaited<ReturnType<typeof mysql.createConnection>>) => Promise<T>,
    ): Promise<T | undefined> {
        const databaseUrl = this.getDatabaseUrl();
        if (!databaseUrl) return undefined;

        const connection = await mysql.createConnection({ uri: databaseUrl, timezone: "Z", connectTimeout: 3_000 });
        try {
            return await callback(connection);
        } finally {
            await connection.end();
        }
    }
}
