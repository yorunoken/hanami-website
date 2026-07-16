import type { Pool, PoolConnection, RowDataPacket } from "mysql2/promise";

import { writeIdentityAuditSafely } from "./audit";
import type { IdentityProvider, PendingRegistration, ProviderProfileSnapshot } from "./types";

const PENDING_LIFETIME_MS = 15 * 60 * 1000;
const MAX_ATTEMPTS = 6;

interface PendingRow extends RowDataPacket {
    id: string;
    browser_binding_hash: string;
    discord_account_id: string | null;
    osu_account_id: string | null;
    discord_profile_snapshot: string | ProviderProfileSnapshot | null;
    osu_profile_snapshot: string | ProviderProfileSnapshot | null;
    created_at: Date;
    expires_at: Date;
    consumed_at: Date | null;
    attempt_count: number;
    status: PendingRegistration["status"];
    correlation_id: string;
}

export class PendingRegistrationStore {
    constructor(private readonly pool: Pool) {}

    async getOrCreate(browserBindingHash: string, now = new Date()): Promise<PendingRegistration> {
        const existing = await this.findByBinding(browserBindingHash, now);
        if (existing) return existing;

        const pending: PendingRegistration = {
            id: crypto.randomUUID(),
            browserBindingHash,
            discordAccountId: null,
            osuAccountId: null,
            discordProfile: null,
            osuProfile: null,
            createdAt: now,
            expiresAt: new Date(now.getTime() + PENDING_LIFETIME_MS),
            consumedAt: null,
            attemptCount: 0,
            status: "pending_registration",
            correlationId: crypto.randomUUID(),
        };

        const connection = await this.pool.getConnection();
        try {
            await connection.beginTransaction();
            const concurrent = await this.findByBindingForUpdate(connection, browserBindingHash, now);
            if (concurrent) {
                await connection.commit();
                return concurrent;
            }

            await connection.execute(
                `INSERT INTO pending_hanami_registration (
                    id, browser_binding_hash, created_at, expires_at, attempt_count, status, correlation_id
                ) VALUES (?, ?, ?, ?, 0, 'pending_registration', ?)`,
                [pending.id, pending.browserBindingHash, pending.createdAt, pending.expiresAt, pending.correlationId],
            );
            await writeIdentityAuditSafely(connection, {
                eventType: "pending_registration_created",
                correlationId: pending.correlationId,
                sourceService: "web",
                outcome: "success",
            });
            await connection.commit();
            return pending;
        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
    }

    async findByBinding(browserBindingHash: string, now = new Date()): Promise<PendingRegistration | null> {
        const [rows] = await this.pool.execute<PendingRow[]>(
            `SELECT * FROM pending_hanami_registration
              WHERE browser_binding_hash = ? AND status = 'pending_registration' AND consumed_at IS NULL AND expires_at > ?
              ORDER BY created_at DESC LIMIT 1`,
            [browserBindingHash, now],
        );
        return rows[0] ? mapPending(rows[0]) : null;
    }

    async getById(id: string): Promise<PendingRegistration | null> {
        const [rows] = await this.pool.execute<PendingRow[]>(
            "SELECT * FROM pending_hanami_registration WHERE id = ? LIMIT 1",
            [id],
        );
        return rows[0] ? mapPending(rows[0]) : null;
    }

    async getByIdForUpdate(connection: PoolConnection, id: string): Promise<PendingRegistration | null> {
        const [rows] = await connection.execute<PendingRow[]>(
            "SELECT * FROM pending_hanami_registration WHERE id = ? LIMIT 1 FOR UPDATE",
            [id],
        );
        return rows[0] ? mapPending(rows[0]) : null;
    }

    async attachVerifiedProvider(
        id: string,
        browserBindingHash: string,
        provider: IdentityProvider,
        profile: ProviderProfileSnapshot,
        now = new Date(),
    ): Promise<PendingRegistration> {
        const connection = await this.pool.getConnection();
        try {
            await connection.beginTransaction();
            const pending = await this.getByIdForUpdate(connection, id);
            if (!pending || pending.browserBindingHash !== browserBindingHash) throw new Error("pending_binding_mismatch");
            if (pending.status !== "pending_registration" || pending.consumedAt) throw new Error("pending_not_available");
            if (pending.expiresAt <= now) {
                await connection.execute("UPDATE pending_hanami_registration SET status = 'expired' WHERE id = ?", [id]);
                await writeIdentityAuditSafely(connection, {
                    eventType: "registration_expired",
                    provider,
                    externalIdentifier: profile.accountId,
                    correlationId: pending.correlationId,
                    sourceService: "web",
                    outcome: "expired",
                });
                await connection.commit();
                throw new Error("pending_expired");
            }
            if (pending.attemptCount >= MAX_ATTEMPTS) throw new Error("pending_retry_limit");

            const idColumn = provider === "discord" ? "discord_account_id" : "osu_account_id";
            const profileColumn = provider === "discord" ? "discord_profile_snapshot" : "osu_profile_snapshot";
            await connection.query(
                `UPDATE pending_hanami_registration
                    SET \`${idColumn}\` = ?, \`${profileColumn}\` = ?, attempt_count = attempt_count + 1
                  WHERE id = ?`,
                [profile.accountId, JSON.stringify(profile), id],
            );
            await writeIdentityAuditSafely(connection, {
                eventType: provider === "discord" ? "first_provider_verified" : "second_provider_verified",
                provider,
                externalIdentifier: profile.accountId,
                correlationId: pending.correlationId,
                sourceService: "web",
                outcome: "success",
            });
            await connection.commit();

            const updated = await this.findByBinding(browserBindingHash, now);
            if (!updated) throw new Error("pending_not_available");
            return updated;
        } catch (error) {
            await connection.rollback().catch(() => undefined);
            throw error;
        } finally {
            connection.release();
        }
    }

    async markConflict(id: string, correlationId: string): Promise<void> {
        const connection = await this.pool.getConnection();
        try {
            await connection.beginTransaction();
            await connection.execute("UPDATE pending_hanami_registration SET status = 'conflict' WHERE id = ? AND consumed_at IS NULL", [id]);
            await writeIdentityAuditSafely(connection, {
                eventType: "provider_conflict",
                correlationId,
                sourceService: "web",
                outcome: "conflict",
            });
            await connection.commit();
        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
    }

    async cleanupExpired(now = new Date()): Promise<number> {
        const [result] = await this.pool.execute<{ affectedRows: number } & RowDataPacket>(
            `UPDATE pending_hanami_registration
                SET status = 'expired'
              WHERE status = 'pending_registration' AND consumed_at IS NULL AND expires_at <= ?`,
            [now],
        );
        return Number(result.affectedRows || 0);
    }

    private async findByBindingForUpdate(
        connection: PoolConnection,
        browserBindingHash: string,
        now: Date,
    ): Promise<PendingRegistration | null> {
        const [rows] = await connection.execute<PendingRow[]>(
            `SELECT * FROM pending_hanami_registration
              WHERE browser_binding_hash = ? AND status = 'pending_registration' AND consumed_at IS NULL AND expires_at > ?
              ORDER BY created_at DESC LIMIT 1 FOR UPDATE`,
            [browserBindingHash, now],
        );
        return rows[0] ? mapPending(rows[0]) : null;
    }
}

function mapPending(row: PendingRow): PendingRegistration {
    return {
        id: row.id,
        browserBindingHash: row.browser_binding_hash,
        discordAccountId: row.discord_account_id,
        osuAccountId: row.osu_account_id,
        discordProfile: parseProfile(row.discord_profile_snapshot),
        osuProfile: parseProfile(row.osu_profile_snapshot),
        createdAt: new Date(row.created_at),
        expiresAt: new Date(row.expires_at),
        consumedAt: row.consumed_at ? new Date(row.consumed_at) : null,
        attemptCount: Number(row.attempt_count),
        status: row.status,
        correlationId: row.correlation_id,
    };
}

function parseProfile(value: string | ProviderProfileSnapshot | null): ProviderProfileSnapshot | null {
    if (!value) return null;
    return typeof value === "string" ? (JSON.parse(value) as ProviderProfileSnapshot) : value;
}

export const pendingRegistrationLifetimeMs = PENDING_LIFETIME_MS;
export const pendingRegistrationMaxAttempts = MAX_ATTEMPTS;
