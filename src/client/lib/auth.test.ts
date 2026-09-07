import { describe, expect, it, mock } from "bun:test";

import { claimPendingAttempt, continueOAuthPostLogin, signInWithDiscord, signInWithOsu, signOutFromHanami } from "./auth";

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

    it("preserves the signed OAuth query when continuing post-login authorization", async () => {
        const signedQuery =
            "?scope=openid+osu&client_id=guessr-client&ba_iat=1730000000000&exp=1730000600&ba_param=ba_iat&ba_param=ba_param&ba_param=client_id&ba_param=exp&ba_param=scope&sig=signature";
        const previousWindow = globalThis.window;
        const requests: Request[] = [];

        Object.defineProperty(globalThis, "window", {
            configurable: true,
            value: { location: { search: signedQuery } },
        });

        try {
            await continueOAuthPostLogin({
                fetch: async (input, init) => {
                    requests.push(new Request(new URL(String(input), "http://localhost"), init));
                    return new Response(JSON.stringify({ url: "https://osu-guessr.example.com/callback?code=one" }), {
                        headers: { "Content-Type": "application/json" },
                    });
                },
            });
        } finally {
            Object.defineProperty(globalThis, "window", { configurable: true, value: previousWindow });
        }

        expect(requests).toHaveLength(1);
        expect(requests[0]?.url).toContain("/api/auth/oauth2/continue");
        expect(await requests[0]?.json()).toMatchObject({ postLogin: true, oauth_query: expect.stringContaining("scope=openid+osu") });
    });

    it("accepts the documented continuation response field for compatibility", async () => {
        const signedQuery =
            "?scope=openid+osu&client_id=guessr-client&ba_iat=1730000000000&exp=1730000600&ba_param=ba_iat&ba_param=ba_param&ba_param=client_id&ba_param=exp&ba_param=scope&sig=signature";
        const previousWindow = globalThis.window;
        Object.defineProperty(globalThis, "window", {
            configurable: true,
            value: { location: { search: signedQuery } },
        });

        try {
            await expect(
                continueOAuthPostLogin({
                    fetch: async () =>
                        new Response(JSON.stringify({ redirect_uri: "https://osu-guessr.example.com/callback?code=one" }), {
                            headers: { "Content-Type": "application/json" },
                        }),
                }),
            ).resolves.toBe("https://osu-guessr.example.com/callback?code=one");
        } finally {
            Object.defineProperty(globalThis, "window", { configurable: true, value: previousWindow });
        }
    });
});
