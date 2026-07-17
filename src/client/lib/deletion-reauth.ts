import { routes } from "@/client/routes/paths";
import { validateReturnTo } from "./auth-navigation";

const pendingChallengeKey = "hanami.account-deletion.challenge";

interface SessionStorageLike {
    getItem(key: string): string | null;
    setItem(key: string, value: string): void;
    removeItem(key: string): void;
}

export function prepareDeletionReauthentication(confirmationPath: string, storage?: SessionStorageLike): string {
    const safePath = validateReturnTo(confirmationPath, routes.profilePrivacyConfirm);
    const hashIndex = safePath.indexOf("#");
    const callbackURL = hashIndex === -1 ? safePath : safePath.slice(0, hashIndex);
    const challenge = hashIndex === -1 ? null : new URLSearchParams(safePath.slice(hashIndex + 1)).get("challenge");

    if (callbackURL !== routes.profilePrivacyConfirm || !isChallenge(challenge)) {
        throw new Error("The deletion confirmation could not be prepared. Please try again.");
    }

    const target = storage ?? getBrowserSessionStorage();
    if (!target) throw new Error("This browser could not preserve the deletion confirmation. Please try again.");

    try {
        target.setItem(pendingChallengeKey, challenge);
    } catch {
        throw new Error("This browser could not preserve the deletion confirmation. Please try again.");
    }

    return callbackURL;
}

export function readPendingDeletionChallenge(storage?: SessionStorageLike): string | null {
    const target = storage ?? getBrowserSessionStorage();
    if (!target) return null;

    try {
        const challenge = target.getItem(pendingChallengeKey);
        return isChallenge(challenge) ? challenge : null;
    } catch {
        return null;
    }
}

export function clearPendingDeletionChallenge(storage?: SessionStorageLike): void {
    const target = storage ?? getBrowserSessionStorage();
    if (!target) return;

    try {
        target.removeItem(pendingChallengeKey);
    } catch {
        // Storage cleanup is best-effort after a failed or cancelled redirect.
    }
}

function getBrowserSessionStorage(): SessionStorageLike | null {
    if (typeof window === "undefined") return null;
    try {
        return window.sessionStorage;
    } catch {
        return null;
    }
}

function isChallenge(value: string | null): value is string {
    return value !== null && value.length >= 32 && value.length <= 128;
}
