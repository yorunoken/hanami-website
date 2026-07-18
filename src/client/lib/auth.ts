import { createAuthClient } from "better-auth/react";
import { genericOAuthClient } from "better-auth/client/plugins";

import { createLoginPath, validateReturnTo } from "./auth-navigation";

const authClient = createAuthClient({
    basePath: "/api/auth",
    plugins: [genericOAuthClient()],
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

export async function signInWithOsu(returnTo?: string) {
    const callbackURL = validateReturnTo(returnTo);
    const result = await signIn.oauth2({
        providerId: "osu",
        callbackURL,
        errorCallbackURL: createLoginPath(callbackURL),
        requestSignUp: true,
    });

    if (result.error) throw new Error("osu! sign-in could not be started.");
    return result;
}

export async function signInWithProvider(provider: IdentityProvider, returnTo?: string) {
    return provider === "discord" ? signInWithDiscord(returnTo) : signInWithOsu(returnTo);
}

export async function reauthenticateWithProvider(provider: IdentityProvider, callbackURL: string, errorCallbackURL: string) {
    const safeCallbackURL = validateReturnTo(callbackURL);
    const safeErrorCallbackURL = validateReturnTo(errorCallbackURL, "/profile/privacy");
    const result =
        provider === "discord"
            ? await signIn.social({
                  provider: "discord",
                  callbackURL: safeCallbackURL,
                  errorCallbackURL: safeErrorCallbackURL,
              })
            : await signIn.oauth2({
                  providerId: "osu",
                  callbackURL: safeCallbackURL,
                  errorCallbackURL: safeErrorCallbackURL,
              });

    if (result.error) throw new Error(`${provider === "osu" ? "osu!" : "Discord"} reauthentication could not be started.`);
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
