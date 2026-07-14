import type {
  Pool,
  PoolConnection,
  ResultSetHeader,
  RowDataPacket,
} from "mysql2/promise";

import {
  REAUTHENTICATION_WINDOW_MS,
  createRequestReference,
  toPublicDeletionRequest,
  type DeletionRequestRecord,
  type DeletionRequestStatus,
  type PublicDeletionRequest,
} from "./domain";

export type StoreFailureCode =
  | "challenge_invalid"
  | "challenge_stale"
  | "duplicate_active"
  | "not_cancellable"
  | "not_found";

export class DeletionRequestStoreError extends Error {
  constructor(public readonly code: StoreFailureCode) {
    super(code);
    this.name = "DeletionRequestStoreError";
  }
}

export interface AccountDeletionSummary {
  discordAccountId: string | null;
  request: PublicDeletionRequest | null;
}

export interface DeletionRequestStore {
  getAccountSummary(userId: string): Promise<AccountDeletionSummary>;
  startReauthentication(input: {
    userId: string;
    tokenHash: string;
    now: Date;
    alreadyFresh: boolean;
  }): Promise<void>;
  completeReauthentication(input: {
    userId: string;
    tokenHash: string;
    sessionCreatedAt: Date;
    now: Date;
  }): Promise<Date>;
  createRequest(input: {
    userId: string;
    tokenHash: string;
    now: Date;
  }): Promise<PublicDeletionRequest>;
  cancelRequest(userId: string, now: Date): Promise<PublicDeletionRequest>;
}

interface DeletionRequestRow extends RowDataPacket {
  id: string;
  userId: string;
  status: DeletionRequestStatus;
  requestedAt: Date;
  reauthenticatedAt: Date;
  updatedAt: Date;
  completedAt: Date | null;
  cancelledAt: Date | null;
  operatorNote: string | null;
  failureReason: string | null;
  requestReference: string;
}

interface ChallengeRow extends RowDataPacket {
  id: string;
  userId: string;
  tokenHash: string;
  createdAt: Date;
  expiresAt: Date;
  reauthenticatedAt: Date | null;
  consumedAt: Date | null;
}

interface AccountRow extends RowDataPacket {
  accountId: string;
}

export class MySqlDeletionRequestStore implements DeletionRequestStore {
  constructor(private readonly pool: Pool) {}

  async getAccountSummary(userId: string): Promise<AccountDeletionSummary> {
    const [accountRows, requestRows] = await Promise.all([
      this.pool.execute<AccountRow[]>(
        "SELECT accountId FROM account WHERE userId = ? AND providerId = 'discord' LIMIT 1",
        [userId],
      ),
      this.pool.execute<DeletionRequestRow[]>(
        `SELECT id, userId, status, requestedAt, reauthenticatedAt, updatedAt,
                completedAt, cancelledAt, operatorNote, failureReason, requestReference
           FROM accountDeletionRequest
          WHERE userId = ?
          ORDER BY requestedAt DESC
          LIMIT 1`,
        [userId],
      ),
    ]);

    return {
      discordAccountId: accountRows[0][0]?.accountId ?? null,
      request: requestRows[0][0]
        ? toPublicDeletionRequest(mapRequest(requestRows[0][0]))
        : null,
    };
  }

  async startReauthentication(input: {
    userId: string;
    tokenHash: string;
    now: Date;
    alreadyFresh: boolean;
  }): Promise<void> {
    const expiresAt = new Date(
      input.now.getTime() + REAUTHENTICATION_WINDOW_MS,
    );
    const reauthenticatedAt = input.alreadyFresh ? input.now : null;

    await this.pool.execute(
      `INSERT INTO accountDeletionReauthChallenge
         (id, userId, tokenHash, createdAt, expiresAt, reauthenticatedAt, consumedAt)
       VALUES (?, ?, ?, ?, ?, ?, NULL)
       ON DUPLICATE KEY UPDATE
         id = VALUES(id),
         tokenHash = VALUES(tokenHash),
         createdAt = VALUES(createdAt),
         expiresAt = VALUES(expiresAt),
         reauthenticatedAt = VALUES(reauthenticatedAt),
         consumedAt = NULL`,
      [
        crypto.randomUUID(),
        input.userId,
        input.tokenHash,
        input.now,
        expiresAt,
        reauthenticatedAt,
      ],
    );
  }

  async completeReauthentication(input: {
    userId: string;
    tokenHash: string;
    sessionCreatedAt: Date;
    now: Date;
  }): Promise<Date> {
    return withTransaction(this.pool, async (connection) => {
      const challenge = await getChallengeForUpdate(
        connection,
        input.userId,
        input.tokenHash,
      );
      assertChallengeUsable(challenge, input.now);

      if (challenge.reauthenticatedAt) return challenge.reauthenticatedAt;

      if (
        input.sessionCreatedAt.getTime() <
        challenge.createdAt.getTime() - 5_000
      ) {
        throw new DeletionRequestStoreError("challenge_stale");
      }

      const [result] = await connection.execute<ResultSetHeader>(
        `UPDATE accountDeletionReauthChallenge
            SET reauthenticatedAt = ?
          WHERE id = ? AND reauthenticatedAt IS NULL AND consumedAt IS NULL`,
        [input.now, challenge.id],
      );
      if (result.affectedRows !== 1)
        throw new DeletionRequestStoreError("challenge_invalid");
      return input.now;
    });
  }

  async createRequest(input: {
    userId: string;
    tokenHash: string;
    now: Date;
  }): Promise<PublicDeletionRequest> {
    for (let attempt = 0; attempt < 3; attempt += 1) {
      try {
        return await this.createRequestOnce(input, createRequestReference());
      } catch (error) {
        if (isReferenceCollision(error) && attempt < 2) continue;
        throw error;
      }
    }
    throw new Error("Could not allocate a deletion request reference");
  }

  private async createRequestOnce(
    input: { userId: string; tokenHash: string; now: Date },
    requestReference: string,
  ): Promise<PublicDeletionRequest> {
    return withTransaction(this.pool, async (connection) => {
      const challenge = await getChallengeForUpdate(
        connection,
        input.userId,
        input.tokenHash,
      );
      assertChallengeUsable(challenge, input.now);

      if (
        !challenge.reauthenticatedAt ||
        input.now.getTime() - challenge.reauthenticatedAt.getTime() >=
          REAUTHENTICATION_WINDOW_MS
      ) {
        throw new DeletionRequestStoreError("challenge_stale");
      }

      const [activeRows] = await connection.execute<DeletionRequestRow[]>(
        `SELECT id, userId, status, requestedAt, reauthenticatedAt, updatedAt,
                completedAt, cancelledAt, operatorNote, failureReason, requestReference
           FROM accountDeletionRequest
          WHERE activeUserId = ?
          LIMIT 1
          FOR UPDATE`,
        [input.userId],
      );
      if (activeRows[0])
        throw new DeletionRequestStoreError("duplicate_active");

      const id = crypto.randomUUID();
      await connection.execute(
        `INSERT INTO accountDeletionRequest
          (id, userId, status, requestedAt, reauthenticatedAt, updatedAt,
           completedAt, cancelledAt, operatorNote, failureReason, requestReference)
         VALUES (?, ?, 'pending', ?, ?, ?, NULL, NULL, NULL, NULL, ?)`,
        [
          id,
          input.userId,
          input.now,
          challenge.reauthenticatedAt,
          input.now,
          requestReference,
        ],
      );

      const [challengeResult] = await connection.execute<ResultSetHeader>(
        `UPDATE accountDeletionReauthChallenge
            SET consumedAt = ?
          WHERE id = ? AND consumedAt IS NULL`,
        [input.now, challenge.id],
      );
      if (challengeResult.affectedRows !== 1)
        throw new DeletionRequestStoreError("challenge_invalid");

      // Better Auth sessions live in this database. Removing them in the same
      // transaction prevents a durable request from being created while session
      // revocation silently fails.
      await connection.execute("DELETE FROM session WHERE userId = ?", [
        input.userId,
      ]);

      return toPublicDeletionRequest({
        id,
        userId: input.userId,
        status: "pending",
        requestedAt: input.now.toISOString(),
        reauthenticatedAt: challenge.reauthenticatedAt.toISOString(),
        updatedAt: input.now.toISOString(),
        completedAt: null,
        cancelledAt: null,
        operatorNote: null,
        failureReason: null,
        requestReference,
        canCancel: true,
        furtherAction: "",
      });
    });
  }

  async cancelRequest(
    userId: string,
    now: Date,
  ): Promise<PublicDeletionRequest> {
    return withTransaction(this.pool, async (connection) => {
      const [rows] = await connection.execute<DeletionRequestRow[]>(
        `SELECT id, userId, status, requestedAt, reauthenticatedAt, updatedAt,
                completedAt, cancelledAt, operatorNote, failureReason, requestReference
           FROM accountDeletionRequest
          WHERE userId = ?
          ORDER BY requestedAt DESC
          LIMIT 1
          FOR UPDATE`,
        [userId],
      );
      const request = rows[0];
      if (!request) throw new DeletionRequestStoreError("not_found");
      if (request.status !== "pending" && request.status !== "in_review")
        throw new DeletionRequestStoreError("not_cancellable");

      const [result] = await connection.execute<ResultSetHeader>(
        `UPDATE accountDeletionRequest
            SET status = 'cancelled', cancelledAt = ?, updatedAt = ?
          WHERE id = ? AND status IN ('pending', 'in_review')`,
        [now, now, request.id],
      );
      if (result.affectedRows !== 1)
        throw new DeletionRequestStoreError("not_cancellable");

      return toPublicDeletionRequest(
        mapRequest({
          ...request,
          status: "cancelled",
          cancelledAt: now,
          updatedAt: now,
        }),
      );
    });
  }
}

async function getChallengeForUpdate(
  connection: PoolConnection,
  userId: string,
  tokenHash: string,
): Promise<ChallengeRow> {
  const [rows] = await connection.execute<ChallengeRow[]>(
    `SELECT id, userId, tokenHash, createdAt, expiresAt, reauthenticatedAt, consumedAt
       FROM accountDeletionReauthChallenge
      WHERE userId = ? AND tokenHash = ?
      LIMIT 1
      FOR UPDATE`,
    [userId, tokenHash],
  );
  if (!rows[0]) throw new DeletionRequestStoreError("challenge_invalid");
  return rows[0];
}

function assertChallengeUsable(challenge: ChallengeRow, now: Date): void {
  if (challenge.consumedAt)
    throw new DeletionRequestStoreError("challenge_invalid");
  if (challenge.expiresAt.getTime() <= now.getTime())
    throw new DeletionRequestStoreError("challenge_stale");
}

function mapRequest(row: DeletionRequestRow): DeletionRequestRecord {
  return {
    id: row.id,
    userId: row.userId,
    status: row.status,
    requestedAt: row.requestedAt.toISOString(),
    reauthenticatedAt: row.reauthenticatedAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    completedAt: row.completedAt?.toISOString() ?? null,
    cancelledAt: row.cancelledAt?.toISOString() ?? null,
    operatorNote: row.operatorNote,
    failureReason: row.failureReason,
    requestReference: row.requestReference,
    canCancel: row.status === "pending" || row.status === "in_review",
    furtherAction: "",
  };
}

async function withTransaction<T>(
  pool: Pool,
  callback: (connection: PoolConnection) => Promise<T>,
): Promise<T> {
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

function isReferenceCollision(error: unknown): boolean {
  return (
    isMysqlError(error) &&
    error.errno === 1062 &&
    error.message.includes("accountDeletionRequest_reference_unique")
  );
}

function isMysqlError(
  error: unknown,
): error is { errno: number; message: string } {
  return (
    typeof error === "object" &&
    error !== null &&
    "errno" in error &&
    typeof error.errno === "number" &&
    "message" in error &&
    typeof error.message === "string"
  );
}
