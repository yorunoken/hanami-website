import { Elysia } from "elysia";

import { auth, trustedOrigins, webDatabase } from "../auth";
import { createChallengeToken, hashChallengeToken, isFreshAuthentication, isValidConfirmationPhrase } from "./domain";
import { DeletionRequestStoreError, MySqlDeletionRequestStore, type DeletionRequestStore } from "./store";

interface AuthenticatedSession {
    session: {
        createdAt: Date;
    };
    user: {
        id: string;
    };
}

interface DeletionRequestRouteDependencies {
    getSession(headers: Headers): Promise<AuthenticatedSession | null>;
    store: DeletionRequestStore;
    now(): Date;
}

const productionDependencies: DeletionRequestRouteDependencies = {
    getSession: (headers) => auth.api.getSession({ headers }),
    store: new MySqlDeletionRequestStore(webDatabase),
    now: () => new Date(),
};

export function createDeletionRequestRoutes(dependencies: DeletionRequestRouteDependencies = productionDependencies) {
    return new Elysia({ prefix: "/deletion-requests" })
        .get("/", async ({ request, set }) => {
            set.headers["Cache-Control"] = "no-store";
            const session = await dependencies.getSession(request.headers);
            if (!session) return fail(set, 401, "Sign in to view deletion requests.");

            try {
                return await dependencies.store.getAccountSummary(session.user.id);
            } catch (error) {
                logFailure("read an account deletion request", error);
                return fail(set, 500, "The request status could not be loaded.");
            }
        })
        .post("/reauth/start", async ({ request, set }) => {
            set.headers["Cache-Control"] = "no-store";
            const session = await dependencies.getSession(request.headers);
            if (!session) return fail(set, 401, "Sign in before continuing.");
            if (!hasValidOrigin(request)) return fail(set, 403, "This request could not be verified.");

            try {
                const summary = await dependencies.store.getAccountSummary(session.user.id);
                if (summary.request && ["pending", "in_review", "processing"].includes(summary.request.status)) {
                    return fail(set, 409, "An active account deletion request already exists.");
                }

                const now = dependencies.now();
                const challenge = createChallengeToken();
                const alreadyFresh = isFreshAuthentication(new Date(session.session.createdAt), now.getTime());
                await dependencies.store.startReauthentication({
                    userId: session.user.id,
                    tokenHash: await hashChallengeToken(challenge),
                    now,
                    alreadyFresh,
                });

                const confirmationPath = `/profile/privacy/confirm#challenge=${encodeURIComponent(challenge)}`;
                return {
                    reauthenticationRequired: !alreadyFresh,
                    confirmationPath,
                };
            } catch (error) {
                logFailure("start deletion-request reauthentication", error);
                return fail(set, 500, "Reauthentication could not be started.");
            }
        })
        .post("/reauth/complete", async ({ request, body, set }) => {
            set.headers["Cache-Control"] = "no-store";
            const session = await dependencies.getSession(request.headers);
            if (!session) return fail(set, 401, "Sign in before continuing.");
            if (!hasValidOrigin(request)) return fail(set, 403, "This request could not be verified.");

            const challenge = readChallenge(body);
            if (!challenge) return fail(set, 400, "The reauthentication request is invalid.");

            try {
                const now = dependencies.now();
                const reauthenticatedAt = await dependencies.store.completeReauthentication({
                    userId: session.user.id,
                    tokenHash: await hashChallengeToken(challenge),
                    sessionCreatedAt: new Date(session.session.createdAt),
                    now,
                });
                return {
                    ready: true,
                    reauthenticatedAt: reauthenticatedAt.toISOString(),
                };
            } catch (error) {
                return handleStoreFailure(set, error, "The reauthentication request could not be completed.");
            }
        })
        .post("/", async ({ request, body, set }) => {
            set.headers["Cache-Control"] = "no-store";
            const session = await dependencies.getSession(request.headers);
            if (!session) return fail(set, 401, "Sign in before continuing.");
            if (!hasValidOrigin(request)) return fail(set, 403, "This request could not be verified.");

            const parsed = readCreationBody(body);
            if (!parsed.challenge) return fail(set, 400, "The reauthentication request is invalid.");
            if (!isValidConfirmationPhrase(parsed.confirmationPhrase)) return fail(set, 400, "The confirmation phrase does not match.");

            try {
                const deletionRequest = await dependencies.store.createRequest({
                    userId: session.user.id,
                    tokenHash: await hashChallengeToken(parsed.challenge),
                    now: dependencies.now(),
                });
                return { request: deletionRequest, sessionsRevoked: true };
            } catch (error) {
                return handleStoreFailure(set, error, "The account deletion request could not be submitted.");
            }
        })
        .post("/cancel", async ({ request, set }) => {
            set.headers["Cache-Control"] = "no-store";
            const session = await dependencies.getSession(request.headers);
            if (!session) return fail(set, 401, "Sign in before continuing.");
            if (!hasValidOrigin(request)) return fail(set, 403, "This request could not be verified.");

            try {
                return {
                    request: await dependencies.store.cancelRequest(session.user.id, dependencies.now()),
                };
            } catch (error) {
                return handleStoreFailure(set, error, "The account deletion request could not be cancelled.");
            }
        });
}

export const deletionRequestRoutes = createDeletionRequestRoutes();

function hasValidOrigin(request: Request): boolean {
    const origin = request.headers.get("origin");
    if (!origin) return false;
    const requestOrigin = new URL(request.url).origin;
    return origin === requestOrigin || trustedOrigins.includes(origin);
}

function readChallenge(body: unknown): string | null {
    if (!isRecord(body) || typeof body.challenge !== "string") return null;
    const challenge = body.challenge.trim();
    return challenge.length >= 32 && challenge.length <= 128 ? challenge : null;
}

function readCreationBody(body: unknown): {
    challenge: string | null;
    confirmationPhrase: unknown;
} {
    if (!isRecord(body)) return { challenge: null, confirmationPhrase: null };
    return {
        challenge: readChallenge(body),
        confirmationPhrase: body.confirmationPhrase,
    };
}

function handleStoreFailure(set: { status?: number | string }, error: unknown, fallbackMessage: string) {
    if (error instanceof DeletionRequestStoreError) {
        switch (error.code) {
            case "challenge_invalid":
            case "challenge_stale":
                return fail(set, 403, "Fresh Discord authentication is required. Please start again.");
            case "duplicate_active":
                return fail(set, 409, "An active deletion request already exists.");
            case "not_cancellable":
                return fail(set, 409, "This request can no longer be cancelled online.");
            case "not_found":
                return fail(set, 404, "No deletion request was found.");
        }
    }

    logFailure("process an account deletion request", error);
    return fail(set, 500, fallbackMessage);
}

function fail(set: { status?: number | string }, status: number, error: string) {
    set.status = status;
    return { error };
}

function logFailure(action: string, error: unknown): void {
    console.error(
        `Could not ${action}`,
        error instanceof Error ? { name: error.name, code: readErrorCode(error) } : { type: typeof error },
    );
}

function readErrorCode(error: Error): string | undefined {
    if (!("code" in error) || typeof error.code !== "string") return undefined;
    return error.code.slice(0, 80);
}

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === "object" && value !== null;
}
