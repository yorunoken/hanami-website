import type { Pool, PoolConnection, RowDataPacket } from "mysql2/promise";

import { writeIdentityAuditSafely } from "./audit";
import { PendingRegistrationStore } from "./pending-store";
import type {
    AccountIdentity,
    BotIdentityResponse,
    HanamiAccountStatus,
    IdentityProvider,
    ProviderProfileSnapshot,
} from "./types";

interface OwnerRow extends RowDataPacket {
    userId: string;
    accountStatus: HanamiAccountStatus;
    identityVersion: number;
}

interface UserIdentityRow extends RowDataPacket {
    id: string;
    accountStatus: HanamiAccountStatus;
    identityVersion: number;
    identityUpdatedAt: Date;
}

interface ProviderRow extends RowDataPacket {
    providerId: IdentityProvider;
    accountId: string;
    displayName: string | null;
    imageUrl: string | null;
}

export type RegistrationCompletionResult =
    | { kind: "created" | "existing"; userId: string }
    | { kind: "conflict"; correlationId: string };

export type LegacyCompletionResult =
    | { kind: "activated" | "already_active"; userId: string }
    | { kind: "conflict"; correlationId: string };

export class HanamiAccountRepository {
    private readonly pendingStore: PendingRegistrationStore;

    constructor(private readonly pool: Pool) {
        this.pendingStore = new PendingRegistrationStore(pool);
    }

    async findProviderOwner(provider: IdentityProvider, accountId: string): Promise<OwnerRow | null> {
        const [rows] = await this.pool.execute<OwnerRow[]>(
            `SELECT account.userId, user.accountStatus, user.identityVersion
               FROM account
               JOIN user ON user.id = account.userId
              WHERE account.providerId = ? AND account.accountId = ?
              LIMIT 2`,
            [provider, accountId],
        );
        if (rows.length > 1) return { ...rows[0], accountStatus: "conflict" };
        return rows[0] || null;
    }

    async refreshProviderProfile(userId: string, provider: IdentityProvider, profile: ProviderProfileSnapshot): Promise<void> {
        const connection = await this.pool.getConnection();
        try {
            await upsertProviderProfile(connection, userId, provider, profile, new Date());
        } finally {
            connection.release();
        }
    }

    async getIdentityByUserId(userId: string): Promise<AccountIdentity | null> {
        const [users] = await this.pool.execute<UserIdentityRow[]>(
            "SELECT id, accountStatus, identityVersion, identityUpdatedAt FROM user WHERE id = ? LIMIT 1",
            [userId],
        );
        const user = users[0];
        if (!user) return null;

        const [providers] = await this.pool.execute<ProviderRow[]>(
            `SELECT account.providerId, account.accountId,
                    hanami_provider_profile.display_name AS displayName,
                    hanami_provider_profile.image_url AS imageUrl
               FROM account
               LEFT JOIN hanami_provider_profile
                 ON hanami_provider_profile.user_id = account.userId
                AND hanami_provider_profile.provider_id = account.providerId
              WHERE account.userId = ? AND account.providerId IN ('discord', 'osu')`,
            [userId],
        );

        const discordRows = providers.filter((provider) => provider.providerId === "discord");
        const osuRows = providers.filter((provider) => provider.providerId === "osu");
        const inconsistent = discordRows.length > 1 || osuRows.length > 1;

        return {
            userId: user.id,
            status: inconsistent ? "conflict" : user.accountStatus,
            identityVersion: Number(user.identityVersion),
            identityUpdatedAt: new Date(user.identityUpdatedAt),
            discord: discordRows[0] ? providerRowToSnapshot(discordRows[0]) : null,
            osu: osuRows[0] ? providerRowToSnapshot(osuRows[0]) : null,
        };
    }

    async resolveBotIdentity(discordId: string): Promise<BotIdentityResponse> {
        const [rows] = await this.pool.execute<
            Array<
                RowDataPacket & {
                    userId: string;
                    status: HanamiAccountStatus;
                    identityVersion: number;
                    identityUpdatedAt: Date;
                    discordCount: number;
                    osuCount: number;
                    osuId: string | null;
                }
            >
        >(
            `SELECT user.id AS userId, user.accountStatus AS status,
                    user.identityVersion, user.identityUpdatedAt,
                    SUM(account.providerId = 'discord') AS discordCount,
                    SUM(account.providerId = 'osu') AS osuCount,
                    MAX(CASE WHEN account.providerId = 'osu' THEN account.accountId END) AS osuId
               FROM account
               JOIN user ON user.id = account.userId
              WHERE user.id IN (
                    SELECT userId FROM account WHERE providerId = 'discord' AND accountId = ?
              )
              GROUP BY user.id, user.accountStatus, user.identityVersion, user.identityUpdatedAt
              LIMIT 2`,
            [discordId],
        );

        if (rows.length === 0) return { status: "not_found", identityVersion: 0 };
        const row = rows[0];
        if (rows.length > 1 || row.status === "conflict" || Number(row.discordCount) !== 1 || Number(row.osuCount) > 1) {
            return { status: "conflict", identityVersion: Number(row.identityVersion) };
        }
        if (row.status !== "active" || Number(row.osuCount) !== 1 || !row.osuId) {
            return { status: "incomplete", identityVersion: Number(row.identityVersion) };
        }
        return {
            status: "active",
            hanamiUserId: row.userId,
            discordId,
            osuId: row.osuId,
            identityVersion: Number(row.identityVersion),
            updatedAt: new Date(row.identityUpdatedAt).toISOString(),
        };
    }

    async completeRegistration(pendingId: string, browserBindingHash: string, now = new Date()): Promise<RegistrationCompletionResult> {
        const connection = await this.pool.getConnection();
        let conflictCorrelation: string | null = null;
        try {
            await connection.beginTransaction();
            const pending = await this.pendingStore.getByIdForUpdate(connection, pendingId);
            if (!pending || pending.browserBindingHash !== browserBindingHash) throw new Error("pending_binding_mismatch");
            if (pending.status !== "pending_registration" || pending.consumedAt) throw new Error("pending_not_available");
            if (pending.expiresAt <= now) throw new Error("pending_expired");
            if (!pending.discordAccountId || !pending.osuAccountId || !pending.discordProfile || !pending.osuProfile) {
                throw new Error("pending_incomplete");
            }

            const owners = await lockProviderOwners(connection, pending.discordAccountId, pending.osuAccountId);
            if (owners.length > 0) {
                const ownerIds = new Set(owners.map((owner) => owner.userId));
                if (ownerIds.size === 1 && owners.length === 2 && owners.every((owner) => owner.accountStatus === "active")) {
                    const userId = owners[0].userId;
                    await markPendingConsumed(connection, pending.id, now);
                    await writeIdentityAuditSafely(connection, {
                        eventType: "registration_completed_existing_account",
                        canonicalUserId: userId,
                        correlationId: pending.correlationId,
                        sourceService: "web",
                        outcome: "success",
                    });
                    await connection.commit();
                    return { kind: "existing", userId };
                }

                conflictCorrelation = pending.correlationId;
                await connection.execute("UPDATE pending_hanami_registration SET status = 'conflict' WHERE id = ?", [pending.id]);
                await writeIdentityAuditSafely(connection, {
                    eventType: "provider_conflict",
                    correlationId: pending.correlationId,
                    sourceService: "web",
                    outcome: "conflict",
                });
                await connection.commit();
                return { kind: "conflict", correlationId: pending.correlationId };
            }

            const userId = crypto.randomUUID();
            const canonicalEmail = await selectCanonicalEmail(connection, userId, pending.discordProfile);
            const contactEmailAvailable = canonicalEmail === pending.discordProfile.email;

            await connection.execute(
                `INSERT INTO user (
                    id, name, email, emailVerified, image, createdAt, updatedAt,
                    accountStatus, identityVersion, identityUpdatedAt, contactEmailAvailable
                ) VALUES (?, ?, ?, ?, ?, ?, ?, 'active', 1, ?, ?)`,
                [
                    userId,
                    pending.discordProfile.name,
                    canonicalEmail,
                    contactEmailAvailable && pending.discordProfile.emailVerified,
                    pending.discordProfile.image,
                    now,
                    now,
                    now,
                    contactEmailAvailable,
                ],
            );
            await insertProviderAccount(connection, userId, "discord", pending.discordProfile, now);
            await insertProviderAccount(connection, userId, "osu", pending.osuProfile, now);
            await upsertProviderProfile(connection, userId, "discord", pending.discordProfile, now);
            await upsertProviderProfile(connection, userId, "osu", pending.osuProfile, now);
            await markPendingConsumed(connection, pending.id, now);
            await writeIdentityAuditSafely(connection, {
                eventType: "registration_completed",
                canonicalUserId: userId,
                correlationId: pending.correlationId,
                sourceService: "web",
                outcome: "success",
            });
            await connection.commit();
            return { kind: "created", userId };
        } catch (error) {
            await connection.rollback().catch(() => undefined);
            if (isDuplicateEntry(error)) {
                conflictCorrelation ||= crypto.randomUUID();
                await this.pendingStore.markConflict(pendingId, conflictCorrelation).catch(() => undefined);
                return { kind: "conflict", correlationId: conflictCorrelation };
            }
            throw error;
        } finally {
            connection.release();
        }
    }

    async completeLegacyAccount(
        userId: string,
        sessionId: string,
        profile: ProviderProfileSnapshot,
        correlationId: string,
        now = new Date(),
    ): Promise<LegacyCompletionResult> {
        const connection = await this.pool.getConnection();
        try {
            await connection.beginTransaction();
            const [users] = await connection.execute<UserIdentityRow[]>(
                "SELECT id, accountStatus, identityVersion, identityUpdatedAt FROM user WHERE id = ? LIMIT 1 FOR UPDATE",
                [userId],
            );
            const user = users[0];
            if (!user) throw new Error("account_not_found");
            if (user.accountStatus === "conflict") return commitConflict(connection, correlationId);

            const [sessionRows] = await connection.execute<RowDataPacket[]>(
                "SELECT id FROM session WHERE id = ? AND userId = ? AND expiresAt > ? LIMIT 1 FOR UPDATE",
                [sessionId, userId, now],
            );
            if (!sessionRows[0]) throw new Error("completion_session_invalid");

            const [accounts] = await connection.execute<Array<RowDataPacket & { providerId: string; accountId: string }>>(
                "SELECT providerId, accountId FROM account WHERE userId = ? AND providerId IN ('discord', 'osu') FOR UPDATE",
                [userId],
            );
            const discordAccounts = accounts.filter((account) => account.providerId === "discord");
            const osuAccounts = accounts.filter((account) => account.providerId === "osu");
            if (discordAccounts.length !== 1 || osuAccounts.length > 1) return commitConflict(connection, correlationId, userId);
            if (user.accountStatus === "active" && osuAccounts.length === 1 && osuAccounts[0].accountId === profile.accountId) {
                await connection.commit();
                return { kind: "already_active", userId };
            }
            if (user.accountStatus !== "legacy_incomplete") return commitConflict(connection, correlationId, userId);

            const [owners] = await connection.execute<OwnerRow[]>(
                `SELECT account.userId, user.accountStatus, user.identityVersion
                   FROM account JOIN user ON user.id = account.userId
                  WHERE account.providerId = 'osu' AND account.accountId = ? FOR UPDATE`,
                [profile.accountId],
            );
            if (owners.some((owner) => owner.userId !== userId)) return commitConflict(connection, correlationId, userId);

            if (osuAccounts.length === 0) await insertProviderAccount(connection, userId, "osu", profile, now);
            await upsertProviderProfile(connection, userId, "osu", profile, now);
            await connection.execute(
                `UPDATE user
                    SET accountStatus = 'active', identityVersion = identityVersion + 1,
                        identityUpdatedAt = ?, updatedAt = ?
                  WHERE id = ?`,
                [now, now, userId],
            );
            await writeIdentityAuditSafely(connection, {
                eventType: "legacy_account_activated",
                canonicalUserId: userId,
                provider: "osu",
                externalIdentifier: profile.accountId,
                correlationId,
                sourceService: "web",
                outcome: "success",
            });
            await connection.commit();
            return { kind: "activated", userId };
        } catch (error) {
            await connection.rollback().catch(() => undefined);
            if (isDuplicateEntry(error)) return { kind: "conflict", correlationId };
            throw error;
        } finally {
            connection.release();
        }
    }
}

async function lockProviderOwners(connection: PoolConnection, discordId: string, osuId: string): Promise<Array<OwnerRow & { providerId: string }>> {
    const [owners] = await connection.execute<Array<OwnerRow & { providerId: string }>>(
        `SELECT account.userId, account.providerId, user.accountStatus, user.identityVersion
           FROM account JOIN user ON user.id = account.userId
          WHERE (account.providerId = 'discord' AND account.accountId = ?)
             OR (account.providerId = 'osu' AND account.accountId = ?)
          FOR UPDATE`,
        [discordId, osuId],
    );
    return owners;
}

async function selectCanonicalEmail(connection: PoolConnection, userId: string, discord: ProviderProfileSnapshot): Promise<string> {
    const candidate = discord.emailVerified && discord.email ? discord.email.trim().toLowerCase() : null;
    if (candidate) {
        const [existing] = await connection.execute<RowDataPacket[]>("SELECT id FROM user WHERE email = ? LIMIT 1 FOR UPDATE", [candidate]);
        if (!existing[0]) return candidate;
    }
    return `user-${userId}@accounts.hanami.invalid`;
}

async function insertProviderAccount(
    connection: PoolConnection,
    userId: string,
    provider: IdentityProvider,
    profile: ProviderProfileSnapshot,
    now: Date,
): Promise<void> {
    await connection.execute(
        `INSERT INTO account (id, accountId, providerId, userId, createdAt, updatedAt)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [crypto.randomUUID(), profile.accountId, provider, userId, now, now],
    );
}

async function upsertProviderProfile(
    connection: PoolConnection,
    userId: string,
    provider: IdentityProvider,
    profile: ProviderProfileSnapshot,
    now: Date,
): Promise<void> {
    await connection.execute(
        `INSERT INTO hanami_provider_profile (
            id, user_id, provider_id, account_id, display_name, image_url, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE account_id = VALUES(account_id), display_name = VALUES(display_name),
                                image_url = VALUES(image_url), updated_at = VALUES(updated_at)`,
        [crypto.randomUUID(), userId, provider, profile.accountId, profile.name, profile.image, now],
    );
}

async function markPendingConsumed(connection: PoolConnection, id: string, now: Date): Promise<void> {
    const [result] = await connection.execute<{ affectedRows: number } & RowDataPacket>(
        `UPDATE pending_hanami_registration
            SET consumed_at = ?, status = 'consumed'
          WHERE id = ? AND consumed_at IS NULL AND status = 'pending_registration'`,
        [now, id],
    );
    if (Number(result.affectedRows) !== 1) throw new Error("pending_replayed");
}

async function commitConflict(
    connection: PoolConnection,
    correlationId: string,
    userId?: string,
): Promise<{ kind: "conflict"; correlationId: string }> {
    if (userId) {
        await connection.execute(
            "UPDATE user SET accountStatus = 'conflict', identityVersion = identityVersion + 1, identityUpdatedAt = CURRENT_TIMESTAMP(3) WHERE id = ?",
            [userId],
        );
    }
    await writeIdentityAuditSafely(connection, {
        eventType: "provider_conflict",
        canonicalUserId: userId,
        correlationId,
        sourceService: "web",
        outcome: "conflict",
    });
    await connection.commit();
    return { kind: "conflict", correlationId };
}

function providerRowToSnapshot(row: ProviderRow): ProviderProfileSnapshot {
    return {
        accountId: row.accountId,
        name: row.displayName || `${row.providerId} account`,
        image: row.imageUrl,
        email: null,
        emailVerified: false,
    };
}

function isDuplicateEntry(error: unknown): boolean {
    return Boolean(error && typeof error === "object" && "code" in error && error.code === "ER_DUP_ENTRY");
}
