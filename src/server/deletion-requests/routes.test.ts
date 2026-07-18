import { describe, expect, it } from "bun:test";

import { hashChallengeToken } from "./domain";
import { createAccountDeletionRoutes } from "./routes";
import { AccountDeletionStoreError, type AccountDeletionStore } from "./store";

const now = new Date("2026-07-14T18:00:00.000Z");

describe("immediate account deletion routes", () => {
    it("rejects unauthenticated deletion", async () => {
        const { app } = makeApp({ authenticated: false });
        const response = await sendDelete(app, {
            challenge: "a".repeat(43),
            confirmationPhrase: "DELETE MY HANAMI ACCOUNT",
        });
        expect(response.status).toBe(401);
    });

    it("requires provider reauthentication for a stale session", async () => {
        const { app } = makeApp({ sessionAgeMinutes: 16 });
        const response = await post(app, "/account-deletion/reauth/start", {});
        expect(response.status).toBe(200);
        const data = (await response.json()) as { reauthenticationRequired: boolean; confirmationPath: string };
        expect(data.reauthenticationRequired).toBe(true);
        expect(data.confirmationPath).toStartWith("/profile/privacy/confirm#challenge=");
    });

    it("lets a freshly authenticated user reach confirmation", async () => {
        const store = new StubStore();
        const { app } = makeApp({ sessionAgeMinutes: 5, store });
        const response = await post(app, "/account-deletion/reauth/start", {});
        const data = (await response.json()) as { reauthenticationRequired: boolean; confirmationPath: string };
        expect(data.reauthenticationRequired).toBe(false);
        expect(store.lastStart?.alreadyFresh).toBe(true);
        expect(store.lastStart?.tokenHash).toMatch(/^[a-f0-9]{64}$/);
        expect(data.confirmationPath).not.toContain(store.lastStart?.tokenHash ?? "");
    });

    it("rejects an incorrect confirmation phrase before deleting", async () => {
        const store = new StubStore();
        const { app } = makeApp({ store });
        const response = await sendDelete(app, {
            challenge: "a".repeat(43),
            confirmationPhrase: "DELETE ACCOUNT",
        });
        expect(response.status).toBe(400);
        expect(store.deleteCalls).toBe(0);
    });

    it("deletes the verified signed-in account immediately", async () => {
        const store = new StubStore();
        const { app } = makeApp({ store, userId: "user-2" });
        const challenge = "a".repeat(43);
        const response = await sendDelete(app, {
            challenge,
            confirmationPhrase: "DELETE  MY HANAMI ACCOUNT",
        });
        expect(response.status).toBe(200);
        expect(await response.json()).toEqual({ deleted: true });
        expect(store.lastDelete).toEqual({
            userId: "user-2",
            tokenHash: await hashChallengeToken(challenge),
            now,
        });
    });

    it("does not report success when linked service deletion is unavailable", async () => {
        const store = new StubStore();
        store.deleteError = new AccountDeletionStoreError("service_unavailable");
        const { app } = makeApp({ store });
        const response = await sendDelete(app, {
            challenge: "a".repeat(43),
            confirmationPhrase: "DELETE MY HANAMI ACCOUNT",
        });
        expect(response.status).toBe(503);
        expect(await response.json()).toEqual({
            error: "Account deletion is temporarily unavailable. No account data was deleted.",
        });
    });

    it("does not reflect raw internal errors", async () => {
        const store = new StubStore();
        store.deleteError = new Error("ER_ACCESS_DENIED production-host password=secret stack");
        const { app } = makeApp({ store });
        const response = await sendDelete(app, {
            challenge: "a".repeat(43),
            confirmationPhrase: "DELETE MY HANAMI ACCOUNT",
        });
        expect(response.status).toBe(500);
        const body = JSON.stringify(await response.json());
        expect(body).not.toContain("production-host");
        expect(body).not.toContain("password");
    });

    it("rejects deletion without a trusted Origin", async () => {
        const { app } = makeApp({});
        const response = await app.handle(
            new Request("http://localhost/account-deletion", {
                method: "DELETE",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    challenge: "a".repeat(43),
                    confirmationPhrase: "DELETE MY HANAMI ACCOUNT",
                }),
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
    const routes = createAccountDeletionRoutes({
        getSession: async () =>
            authenticated
                ? {
                      session: { createdAt: new Date(now.getTime() - sessionAgeMinutes * 60_000) },
                      user: { id: userId },
                  }
                : null,
        store,
        now: () => now,
    });
    return { app: routes, store };
}

function post(app: ReturnType<typeof createAccountDeletionRoutes>, path: string, body: Record<string, unknown>) {
    return app.handle(
        new Request(`http://localhost${path}`, {
            method: "POST",
            headers: { "Content-Type": "application/json", Origin: "http://localhost" },
            body: JSON.stringify(body),
        }),
    );
}

function sendDelete(app: ReturnType<typeof createAccountDeletionRoutes>, body: Record<string, unknown>) {
    return app.handle(
        new Request("http://localhost/account-deletion", {
            method: "DELETE",
            headers: { "Content-Type": "application/json", Origin: "http://localhost" },
            body: JSON.stringify(body),
        }),
    );
}

class StubStore implements AccountDeletionStore {
    lastStart: { userId: string; tokenHash: string; now: Date; alreadyFresh: boolean } | null = null;
    lastDelete: { userId: string; tokenHash: string; now: Date } | null = null;
    deleteCalls = 0;
    deleteError: Error | null = null;

    async startReauthentication(input: { userId: string; tokenHash: string; now: Date; alreadyFresh: boolean }): Promise<void> {
        this.lastStart = input;
    }

    async completeReauthentication(input: { userId: string; tokenHash: string; sessionCreatedAt: Date; now: Date }): Promise<Date> {
        return input.now;
    }

    async deleteAccount(input: { userId: string; tokenHash: string; now: Date }): Promise<void> {
        this.deleteCalls += 1;
        this.lastDelete = input;
        if (this.deleteError) throw this.deleteError;
    }
}
