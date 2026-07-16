import type { PoolConnection } from "mysql2/promise";

import { hashExternalIdentifier } from "../security/tokens";
import type { IdentityProvider } from "./types";

export interface IdentityAuditInput {
    eventType: string;
    canonicalUserId?: string | null;
    provider?: IdentityProvider | null;
    externalIdentifier?: string | null;
    correlationId: string;
    sourceService: "web" | "bot" | "osu-guessr" | "migration";
    outcome: "success" | "blocked" | "conflict" | "expired" | "failure";
}

export async function writeIdentityAudit(connection: PoolConnection, input: IdentityAuditInput): Promise<void> {
    const identifierHash =
        input.provider && input.externalIdentifier
            ? await hashExternalIdentifier(input.provider, input.externalIdentifier)
            : null;

    await connection.execute(
        `INSERT INTO identity_audit_event (
            id, event_type, canonical_user_id, provider_name, external_identifier_hash,
            correlation_id, source_service, outcome, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP(3))`,
        [
            crypto.randomUUID(),
            input.eventType,
            input.canonicalUserId || null,
            input.provider || null,
            identifierHash,
            input.correlationId,
            input.sourceService,
            input.outcome,
        ],
    );
}

export async function writeIdentityAuditSafely(connection: PoolConnection, input: IdentityAuditInput): Promise<void> {
    try {
        await writeIdentityAudit(connection, input);
    } catch (error) {
        console.error("Identity audit sink failed", {
            eventType: input.eventType,
            correlationId: input.correlationId,
            error: error instanceof Error ? error.message : "unknown_error",
        });
    }
}

