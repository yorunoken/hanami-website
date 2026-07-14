import { describe, expect, it } from "bun:test";

import { hashChallengeToken, type PublicDeletionRequest } from "./domain";
import { createDeletionRequestRoutes } from "./routes";
import { DeletionRequestStoreError, type AccountDeletionSummary, type DeletionRequestStore } from "./store";

const now = new Date("2026-07-14T18:00:00.000Z");

describe("account deletion request routes", () => {
    it("rejects unauthenticated request creation", async () => {
        const { app } = makeApp({ authenticated: false });
        const response = await post(app, "/deletion-requests", {
            challenge: "a".repeat(43),
            confirmationPhrase: "DELETE MY HANAMI ACCOUNT",
        });
        expect(response.status).toBe(401);
    });

    it("requires Discord reauthentication for a stale session", async () => {
        const { app } = makeApp({ sessionAgeMinutes: 16 });
        const response = await post(app, "/deletion-requests/reauth/start", {});
        expect(response.status).toBe(200);
        const data = (await response.json()) as {
            reauthenticationRequired: boolean;
            confirmationPath: string;
        };
        expect(data.reauthenticationRequired).toBe(true);
        expect(data.confirmationPath).toStartWith("/profile/privacy/confirm#challenge=");
    });

    it("lets a freshly authenticated user reach confirmation", async () => {
        const store = new StubStore();
        const { app } = makeApp({ sessionAgeMinutes: 5, store });
        const response = await post(app, "/deletion-requests/reauth/start", {});
        const data = (await response.json()) as {
            reauthenticationRequired: boolean;
            confirmationPath: string;
        };
        expect(data.reauthenticationRequired).toBe(false);
        expect(store.lastStart?.alreadyFresh).toBe(true);
        expect(store.lastStart?.tokenHash).toMatch(/^[a-f0-9]{64}$/);
        expect(data.confirmationPath).not.toContain(store.lastStart?.tokenHash ?? "");
    });

    it("rejects an incorrect confirmation phrase before writing", async () => {
        const store = new StubStore();
        const { app } = makeApp({ store });
        const response = await post(app, "/deletion-requests", {
            challenge: "a".repeat(43),
            confirmationPhrase: "DELETE ACCOUNT",
        });
        expect(response.status).toBe(400);
        expect(store.createCalls).toBe(0);
    });

    it("creates a request for a valid confirmed user", async () => {
        const store = new StubStore();
        const { app } = makeApp({ store });
        const challenge = "a".repeat(43);
        const response = await post(app, "/deletion-requests", {
            challenge,
            confirmationPhrase: "DELETE  MY HANAMI ACCOUNT",
        });
        expect(response.status).toBe(200);
        const data = (await response.json()) as {
            request: PublicDeletionRequest;
            sessionsRevoked: boolean;
        };
        expect(data.request.requestReference).toBe(store.request.requestReference);
        expect(data.sessionsRevoked).toBe(true);
        expect(store.lastCreate?.tokenHash).toBe(await hashChallengeToken(challenge));
    });

    it("rejects a duplicate active request", async () => {
        const store = new StubStore();
        store.createError = new DeletionRequestStoreError("duplicate_active");
        const { app } = makeApp({ store });
        const response = await post(app, "/deletion-requests", {
            challenge: "a".repeat(43),
            confirmationPhrase: "DELETE MY HANAMI ACCOUNT",
        });
        expect(response.status).toBe(409);
        expect(await response.json()).toEqual({
            error: "An active deletion request already exists.",
        });
    });

    it("scopes status reads to the authenticated user", async () => {
        const store = new StubStore();
        store.summaries.set("user-1", {
            discordAccountId: "discord-1",
            request: {
                ...store.request,
                requestReference: "HAN-user1user1user1user",
            },
        });
        store.summaries.set("user-2", {
            discordAccountId: "discord-2",
            request: {
                ...store.request,
                requestReference: "HAN-user2user2user2user",
            },
        });
        const { app } = makeApp({ store, userId: "user-2" });
        const response = await app.handle(new Request("http://localhost/deletion-requests"));
        const data = (await response.json()) as AccountDeletionSummary;
        expect(data.request?.requestReference).toBe("HAN-user2user2user2user");
        expect(data.request?.requestReference).not.toContain("user1");
        expect(store.lastSummaryUserId).toBe("user-2");
    });

    it("allows pending requests to be cancelled", async () => {
        const store = new StubStore();
        const { app } = makeApp({ store });
        const response = await post(app, "/deletion-requests/cancel", {});
        expect(response.status).toBe(200);
        const data = (await response.json()) as {
            request: PublicDeletionRequest;
        };
        expect(data.request.status).toBe("cancelled");
    });

    it("does not cancel processing or completed requests", async () => {
        const store = new StubStore();
        store.cancelError = new DeletionRequestStoreError("not_cancellable");
        const { app } = makeApp({ store });
        const response = await post(app, "/deletion-requests/cancel", {});
        expect(response.status).toBe(409);
    });

    it("does not reflect raw internal errors", async () => {
        const store = new StubStore();
        store.createError = new Error("ER_ACCESS_DENIED production-host password=secret stack");
        const { app } = makeApp({ store });
        const response = await post(app, "/deletion-requests", {
            challenge: "a".repeat(43),
            confirmationPhrase: "DELETE MY HANAMI ACCOUNT",
        });
        expect(response.status).toBe(500);
        const body = JSON.stringify(await response.json());
        expect(body).not.toContain("production-host");
        expect(body).not.toContain("password");
    });

    it("rejects state-changing requests without a trusted Origin", async () => {
        const { app } = makeApp({});
        const response = await app.handle(
            new Request("http://localhost/deletion-requests/cancel", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: "{}",
            }),
        );
        expect(response.status).toBe(403);
    });
});

function makeApp({
    authenticated = true,
    sessionAgeMinutes = 1,
    store = new StubStore(),
    userId = "user-1",
}: {
    authenticated?: boolean;
    sessionAgeMinutes?: number;
    store?: StubStore;
    userId?: string;
}) {
    const routes = createDeletionRequestRoutes({
        getSession: async () =>
            authenticated
                ? {
                      session: {
                          createdAt: new Date(now.getTime() - sessionAgeMinutes * 60_000),
                      },
                      user: { id: userId },
                  }
                : null,
        store,
        now: () => now,
    });
    return { app: routes, store };
}

function post(app: ReturnType<typeof createDeletionRequestRoutes>, path: string, body: Record<string, unknown>) {
    return app.handle(
        new Request(`http://localhost${path}`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Origin: "http://localhost",
            },
            body: JSON.stringify(body),
        }),
    );
}

class StubStore implements DeletionRequestStore {
    readonly request: PublicDeletionRequest = {
        requestReference: "HAN-abcdefghijklmnopqrst",
        status: "pending",
        requestedAt: now.toISOString(),
        updatedAt: now.toISOString(),
        completedAt: null,
        cancelledAt: null,
        canCancel: true,
        furtherAction: "No action needed.",
    };
    readonly summaries = new Map<string, AccountDeletionSummary>();
    lastSummaryUserId: string | null = null;
    lastStart: {
        userId: string;
        tokenHash: string;
        now: Date;
        alreadyFresh: boolean;
    } | null = null;
    lastCreate: { userId: string; tokenHash: string; now: Date } | null = null;
    createCalls = 0;
    createError: Error | null = null;
    cancelError: Error | null = null;

    async getAccountSummary(userId: string): Promise<AccountDeletionSummary> {
        this.lastSummaryUserId = userId;
        return (
            this.summaries.get(userId) ?? {
                discordAccountId: `discord-${userId}`,
                request: null,
            }
        );
    }

    async startReauthentication(input: { userId: string; tokenHash: string; now: Date; alreadyFresh: boolean }): Promise<void> {
        this.lastStart = input;
    }

    async completeReauthentication(input: { userId: string; tokenHash: string; sessionCreatedAt: Date; now: Date }): Promise<Date> {
        return input.now;
    }

    async createRequest(input: { userId: string; tokenHash: string; now: Date }): Promise<PublicDeletionRequest> {
        this.createCalls += 1;
        this.lastCreate = input;
        if (this.createError) throw this.createError;
        return this.request;
    }

    async cancelRequest(_userId: string, cancelAt: Date): Promise<PublicDeletionRequest> {
        if (this.cancelError) throw this.cancelError;
        return {
            ...this.request,
            status: "cancelled",
            cancelledAt: cancelAt.toISOString(),
            updatedAt: cancelAt.toISOString(),
            canCancel: false,
        };
    }
}
