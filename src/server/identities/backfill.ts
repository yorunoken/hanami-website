import type { Pool, PoolConnection, RowDataPacket } from "mysql2/promise";

interface DiscordAccountSource extends RowDataPacket {
    accountId: string;
    userId: string;
    name: string;
    image: string | null;
    createdAt: Date;
}

interface BotUserSource extends RowDataPacket {
    id: string;
    banchoId: string | null;
}

interface ExistingIdentityRow extends RowDataPacket {
    userId: string;
    provider: "discord" | "osu";
    providerUserId: string;
}

interface DesiredIdentity {
    userId: string;
    provider: "discord" | "osu";
    providerUserId: string;
    username: string | null;
    displayName: string | null;
    avatarUrl: string | null;
    linkedAt: Date;
}

export interface IdentityBackfillSummary {
    created: number;
    updated: number;
    skipped: number;
    conflicts: string[];
}

export class IdentityBackfillConflictError extends Error {
    readonly code = "identity_backfill_conflict";

    constructor(public readonly summary: IdentityBackfillSummary) {
        super(`Identity backfill stopped with ${summary.conflicts.length} conflict(s)`);
        this.name = "IdentityBackfillConflictError";
    }
}

export async function backfillCanonicalIdentities(webConnection: PoolConnection, botPool: Pool): Promise<IdentityBackfillSummary> {
    const summary: IdentityBackfillSummary = { created: 0, updated: 0, skipped: 0, conflicts: [] };
    const [discordAccounts] = await webConnection.execute<DiscordAccountSource[]>(
        `SELECT account.accountId, account.userId, account.createdAt, user.name, user.image
           FROM account
           JOIN user ON user.id = account.userId
          WHERE account.providerId = 'discord'
          ORDER BY account.userId, account.accountId`,
    );

    const discordBySubject = new Map<string, DiscordAccountSource>();
    const discordByUser = new Map<string, DiscordAccountSource>();
    for (const account of discordAccounts) {
        if (!/^[1-9]\d{0,19}$/.test(account.accountId)) {
            summary.conflicts.push(`Invalid Discord provider subject for canonical user ${redact(account.userId)}`);
            continue;
        }
        const subjectOwner = discordBySubject.get(account.accountId);
        if (subjectOwner && subjectOwner.userId !== account.userId) {
            summary.conflicts.push(`Discord provider subject ${redact(account.accountId)} belongs to multiple canonical users`);
        } else {
            discordBySubject.set(account.accountId, account);
        }
        const userIdentity = discordByUser.get(account.userId);
        if (userIdentity && userIdentity.accountId !== account.accountId) {
            summary.conflicts.push(`Canonical user ${redact(account.userId)} has conflicting Discord provider subjects`);
        } else {
            discordByUser.set(account.userId, account);
        }
    }

    const botUsers = await readBotUsers(botPool, [...discordBySubject.keys()]);
    const desired: DesiredIdentity[] = [];
    const osuOwners = new Map<string, string>();

    for (const account of discordByUser.values()) {
        desired.push({
            userId: account.userId,
            provider: "discord",
            providerUserId: account.accountId,
            username: account.name,
            displayName: account.name,
            avatarUrl: account.image,
            linkedAt: new Date(account.createdAt),
        });

        const botUser = botUsers.get(account.accountId);
        const osuId = botUser?.banchoId?.trim() ?? "";
        if (!osuId) {
            summary.skipped += 1;
            continue;
        }
        if (!/^[1-9]\d{0,19}$/.test(osuId)) {
            summary.skipped += 1;
            continue;
        }

        const owner = osuOwners.get(osuId);
        if (owner && owner !== account.userId) {
            summary.conflicts.push(`osu! provider subject ${redact(osuId)} would belong to multiple canonical users`);
            continue;
        }
        osuOwners.set(osuId, account.userId);
        desired.push({
            userId: account.userId,
            provider: "osu",
            providerUserId: osuId,
            username: null,
            displayName: null,
            avatarUrl: `https://a.ppy.sh/${osuId}`,
            linkedAt: new Date(account.createdAt),
        });
    }

    const [existingRows] = await webConnection.execute<ExistingIdentityRow[]>(
        "SELECT userId, provider, providerUserId FROM userIdentity WHERE provider IN ('discord', 'osu')",
    );
    const existingBySubject = new Map(existingRows.map((row) => [`${row.provider}:${row.providerUserId}`, row]));
    const existingBySlot = new Map(existingRows.map((row) => [`${row.userId}:${row.provider}`, row]));

    for (const identity of desired) {
        const subject = existingBySubject.get(`${identity.provider}:${identity.providerUserId}`);
        if (subject && subject.userId !== identity.userId) {
            summary.conflicts.push(
                `${identity.provider} provider subject ${redact(identity.providerUserId)} is already owned by another canonical user`,
            );
        }
        const slot = existingBySlot.get(`${identity.userId}:${identity.provider}`);
        if (slot && slot.providerUserId !== identity.providerUserId) {
            summary.conflicts.push(`Canonical user ${redact(identity.userId)} already has a different ${identity.provider} identity`);
        }
    }

    summary.conflicts = [...new Set(summary.conflicts)];
    if (summary.conflicts.length > 0) throw new IdentityBackfillConflictError(summary);

    for (const identity of desired) {
        const existing = existingBySubject.get(`${identity.provider}:${identity.providerUserId}`);
        if (existing) {
            await webConnection.execute(
                `UPDATE userIdentity
                    SET username = COALESCE(?, username),
                        displayName = COALESCE(?, displayName),
                        avatarUrl = COALESCE(?, avatarUrl),
                        updatedAt = CURRENT_TIMESTAMP(3)
                  WHERE provider = ? AND providerUserId = ? AND userId = ?`,
                [identity.username, identity.displayName, identity.avatarUrl, identity.provider, identity.providerUserId, identity.userId],
            );
            summary.updated += 1;
            continue;
        }

        await webConnection.execute(
            `INSERT INTO userIdentity
                (id, userId, provider, providerUserId, username, displayName, avatarUrl, metadata, linkedAt, updatedAt)
             VALUES (?, ?, ?, ?, ?, ?, ?, NULL, ?, CURRENT_TIMESTAMP(3))`,
            [
                crypto.randomUUID(),
                identity.userId,
                identity.provider,
                identity.providerUserId,
                identity.username,
                identity.displayName,
                identity.avatarUrl,
                identity.linkedAt,
            ],
        );
        summary.created += 1;
    }

    return summary;
}

async function readBotUsers(botPool: Pool, discordIds: string[]): Promise<Map<string, BotUserSource>> {
    const result = new Map<string, BotUserSource>();
    for (let offset = 0; offset < discordIds.length; offset += 500) {
        const chunk = discordIds.slice(offset, offset + 500);
        if (chunk.length === 0) continue;
        const placeholders = chunk.map(() => "?").join(", ");
        const [rows] = await botPool.execute<BotUserSource[]>(`SELECT id, banchoId FROM users WHERE id IN (${placeholders})`, chunk);
        for (const row of rows) result.set(row.id, row);
    }
    return result;
}

export function formatBackfillSummary(summary: IdentityBackfillSummary): string {
    return [
        `created=${summary.created}`,
        `updated=${summary.updated}`,
        `skipped=${summary.skipped}`,
        `conflicts=${summary.conflicts.length}`,
    ].join(" ");
}

function redact(value: string): string {
    return value.length <= 8 ? "[redacted]" : `${value.slice(0, 4)}…${value.slice(-4)}`;
}
