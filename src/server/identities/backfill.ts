import type { Pool, PoolConnection, RowDataPacket } from "mysql2/promise";

import type { SupportedIdentityProvider } from "./model";

interface AccountSource extends RowDataPacket {
    id: string;
    accountId: string;
    providerId: SupportedIdentityProvider;
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
    id: string;
    userId: string;
    provider: SupportedIdentityProvider;
    providerUserId: string;
    username: string | null;
    displayName: string | null;
    avatarUrl: string | null;
}

interface DesiredMapping {
    userId: string;
    provider: SupportedIdentityProvider;
    providerUserId: string;
    username: string | null;
    displayName: string | null;
    avatarUrl: string | null;
    linkedAt: Date;
    createAccount: boolean;
}

export interface IdentityBackfillSummary {
    accountsCreated: number;
    identitiesCreated: number;
    identitiesUpdated: number;
    alreadyConsistent: number;
    skippedInvalid: number;
    conflicts: string[];
}

export class IdentityBackfillConflictError extends Error {
    readonly code = "identity_backfill_conflict";

    constructor(public readonly summary: IdentityBackfillSummary) {
        super(`Identity reconciliation stopped with ${summary.conflicts.length} conflict(s)`);
        this.name = "IdentityBackfillConflictError";
    }
}

/**
 * Reconciles Better Auth accounts with Hanami's token-free identity projection.
 * The caller owns the transaction so the account and projection are committed
 * together under the Web migration lock.
 */
export async function backfillCanonicalIdentities(webConnection: PoolConnection, botPool: Pool): Promise<IdentityBackfillSummary> {
    const summary: IdentityBackfillSummary = {
        accountsCreated: 0,
        identitiesCreated: 0,
        identitiesUpdated: 0,
        alreadyConsistent: 0,
        skippedInvalid: 0,
        conflicts: [],
    };
    const [accounts] = await webConnection.execute<AccountSource[]>(
        `SELECT account.id, account.accountId, account.providerId, account.userId, account.createdAt, user.name, user.image
           FROM account
           JOIN user ON user.id = account.userId
          WHERE account.providerId IN ('discord', 'osu')
          ORDER BY account.providerId, account.userId, account.accountId`,
    );
    const [identities] = await webConnection.execute<ExistingIdentityRow[]>(
        `SELECT id, userId, provider, providerUserId, username, displayName, avatarUrl
           FROM userIdentity
          WHERE provider IN ('discord', 'osu')
          ORDER BY provider, userId, providerUserId`,
    );

    const accountsBySubject = indexAccounts(accounts, "subject", summary);
    const accountsBySlot = indexAccounts(accounts, "slot", summary);
    const identitiesBySubject = indexIdentities(identities, "subject", summary);
    const identitiesBySlot = indexIdentities(identities, "slot", summary);
    detectStoreDisagreements(accounts, identitiesBySubject, identitiesBySlot, summary);

    const discordAccounts = accounts.filter((account) => account.providerId === "discord");
    const botUsers = await readBotUsers(
        botPool,
        discordAccounts.map((account) => account.accountId),
    );
    const desired = new Map<string, DesiredMapping>();

    for (const account of accounts) {
        if (!isValidProviderSubject(account.providerId, account.accountId)) {
            summary.conflicts.push(`Invalid ${account.providerId} account subject for canonical user ${redact(account.userId)}`);
            continue;
        }
        desired.set(slotKey(account.userId, account.providerId), {
            userId: account.userId,
            provider: account.providerId,
            providerUserId: account.accountId,
            username: account.providerId === "discord" ? account.name : null,
            displayName: account.providerId === "discord" ? account.name : null,
            avatarUrl: account.providerId === "discord" ? account.image : null,
            linkedAt: new Date(account.createdAt),
            createAccount: false,
        });
    }

    const legacyOsuOwners = new Map<string, string>();
    for (const discordAccount of discordAccounts) {
        const osuId = botUsers.get(discordAccount.accountId)?.banchoId?.trim() ?? "";
        if (!osuId || !isValidProviderSubject("osu", osuId)) {
            summary.skippedInvalid += 1;
            continue;
        }

        const legacyOwner = legacyOsuOwners.get(osuId);
        if (legacyOwner) {
            summary.conflicts.push(`Legacy osu! subject ${redact(osuId)} is assigned by multiple Bot rows`);
            continue;
        }
        legacyOsuOwners.set(osuId, discordAccount.userId);

        const key = slotKey(discordAccount.userId, "osu");
        const existingDesired = desired.get(key);
        if (existingDesired && existingDesired.providerUserId !== osuId) {
            summary.conflicts.push(`Canonical user ${redact(discordAccount.userId)} has a different osu! Better Auth account`);
            continue;
        }
        desired.set(key, {
            userId: discordAccount.userId,
            provider: "osu",
            providerUserId: osuId,
            username: existingDesired?.username ?? null,
            displayName: existingDesired?.displayName ?? null,
            avatarUrl: existingDesired?.avatarUrl ?? `https://a.ppy.sh/${osuId}`,
            linkedAt: existingDesired?.linkedAt ?? new Date(discordAccount.createdAt),
            createAccount: !existingDesired,
        });
    }

    for (const mapping of desired.values()) {
        const subjectAccount = accountsBySubject.get(subjectKey(mapping.provider, mapping.providerUserId));
        if (subjectAccount && subjectAccount.userId !== mapping.userId) {
            summary.conflicts.push(
                `${mapping.provider} Better Auth subject ${redact(mapping.providerUserId)} is owned by another canonical user`,
            );
        }
        const slotAccount = accountsBySlot.get(slotKey(mapping.userId, mapping.provider));
        if (slotAccount && slotAccount.accountId !== mapping.providerUserId) {
            summary.conflicts.push(`Canonical user ${redact(mapping.userId)} has a different ${mapping.provider} Better Auth account`);
        }
        const subjectIdentity = identitiesBySubject.get(subjectKey(mapping.provider, mapping.providerUserId));
        if (subjectIdentity && subjectIdentity.userId !== mapping.userId) {
            summary.conflicts.push(`${mapping.provider} identity ${redact(mapping.providerUserId)} is owned by another canonical user`);
        }
        const slotIdentity = identitiesBySlot.get(slotKey(mapping.userId, mapping.provider));
        if (slotIdentity && slotIdentity.providerUserId !== mapping.providerUserId) {
            summary.conflicts.push(`Canonical user ${redact(mapping.userId)} has a different ${mapping.provider} identity`);
        }
    }

    summary.conflicts = [...new Set(summary.conflicts)];
    if (summary.conflicts.length > 0) throw new IdentityBackfillConflictError(summary);

    for (const mapping of desired.values()) {
        const account = accountsBySubject.get(subjectKey(mapping.provider, mapping.providerUserId));
        if (!account && mapping.createAccount) {
            await webConnection.execute(
                `INSERT INTO account
                    (id, accountId, providerId, userId, accessToken, refreshToken, idToken,
                     accessTokenExpiresAt, refreshTokenExpiresAt, scope, password, createdAt, updatedAt)
                 VALUES (?, ?, ?, ?, NULL, NULL, NULL, NULL, NULL, NULL, NULL, CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3))`,
                [crypto.randomUUID(), mapping.providerUserId, mapping.provider, mapping.userId],
            );
            summary.accountsCreated += 1;
        }

        const identity = identitiesBySubject.get(subjectKey(mapping.provider, mapping.providerUserId));
        if (!identity) {
            await webConnection.execute(
                `INSERT INTO userIdentity
                    (id, userId, provider, providerUserId, username, displayName, avatarUrl, metadata, linkedAt, updatedAt)
                 VALUES (?, ?, ?, ?, ?, ?, ?, NULL, ?, CURRENT_TIMESTAMP(3))`,
                [
                    crypto.randomUUID(),
                    mapping.userId,
                    mapping.provider,
                    mapping.providerUserId,
                    mapping.username,
                    mapping.displayName,
                    mapping.avatarUrl,
                    mapping.linkedAt,
                ],
            );
            summary.identitiesCreated += 1;
            continue;
        }

        const nextUsername = mapping.username ?? identity.username;
        const nextDisplayName = mapping.displayName ?? identity.displayName;
        const nextAvatarUrl = mapping.avatarUrl ?? identity.avatarUrl;
        if (identity.username === nextUsername && identity.displayName === nextDisplayName && identity.avatarUrl === nextAvatarUrl) {
            summary.alreadyConsistent += 1;
            continue;
        }

        await webConnection.execute(
            `UPDATE userIdentity
                SET username = ?, displayName = ?, avatarUrl = ?, updatedAt = CURRENT_TIMESTAMP(3)
              WHERE id = ?`,
            [nextUsername, nextDisplayName, nextAvatarUrl, identity.id],
        );
        summary.identitiesUpdated += 1;
    }

    return summary;
}

function indexAccounts(accounts: AccountSource[], index: "subject" | "slot", summary: IdentityBackfillSummary): Map<string, AccountSource> {
    const result = new Map<string, AccountSource>();
    for (const account of accounts) {
        const key = index === "subject" ? subjectKey(account.providerId, account.accountId) : slotKey(account.userId, account.providerId);
        if (result.has(key)) {
            summary.conflicts.push(
                index === "subject"
                    ? `Duplicate ${account.providerId} Better Auth subject ${redact(account.accountId)}`
                    : `Canonical user ${redact(account.userId)} has multiple ${account.providerId} Better Auth accounts`,
            );
        } else {
            result.set(key, account);
        }
    }
    return result;
}

function indexIdentities(
    identities: ExistingIdentityRow[],
    index: "subject" | "slot",
    summary: IdentityBackfillSummary,
): Map<string, ExistingIdentityRow> {
    const result = new Map<string, ExistingIdentityRow>();
    for (const identity of identities) {
        const key =
            index === "subject" ? subjectKey(identity.provider, identity.providerUserId) : slotKey(identity.userId, identity.provider);
        if (result.has(key)) {
            summary.conflicts.push(
                index === "subject"
                    ? `Duplicate ${identity.provider} identity subject ${redact(identity.providerUserId)}`
                    : `Canonical user ${redact(identity.userId)} has multiple ${identity.provider} identities`,
            );
        } else {
            result.set(key, identity);
        }
    }
    return result;
}

function detectStoreDisagreements(
    accounts: AccountSource[],
    identitiesBySubject: Map<string, ExistingIdentityRow>,
    identitiesBySlot: Map<string, ExistingIdentityRow>,
    summary: IdentityBackfillSummary,
): void {
    for (const account of accounts) {
        const subjectIdentity = identitiesBySubject.get(subjectKey(account.providerId, account.accountId));
        if (subjectIdentity && subjectIdentity.userId !== account.userId) {
            summary.conflicts.push(
                `${account.providerId} Better Auth account and identity disagree for subject ${redact(account.accountId)}`,
            );
        }
        const slotIdentity = identitiesBySlot.get(slotKey(account.userId, account.providerId));
        if (slotIdentity && slotIdentity.providerUserId !== account.accountId) {
            summary.conflicts.push(
                `Canonical user ${redact(account.userId)} has disagreeing ${account.providerId} account and identity subjects`,
            );
        }
    }
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
        `accountsCreated=${summary.accountsCreated}`,
        `identitiesCreated=${summary.identitiesCreated}`,
        `identitiesUpdated=${summary.identitiesUpdated}`,
        `alreadyConsistent=${summary.alreadyConsistent}`,
        `skippedInvalid=${summary.skippedInvalid}`,
        `conflicts=${summary.conflicts.length}`,
    ].join(" ");
}

export function formatBackfillConflicts(error: IdentityBackfillConflictError): string {
    return [
        `Canonical identity reconciliation failed: ${formatBackfillSummary(error.summary)}`,
        ...error.summary.conflicts.map((conflict) => `- ${conflict}`),
    ].join("\n");
}

function isValidProviderSubject(provider: SupportedIdentityProvider, value: string): boolean {
    if (value.length < 1 || value.length > 255) return false;
    return (provider === "discord" || provider === "osu") && /^[1-9]\d{0,19}$/.test(value);
}

function subjectKey(provider: SupportedIdentityProvider, providerUserId: string): string {
    return `${provider}:${providerUserId}`;
}

function slotKey(userId: string, provider: SupportedIdentityProvider): string {
    return `${userId}:${provider}`;
}

function redact(value: string): string {
    return value.length <= 8 ? "[redacted]" : `${value.slice(0, 4)}…${value.slice(-4)}`;
}
