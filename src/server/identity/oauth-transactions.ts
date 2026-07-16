import type { Pool, PoolConnection, RowDataPacket } from "mysql2/promise";

import { createSecureToken, hashToken } from "../security/tokens";
import type { IdentityProvider, OAuthIntent } from "./types";

const OAUTH_TRANSACTION_LIFETIME_MS = 10 * 60 * 1000;

interface OAuthTransactionRow extends RowDataPacket {
    id: string;
    pending_registration_id: string | null;
    browser_binding_hash: string;
    user_id: string | null;
    session_id: string | null;
    provider_id: IdentityProvider;
    intent: OAuthIntent;
    code_verifier: string;
    return_to: string;
    expires_at: Date;
    consumed_at: Date | null;
}

export interface OAuthTransaction {
    id: string;
    pendingRegistrationId: string | null;
    browserBindingHash: string;
    userId: string | null;
    sessionId: string | null;
    provider: IdentityProvider;
    intent: OAuthIntent;
    codeVerifier: string;
    returnTo: string;
    expiresAt: Date;
}

export interface CreateOAuthTransactionInput {
    pendingRegistrationId?: string | null;
    browserBindingHash: string;
    userId?: string | null;
    sessionId?: string | null;
    provider: IdentityProvider;
    intent: OAuthIntent;
    returnTo: string;
}

export class OAuthTransactionStore {
    constructor(private readonly pool: Pool) {}

    async create(input: CreateOAuthTransactionInput, now = new Date()): Promise<{ state: string; transaction: OAuthTransaction }> {
        const state = createSecureToken();
        const codeVerifier = createSecureToken();
        const transaction: OAuthTransaction = {
            id: crypto.randomUUID(),
            pendingRegistrationId: input.pendingRegistrationId || null,
            browserBindingHash: input.browserBindingHash,
            userId: input.userId || null,
            sessionId: input.sessionId || null,
            provider: input.provider,
            intent: input.intent,
            codeVerifier,
            returnTo: input.returnTo,
            expiresAt: new Date(now.getTime() + OAUTH_TRANSACTION_LIFETIME_MS),
        };

        await this.pool.execute(
            `INSERT INTO hanami_oauth_transaction (
                id, state_hash, pending_registration_id, browser_binding_hash, user_id, session_id,
                provider_id, intent, code_verifier, return_to, created_at, expires_at, consumed_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL)`,
            [
                transaction.id,
                await hashToken(state),
                transaction.pendingRegistrationId,
                transaction.browserBindingHash,
                transaction.userId,
                transaction.sessionId,
                transaction.provider,
                transaction.intent,
                transaction.codeVerifier,
                transaction.returnTo,
                now,
                transaction.expiresAt,
            ],
        );
        return { state, transaction };
    }

    async consume(
        state: string,
        browserBindingHash: string,
        provider: IdentityProvider,
        now = new Date(),
    ): Promise<OAuthTransaction | null> {
        const connection = await this.pool.getConnection();
        try {
            await connection.beginTransaction();
            const [rows] = await connection.execute<OAuthTransactionRow[]>(
                "SELECT * FROM hanami_oauth_transaction WHERE state_hash = ? LIMIT 1 FOR UPDATE",
                [await hashToken(state)],
            );
            const row = rows[0];
            if (
                !row ||
                row.consumed_at ||
                new Date(row.expires_at) <= now ||
                row.browser_binding_hash !== browserBindingHash ||
                row.provider_id !== provider
            ) {
                await connection.rollback();
                return null;
            }

            const [result] = await connection.execute<{ affectedRows: number } & RowDataPacket>(
                "UPDATE hanami_oauth_transaction SET consumed_at = ? WHERE id = ? AND consumed_at IS NULL",
                [now, row.id],
            );
            if (Number(result.affectedRows) !== 1) {
                await connection.rollback();
                return null;
            }
            await connection.commit();
            return mapTransaction(row);
        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
    }

    async cleanupExpired(now = new Date()): Promise<void> {
        await this.pool.execute("DELETE FROM hanami_oauth_transaction WHERE expires_at <= ? OR consumed_at < DATE_SUB(?, INTERVAL 1 HOUR)", [now, now]);
    }
}

function mapTransaction(row: OAuthTransactionRow): OAuthTransaction {
    return {
        id: row.id,
        pendingRegistrationId: row.pending_registration_id,
        browserBindingHash: row.browser_binding_hash,
        userId: row.user_id,
        sessionId: row.session_id,
        provider: row.provider_id,
        intent: row.intent,
        codeVerifier: row.code_verifier,
        returnTo: row.return_to,
        expiresAt: new Date(row.expires_at),
    };
}

export const oauthTransactionLifetimeMs = OAUTH_TRANSACTION_LIFETIME_MS;

