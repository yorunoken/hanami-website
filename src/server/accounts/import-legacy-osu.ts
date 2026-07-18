import type { Pool, PoolConnection, RowDataPacket } from "mysql2/promise";

import { migrationLockName } from "../migrations";

interface LockRow extends RowDataPacket {
    acquired: number | string | null;
}

interface AccountRow extends RowDataPacket {
    userId: string;
    providerId: string;
    accountId: string;
    createdAt: Date;
}

interface DuplicateRow extends RowDataPacket {
    firstValue: string;
    secondValue: string;
    count: number | string;
}

interface BotUserRow extends RowDataPacket {
    id: string;
    banchoId: string | number | null;
}

interface DesiredAccount {
    userId: string;
    osuProviderUserId: string;
    createdAt: Date;
}

export interface LegacyOsuImportSummary {
    accountsCreated: number;
    alreadyConsistent: number;
    skippedInvalid: number;
    conflicts: string[];
}

export class LegacyOsuImportConflictError extends Error {
    readonly code = "legacy_osu_import_conflict";

    constructor(public readonly summary: LegacyOsuImportSummary) {
        super(`Legacy osu! account import stopped with ${summary.conflicts.length} conflict(s)`);
        this.name = "LegacyOsuImportConflictError";
    }
}

export async function importLegacyOsuAccounts(webPool: Pool, botPool: Pool): Promise<LegacyOsuImportSummary> {
    const connection = await webPool.getConnection();
    let lockAcquired = false;
    try {
        const [lockRows] = await connection.execute<LockRow[]>("SELECT GET_LOCK(?, 30) AS acquired", [migrationLockName]);
        lockAcquired = Number(lockRows[0]?.acquired) === 1;
        if (!lockAcquired) throw new Error("Could not acquire the web database migration lock");

        await connection.beginTransaction();
        const summary = await importWithinTransaction(connection, botPool);
        await connection.commit();
        return summary;
    } catch (error) {
        await connection.rollback().catch(() => undefined);
        throw error;
    } finally {
        if (lockAcquired) await connection.execute("SELECT RELEASE_LOCK(?)", [migrationLockName]).catch(() => undefined);
        connection.release();
    }
}

async function importWithinTransaction(connection: PoolConnection, botPool: Pool): Promise<LegacyOsuImportSummary> {
    const summary: LegacyOsuImportSummary = {
        accountsCreated: 0,
        alreadyConsistent: 0,
        skippedInvalid: 0,
        conflicts: [],
    };

    await detectDuplicateAccounts(connection, summary);
    const [accounts] = await connection.execute<AccountRow[]>(
        `SELECT userId, providerId, accountId, createdAt
           FROM account
          WHERE providerId IN ('discord', 'osu')
          ORDER BY providerId, userId, accountId
          FOR UPDATE`,
    );
    const discordAccounts = accounts.filter((account) => account.providerId === "discord");
    const botUsers = await readBotUsers(
        botPool,
        discordAccounts.map((account) => account.accountId),
    );
    const osuBySubject = new Map(accounts.filter((account) => account.providerId === "osu").map((account) => [account.accountId, account]));
    const osuByUser = new Map(accounts.filter((account) => account.providerId === "osu").map((account) => [account.userId, account]));
    const desired: DesiredAccount[] = [];
    const desiredOwners = new Map<string, string>();

    for (const discord of discordAccounts) {
        const botUser = botUsers.get(discord.accountId);
        if (!botUser) continue;
        const osuProviderUserId = normalizeOsuId(botUser.banchoId);
        if (!osuProviderUserId) {
            summary.skippedInvalid += 1;
            continue;
        }

        const desiredOwner = desiredOwners.get(osuProviderUserId);
        if (desiredOwner && desiredOwner !== discord.userId) {
            summary.conflicts.push(`Legacy osu! account ${redact(osuProviderUserId)} maps to multiple canonical users`);
            continue;
        }
        desiredOwners.set(osuProviderUserId, discord.userId);

        const subjectAccount = osuBySubject.get(osuProviderUserId);
        if (subjectAccount && subjectAccount.userId !== discord.userId) {
            summary.conflicts.push(`osu! account ${redact(osuProviderUserId)} already belongs to another canonical user`);
            continue;
        }
        const userAccount = osuByUser.get(discord.userId);
        if (userAccount && userAccount.accountId !== osuProviderUserId) {
            summary.conflicts.push(`Canonical user ${redact(discord.userId)} already has a different osu! account`);
            continue;
        }
        if (subjectAccount) {
            summary.alreadyConsistent += 1;
            continue;
        }
        desired.push({ userId: discord.userId, osuProviderUserId, createdAt: new Date(discord.createdAt) });
    }

    summary.conflicts = [...new Set(summary.conflicts)];
    if (summary.conflicts.length > 0) throw new LegacyOsuImportConflictError(summary);

    for (const account of desired) {
        await connection.execute(
            `INSERT INTO account
                (id, accountId, providerId, userId, accessToken, refreshToken, idToken,
                 accessTokenExpiresAt, refreshTokenExpiresAt, scope, password, createdAt, updatedAt)
             VALUES (?, ?, 'osu', ?, NULL, NULL, NULL, NULL, NULL, NULL, NULL, ?, ?)`,
            [crypto.randomUUID(), account.osuProviderUserId, account.userId, account.createdAt, new Date()],
        );
        summary.accountsCreated += 1;
    }

    return summary;
}

async function detectDuplicateAccounts(connection: PoolConnection, summary: LegacyOsuImportSummary): Promise<void> {
    const [subjectDuplicates] = await connection.execute<DuplicateRow[]>(
        `SELECT providerId AS firstValue, accountId AS secondValue, COUNT(*) AS count
           FROM account
          WHERE providerId IN ('discord', 'osu')
          GROUP BY providerId, accountId
         HAVING COUNT(*) > 1`,
    );
    for (const duplicate of subjectDuplicates) {
        summary.conflicts.push(`Duplicate ${duplicate.firstValue} provider account ${redact(duplicate.secondValue)}`);
    }

    const [slotDuplicates] = await connection.execute<DuplicateRow[]>(
        `SELECT userId AS firstValue, providerId AS secondValue, COUNT(*) AS count
           FROM account
          WHERE providerId IN ('discord', 'osu')
          GROUP BY userId, providerId
         HAVING COUNT(*) > 1`,
    );
    for (const duplicate of slotDuplicates) {
        summary.conflicts.push(`Canonical user ${redact(duplicate.firstValue)} has multiple ${duplicate.secondValue} accounts`);
    }
}

async function readBotUsers(botPool: Pool, discordIds: string[]): Promise<Map<string, BotUserRow>> {
    if (discordIds.length === 0) return new Map();
    const [rows] = await botPool.query<BotUserRow[]>("SELECT id, banchoId FROM users WHERE id IN (?)", [discordIds]);
    return new Map(rows.map((row) => [String(row.id), row]));
}

function normalizeOsuId(value: string | number | null): string | null {
    const normalized = value === null ? "" : String(value).trim();
    return /^[1-9]\d{0,19}$/.test(normalized) ? normalized : null;
}

function redact(value: string): string {
    return value.length <= 8 ? "[redacted]" : `${value.slice(0, 4)}…${value.slice(-4)}`;
}

export function formatLegacyOsuImportSummary(summary: LegacyOsuImportSummary): string {
    return [
        `accounts created: ${summary.accountsCreated}`,
        `already consistent: ${summary.alreadyConsistent}`,
        `skipped invalid: ${summary.skippedInvalid}`,
        `conflicts: ${summary.conflicts.length}`,
    ].join(", ");
}
