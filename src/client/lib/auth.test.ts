import { describe, expect, it, mock } from "bun:test";

import { claimPendingAttempt, signInWithDiscord, signInWithOsu, signOutFromHanami } from "./auth";

describe("shared authentication actions", () => {
    it("starts Discord OAuth with validated success and error destinations", async () => {
        const execute = mock(async (input: { provider: "discord"; callbackURL: string; errorCallbackURL: string }) => {
            expect(input.provider).toBe("discord");
            return { error: null };
        });

        await signInWithDiscord("/profile/privacy?tab=request#status", execute);

        expect(execute).toHaveBeenCalledTimes(1);
        expect(execute).toHaveBeenCalledWith({
            provider: "discord",
            callbackURL: "/profile/privacy?tab=request#status",
            errorCallbackURL: "/login?returnTo=%2Fprofile%2Fprivacy%3Ftab%3Drequest%23status",
        });
    });

    it("falls back to the profile for unsafe OAuth destinations", async () => {
        let callbackURL = "";
        const execute = mock(async (input: { provider: "discord"; callbackURL: string; errorCallbackURL: string }) => {
            callbackURL = input.callbackURL;
            return { error: null };
        });
        await signInWithDiscord("//example.com", execute);
        expect(callbackURL).toBe("/profile");
    });

    it("starts osu! OAuth with the canonical provider id", async () => {
        const execute = async (input: { provider: "osu"; callbackURL: string; errorCallbackURL: string }) => {
            expect(input).toEqual({
                provider: "osu",
                callbackURL: "/profile",
                errorCallbackURL: "/login?returnTo=%2Fprofile",
            });
            return { error: null };
        };

        await signInWithOsu("/profile", execute);
    });

    it("allows only one pending activation", () => {
        const pending = { current: false };
        expect(claimPendingAttempt(pending)).toBe(true);
        expect(claimPendingAttempt(pending)).toBe(false);
    });

    it("propagates sign-in initiation network failures to the recoverable UI", async () => {
        await expect(
            signInWithDiscord("/profile", async () => {
                throw new Error("network unavailable");
            }),
        ).rejects.toThrow("network unavailable");
    });

    it("completes sign out only after the auth client succeeds", async () => {
        const execute = mock(async () => ({ error: null }));
        await signOutFromHanami(execute);
        expect(execute).toHaveBeenCalledTimes(1);
    });

    it("surfaces sign-out failures without treating them as success", async () => {
        await expect(signOutFromHanami(async () => ({ error: { message: "network" } }))).rejects.toThrow(
            "Sign out could not be completed.",
        );
    });
});
