import type { Pool, RowDataPacket } from "mysql2/promise";

interface OrphanCandidateRow extends RowDataPacket {
    id: string;
    createdAt: Date;
    accountCount: number | string;
    conflictingIdentityCount: number | string;
}

export interface OrphanAuthenticationUserCandidate {
    userId: string;
    createdAt: Date;
    accountCount: number;
    classification: "no_accounts" | "provider_ownership_conflict";
}

/**
 * Read-only report for failed osu! callback side effects. The placeholder
 * email pattern alone is never enough: a candidate must have no session,
 * projection, or Hanami/Companion data and either no account or an account
 * whose projected subject is owned by another canonical user.
 */
export async function diagnoseOrphanAuthenticationUsers(pool: Pool): Promise<OrphanAuthenticationUserCandidate[]> {
    const [rows] = await pool.execute<OrphanCandidateRow[]>(
        `SELECT user.id,
                user.createdAt,
                (SELECT COUNT(*) FROM account WHERE account.userId = user.id) AS accountCount,
                (
                    SELECT COUNT(*)
                      FROM account
                      JOIN userIdentity
                        ON userIdentity.provider = account.providerId
                       AND userIdentity.providerUserId = account.accountId
                       AND userIdentity.userId <> account.userId
                     WHERE account.userId = user.id
                ) AS conflictingIdentityCount
           FROM user
          WHERE user.email LIKE 'osu-%@users.hanami.invalid'
            AND NOT EXISTS (SELECT 1 FROM session WHERE session.userId = user.id)
            AND NOT EXISTS (SELECT 1 FROM userIdentity WHERE userIdentity.userId = user.id)
            AND NOT EXISTS (SELECT 1 FROM osuOAuthState WHERE osuOAuthState.userId = user.id)
            AND NOT EXISTS (
                SELECT 1 FROM accountDeletionReauthChallenge
                 WHERE accountDeletionReauthChallenge.userId = user.id
            )
            AND NOT EXISTS (
                SELECT 1 FROM companionAuthorizationRequest
                 WHERE companionAuthorizationRequest.userId = user.id
            )
            AND NOT EXISTS (
                SELECT 1 FROM companionAuthorizationCode
                 WHERE companionAuthorizationCode.userId = user.id
            )
            AND NOT EXISTS (SELECT 1 FROM companionDevice WHERE companionDevice.userId = user.id)
            AND NOT EXISTS (SELECT 1 FROM companionTokenFamily WHERE companionTokenFamily.userId = user.id)
            AND NOT EXISTS (SELECT 1 FROM companionAccessToken WHERE companionAccessToken.userId = user.id)
            AND (
                NOT EXISTS (SELECT 1 FROM account WHERE account.userId = user.id)
                OR EXISTS (
                    SELECT 1
                      FROM account
                      JOIN userIdentity
                        ON userIdentity.provider = account.providerId
                       AND userIdentity.providerUserId = account.accountId
                       AND userIdentity.userId <> account.userId
                     WHERE account.userId = user.id
                )
            )
          ORDER BY user.createdAt, user.id`,
    );
    return rows.map((row) => ({
        userId: row.id,
        createdAt: new Date(row.createdAt),
        accountCount: Number(row.accountCount),
        classification: Number(row.conflictingIdentityCount) > 0 ? "provider_ownership_conflict" : "no_accounts",
    }));
}

export function redactCanonicalUserId(userId: string): string {
    return userId.length <= 8 ? "[redacted]" : `${userId.slice(0, 4)}…${userId.slice(-4)}`;
}
