export const DELETION_CONFIRMATION_PHRASE = "DELETE MY HANAMI ACCOUNT";
export const REAUTHENTICATION_WINDOW_MS = 15 * 60 * 1000;

export const deletionRequestStatuses = [
  "pending",
  "in_review",
  "processing",
  "completed",
  "rejected",
  "cancelled",
  "failed",
] as const;

export type DeletionRequestStatus = (typeof deletionRequestStatuses)[number];

export interface PublicDeletionRequest {
  requestReference: string;
  status: DeletionRequestStatus;
  requestedAt: string;
  updatedAt: string;
  completedAt: string | null;
  cancelledAt: string | null;
  canCancel: boolean;
  furtherAction: string;
}

export interface DeletionRequestRecord extends PublicDeletionRequest {
  id: string;
  userId: string;
  reauthenticatedAt: string;
  operatorNote: string | null;
  failureReason: string | null;
}

export function normalizeConfirmationPhrase(value: string): string {
  return value.trim().replace(/\s+/g, " ");
}

export function isValidConfirmationPhrase(value: unknown): boolean {
  return (
    typeof value === "string" &&
    normalizeConfirmationPhrase(value) === DELETION_CONFIRMATION_PHRASE
  );
}

export function isFreshAuthentication(
  sessionCreatedAt: Date,
  now = Date.now(),
): boolean {
  const age = now - sessionCreatedAt.getTime();
  return age >= 0 && age < REAUTHENTICATION_WINDOW_MS;
}

export function createChallengeToken(): string {
  return Buffer.from(crypto.getRandomValues(new Uint8Array(32))).toString(
    "base64url",
  );
}

export async function hashChallengeToken(token: string): Promise<string> {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(token),
  );
  return Buffer.from(digest).toString("hex");
}

export function createRequestReference(): string {
  const random = Buffer.from(
    crypto.getRandomValues(new Uint8Array(15)),
  ).toString("base64url");
  return `HAN-${random}`;
}

export function toPublicDeletionRequest(
  record: DeletionRequestRecord,
): PublicDeletionRequest {
  return {
    requestReference: record.requestReference,
    status: record.status,
    requestedAt: record.requestedAt,
    updatedAt: record.updatedAt,
    completedAt: record.completedAt,
    cancelledAt: record.cancelledAt,
    canCancel: record.status === "pending" || record.status === "in_review",
    furtherAction: describeFurtherAction(record.status),
  };
}

function describeFurtherAction(status: DeletionRequestStatus): string {
  switch (status) {
    case "pending":
      return "No action is needed unless the privacy team contacts you for proportionate verification.";
    case "in_review":
      return "The privacy team is identifying the Hanami services covered by your request.";
    case "processing":
      return "Processing has started. The request can no longer be cancelled.";
    case "completed":
      return "Processing is recorded as complete. Contact privacy@yorunoken.com if you have questions about the outcome.";
    case "rejected":
      return "Contact privacy@yorunoken.com if you need the decision explained or reviewed.";
    case "cancelled":
      return "No further action is planned for this request.";
    case "failed":
      return "The privacy team must review a processing problem. Internal error details are not shown here.";
  }
}
