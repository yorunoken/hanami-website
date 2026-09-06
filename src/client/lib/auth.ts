import { createAuthClient } from "better-auth/react";

import { createLoginPath, validateReturnTo } from "./auth-navigation";

const authClient = createAuthClient({
    basePath: "/api/auth",
});
export const { signIn, signOut, useSession } = authClient;
export type IdentityProvider = "discord" | "osu";

interface AuthOperationResult {
    error?: unknown;
}

type SocialSignInOperation = (input: {
    provider: "discord";
    callbackURL: string;
    errorCallbackURL: string;
}) => Promise<AuthOperationResult>;

type OsuSignInOperation = (input: { provider: "osu"; callbackURL: string; errorCallbackURL: string }) => Promise<AuthOperationResult>;

type SignOutOperation = () => Promise<AuthOperationResult>;

export async function signInWithDiscord(returnTo?: string, execute: SocialSignInOperation = signIn.social) {
    const callbackURL = validateReturnTo(returnTo);
    const result = await execute({
        provider: "discord",
        callbackURL,
        errorCallbackURL: createLoginPath(callbackURL),
    });

    if (result.error) throw new Error("Discord sign-in could not be started.");
    return result;
}

const signInWithOsuProvider = (
    signIn as unknown as {
        social: (input: { provider: "osu"; callbackURL: string; errorCallbackURL: string }) => Promise<AuthOperationResult>;
    }
).social;

export async function signInWithOsu(returnTo?: string, execute: OsuSignInOperation = signInWithOsuProvider) {
    const callbackURL = validateReturnTo(returnTo);
    const result = await execute({
        provider: "osu",
        callbackURL,
        errorCallbackURL: createLoginPath(callbackURL),
    });

    if (result.error) throw new Error("osu! sign-in could not be started.");
    return result;
}

export async function reauthenticateWithDiscord(callbackURL: string, errorCallbackURL: string) {
    const result = await signIn.social({
        provider: "discord",
        callbackURL: validateReturnTo(callbackURL),
        errorCallbackURL: validateReturnTo(errorCallbackURL, "/profile/privacy"),
    });

    if (result.error) throw new Error("Discord reauthentication could not be started.");
    return result;
}

export async function signOutFromHanami(execute: SignOutOperation = signOut): Promise<void> {
    const result = await execute();
    if (result.error) throw new Error("Sign out could not be completed.");
}

export function claimPendingAttempt(attempt: { current: boolean }): boolean {
    if (attempt.current) return false;
    attempt.current = true;
    return true;
}
