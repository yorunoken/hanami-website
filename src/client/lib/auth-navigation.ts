import { routes } from "@/client/routes/paths";

const unsafeReturnPrefixes = [`${routes.login}/`, "/api/auth/"];
const developmentLoopbackAliases = new Set(["127.0.0.1", "0.0.0.0", "[::1]"]);

export function getCanonicalDevelopmentAuthURL(currentURL: string, isDevelopment: boolean): string | null {
    if (!isDevelopment) return null;

    const url = new URL(currentURL);
    if (!developmentLoopbackAliases.has(url.hostname)) return null;

    url.hostname = "localhost";
    return url.toString();
}

export function validateReturnTo(value: string | null | undefined, fallback: string = routes.profile): string {
    if (!value || value !== value.trim() || !hasValidEncoding(value) || hasControlCharacters(value)) return fallback;
    if (!value.startsWith("/") || value.startsWith("//") || value.includes("\\")) return fallback;

    let decoded = value;
    let fullyDecoded = false;
    for (let depth = 0; depth < 8; depth += 1) {
        try {
            const next = decodeURIComponent(decoded);
            if (next === decoded) {
                fullyDecoded = true;
                break;
            }
            decoded = next;
        } catch {
            return fallback;
        }

        if (!decoded.startsWith("/") || decoded.startsWith("//") || decoded.includes("\\") || hasControlCharacters(decoded))
            return fallback;
    }

    if (!fullyDecoded) return fallback;
    if (isUnsafeReturnPath(value) || isUnsafeReturnPath(decoded)) return fallback;

    return value;
}

export function readReturnTo(search: string, fallback: string = routes.profile): string {
    const rawValue = readRawSearchParameter(search, "returnTo");
    if (rawValue === null) return fallback;

    try {
        return validateReturnTo(decodeURIComponent(rawValue.replaceAll("+", "%20")), fallback);
    } catch {
        return fallback;
    }
}

export function createLoginPath(returnTo: string = routes.profile): string {
    const safeReturnTo = validateReturnTo(returnTo);
    return `${routes.login}?returnTo=${encodeURIComponent(safeReturnTo)}`;
}

function currentInternalLocation(location: Pick<Location, "pathname" | "search" | "hash">): string {
    return validateReturnTo(`${location.pathname}${location.search}${location.hash}`);
}

export function createProtectedLoginPath(location: Pick<Location, "pathname" | "search" | "hash">): string {
    return createLoginPath(currentInternalLocation(location));
}

export function getAuthenticatedLoginDestination(isPending: boolean, hasSession: boolean, returnTo: string): string | null {
    return !isPending && hasSession ? validateReturnTo(returnTo) : null;
}

export function describeOAuthError(code: string | null): string | null {
    if (!code) return null;

    switch (code.toLowerCase()) {
        case "access_denied":
        case "oauth_cancelled":
        case "user_cancelled":
            return "Discord authorization was cancelled. You can try again when you are ready.";
        case "state_not_found":
        case "state_invalid":
        case "state_mismatch":
        case "state_security_mismatch":
        case "invalid_state":
            return "That sign-in request expired or could not be verified. Please start again.";
        case "email_not_found":
            return "Discord did not provide the account details needed to sign in. Please try again.";
        case "unable_to_get_user_info":
        case "oauth_provider_not_found":
        case "provider_unavailable":
            return "Discord sign-in is temporarily unavailable. Please try again shortly.";
        case "unable_to_create_user":
        case "unable_to_create_session":
        case "internal_server_error":
            return "Hanami could not finish creating your session. Please try again.";
        case "initiation_failed":
            return "Discord sign-in could not be started. Check your connection and try again.";
        default:
            return "Discord sign-in did not complete. Please try again.";
    }
}

export function readOAuthError(search: string): string | null {
    const rawValue = readRawSearchParameter(search, "error");
    if (rawValue === null) return null;

    try {
        return describeOAuthError(decodeURIComponent(rawValue.replaceAll("+", "%20")));
    } catch {
        return describeOAuthError("invalid_state");
    }
}

function hasValidEncoding(value: string): boolean {
    try {
        decodeURIComponent(value);
        return true;
    } catch {
        return false;
    }
}

function isUnsafeReturnPath(value: string): boolean {
    const path = value.split(/[?#]/, 1)[0];
    return path === routes.login || path === "/api/auth" || unsafeReturnPrefixes.some((prefix) => path.startsWith(prefix));
}

function hasControlCharacters(value: string): boolean {
    for (const character of value) {
        const codePoint = character.codePointAt(0) ?? 0;
        if (codePoint <= 31 || codePoint === 127) return true;
    }
    return false;
}

function readRawSearchParameter(search: string, name: string): string | null {
    const query = search.startsWith("?") ? search.slice(1) : search;
    for (const pair of query.split("&")) {
        if (!pair) continue;
        const separator = pair.indexOf("=");
        const rawName = separator === -1 ? pair : pair.slice(0, separator);
        try {
            if (decodeURIComponent(rawName.replaceAll("+", "%20")) === name) return separator === -1 ? "" : pair.slice(separator + 1);
        } catch {
            continue;
        }
    }
    return null;
}
