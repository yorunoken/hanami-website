import { describe, expect, it } from "bun:test";

import { consumeOAuthState, createOAuthState, type OAuthStateBinding, type OAuthStateStore } from "./oauth-state";

const now = new Date("2026-07-14T12:00:00.000Z");
const binding = { userId: "user-1", sessionId: "session-1" };

describe("osu! OAuth state", () => {
    it("accepts a valid state exactly once", async () => {
        const store = new MemoryOAuthStateStore();
        const state = await createOAuthState(store, binding, now);

        expect(await consumeOAuthState(store, state, binding, new Date(now.getTime() + 1_000))).toBe(true);
        expect(await consumeOAuthState(store, state, binding, new Date(now.getTime() + 2_000))).toBe(false);
    });

    it("rejects a missing state", async () => {
        const store = new MemoryOAuthStateStore();
        expect(await consumeOAuthState(store, undefined, binding, now)).toBe(false);
    });

    it("rejects malformed, expired, and mismatched states", async () => {
        const store = new MemoryOAuthStateStore();
        const state = await createOAuthState(store, binding, now);

        expect(await consumeOAuthState(store, "not-a-state", binding, new Date(now.getTime() + 1_000))).toBe(false);
        expect(await consumeOAuthState(store, state, { ...binding, userId: "user-2" }, new Date(now.getTime() + 1_000))).toBe(false);
        expect(await consumeOAuthState(store, state, { ...binding, sessionId: "session-2" }, new Date(now.getTime() + 1_000))).toBe(false);
        expect(await consumeOAuthState(store, state, binding, new Date(now.getTime() + 10 * 60_000 + 1))).toBe(false);
    });
});

class MemoryOAuthStateStore implements OAuthStateStore {
    private readonly states = new Map<string, OAuthStateBinding & { expiresAt: Date; consumed: boolean }>();

    async create(input: OAuthStateBinding & { stateHash: string; expiresAt: Date }): Promise<void> {
        this.states.set(input.stateHash, { ...input, consumed: false });
    }

    async consume(input: OAuthStateBinding & { stateHash: string; now: Date }): Promise<boolean> {
        const state = this.states.get(input.stateHash);
        if (!state || state.consumed || state.expiresAt <= input.now) return false;
        if (state.userId !== input.userId || state.sessionId !== input.sessionId) return false;
        state.consumed = true;
        return true;
    }
}
