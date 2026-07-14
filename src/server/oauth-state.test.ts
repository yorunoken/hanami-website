import { describe, expect, it } from "bun:test";

import { createOAuthState, validateOAuthState } from "./oauth-state";

const secret = "test-secret-that-is-long-enough-for-state-signing";
const now = Date.UTC(2026, 6, 14, 12, 0, 0);

describe("osu! OAuth state", () => {
  it("binds the state to the signed-in user", async () => {
    const state = await createOAuthState("user-1", secret, now);
    expect(await validateOAuthState(state, "user-1", secret, now + 1_000)).toBe(
      true,
    );
    expect(await validateOAuthState(state, "user-2", secret, now + 1_000)).toBe(
      false,
    );
  });

  it("rejects tampered and expired state", async () => {
    const state = await createOAuthState("user-1", secret, now);
    expect(
      await validateOAuthState(`${state}x`, "user-1", secret, now + 1_000),
    ).toBe(false);
    expect(
      await validateOAuthState(
        state,
        "user-1",
        secret,
        now + 10 * 60 * 1_000 + 1,
      ),
    ).toBe(false);
  });
});
