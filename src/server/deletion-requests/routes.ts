import { Elysia } from "elysia";
import mysql from "mysql2/promise";

import { auth, trustedOrigins, webDatabase } from "../auth";
import { createChallengeToken, hashChallengeToken, isFreshAuthentication, isValidConfirmationPhrase } from "./domain";
import { AccountDeletionStoreError, MySqlAccountDeletionStore, type AccountDeletionStore } from "./store";

interface AuthenticatedSession {
    session: {
        createdAt: Date;
    };
    user: {
        id: string;
    };
}

interface AccountDeletionRouteDependencies {
    getSession(headers: Headers): Promise<AuthenticatedSession | null>;
    store: AccountDeletionStore;
    now(): Date;
}

const productionDependencies: AccountDeletionRouteDependencies = {
    getSession: (headers) => auth.api.getSession({ headers }),
    store: new MySqlAccountDeletionStore(webDatabase, deleteBotAccountData),
    now: () => new Date(),
};

export function createAccountDeletionRoutes(dependencies: AccountDeletionRouteDependencies = productionDependencies) {
    return new Elysia({ prefix: "/account-deletion" })
        .post("/reauth/start", async ({ request, set }) => {
            set.headers["Cache-Control"] = "no-store";
            const session = await dependencies.getSession(request.headers);
            if (!session) return fail(set, 401, "Sign in before continuing.");
            if (!hasValidOrigin(request)) return fail(set, 403, "This action could not be verified.");

            try {
                const now = dependencies.now();
                const challenge = createChallengeToken();
                const alreadyFresh = isFreshAuthentication(new Date(session.session.createdAt), now.getTime());
                await dependencies.store.startReauthentication({
                    userId: session.user.id,
                    tokenHash: await hashChallengeToken(challenge),
                    now,
                    alreadyFresh,
                });

                return {
                    reauthenticationRequired: !alreadyFresh,
                    confirmationPath: `/profile/privacy/confirm#challenge=${encodeURIComponent(challenge)}`,
                };
            } catch (error) {
                logFailure("start account-deletion reauthentication", error);
                return fail(set, 500, "Reauthentication could not be started.");
            }
        })
        .post("/reauth/complete", async ({ request, body, set }) => {
            set.headers["Cache-Control"] = "no-store";
            const session = await dependencies.getSession(request.headers);
            if (!session) return fail(set, 401, "Sign in before continuing.");
            if (!hasValidOrigin(request)) return fail(set, 403, "This action could not be verified.");

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
                return { ready: true, reauthenticatedAt: reauthenticatedAt.toISOString() };
            } catch (error) {
                return handleStoreFailure(set, error, "Reauthentication could not be completed.");
            }
        })
        .delete("/", async ({ request, body, set }) => {
            set.headers["Cache-Control"] = "no-store";
            const session = await dependencies.getSession(request.headers);
            if (!session) return fail(set, 401, "Sign in before continuing.");
            if (!hasValidOrigin(request)) return fail(set, 403, "This action could not be verified.");

            const parsed = readDeletionBody(body);
            if (!parsed.challenge) return fail(set, 400, "The reauthentication request is invalid.");
            if (!isValidConfirmationPhrase(parsed.confirmationPhrase)) {
                return fail(set, 400, "The confirmation phrase does not match.");
            }

            try {
                await dependencies.store.deleteAccount({
                    userId: session.user.id,
                    tokenHash: await hashChallengeToken(parsed.challenge),
                    now: dependencies.now(),
                });
                return { deleted: true };
            } catch (error) {
                return handleStoreFailure(set, error, "The account could not be deleted.");
            }
        });
}

export const accountDeletionRoutes = createAccountDeletionRoutes();

async function deleteBotAccountData(discordAccountId: string): Promise<void> {
    const databaseURL = process.env.BOT_DATABASE_URL;
    if (!databaseURL) throw new AccountDeletionStoreError("service_unavailable");

    const connection = await mysql.createConnection(databaseURL).catch(() => {
        throw new AccountDeletionStoreError("service_unavailable");
    });
    try {
        await connection.execute("DELETE FROM users WHERE id = ?", [discordAccountId]).catch(() => {
            throw new AccountDeletionStoreError("service_unavailable");
        });
    } finally {
        await connection.end();
    }
}

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

function readDeletionBody(body: unknown): { challenge: string | null; confirmationPhrase: unknown } {
    if (!isRecord(body)) return { challenge: null, confirmationPhrase: null };
    return {
        challenge: readChallenge(body),
        confirmationPhrase: body.confirmationPhrase,
    };
}

function handleStoreFailure(set: { status?: number | string }, error: unknown, fallbackMessage: string) {
    if (error instanceof AccountDeletionStoreError) {
        switch (error.code) {
            case "challenge_invalid":
            case "challenge_stale":
                return fail(set, 403, "Fresh Discord authentication is required. Please start again.");
            case "account_not_found":
                return fail(set, 404, "The signed-in account could not be found.");
            case "service_unavailable":
                return fail(set, 503, "Account deletion is temporarily unavailable. No account data was deleted.");
        }
    }

    logFailure("delete an account", error);
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
