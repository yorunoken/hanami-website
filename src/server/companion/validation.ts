import { isSecureToken } from "../security/tokens";
import { COMPANION_CLIENT_ID, type CompanionAuthorizationInput, type CompanionPlatform } from "./protocol";

const allowedAuthorizeParameters = new Set([
    "response_type",
    "client_id",
    "redirect_uri",
    "state",
    "code_challenge",
    "code_challenge_method",
    "device_name",
    "platform",
]);
const codeChallengePattern = /^[A-Za-z0-9_-]{43}$/;
const verifierPattern = /^[A-Za-z0-9._~-]{43,128}$/;
const platformValues = new Set<CompanionPlatform>(["windows", "macos", "linux", "unknown"]);

export function parseAuthorizationRequest(url: URL): CompanionAuthorizationInput | null {
    if (!hasOnlyUniqueParameters(url.searchParams, allowedAuthorizeParameters)) return null;
    if (url.searchParams.get("response_type") !== "code") return null;
    if (url.searchParams.get("client_id") !== COMPANION_CLIENT_ID) return null;

    const redirectUri = url.searchParams.get("redirect_uri");
    const state = url.searchParams.get("state");
    const codeChallenge = url.searchParams.get("code_challenge");
    const codeChallengeMethod = url.searchParams.get("code_challenge_method");
    const rawDeviceName = url.searchParams.get("device_name");
    const rawPlatform = url.searchParams.get("platform") ?? "unknown";

    if (!redirectUri || !isValidCompanionRedirectUri(redirectUri)) return null;
    if (!state || state.length < 16 || state.length > 512 || hasControlCharacters(state)) return null;
    if (!codeChallenge || !codeChallengePattern.test(codeChallenge)) return null;
    if (codeChallengeMethod !== "S256") return null;
    if (!platformValues.has(rawPlatform as CompanionPlatform)) return null;

    const deviceName = rawDeviceName ?? "Hanami Companion";
    if (deviceName !== deviceName.trim() || deviceName.length < 1 || deviceName.length > 100 || hasControlCharacters(deviceName)) {
        return null;
    }

    return {
        clientId: COMPANION_CLIENT_ID,
        redirectUri,
        state,
        codeChallenge,
        codeChallengeMethod: "S256",
        deviceName,
        platform: rawPlatform as CompanionPlatform,
    };
}

export function isValidCompanionRedirectUri(value: string): boolean {
    const match = /^http:\/\/127\.0\.0\.1:([1-9][0-9]{0,4})\/callback$/.exec(value);
    if (!match) return false;
    const port = Number(match[1]);
    if (!Number.isInteger(port) || port > 65_535) return false;

    try {
        const url = new URL(value);
        return (
            url.protocol === "http:" &&
            url.hostname === "127.0.0.1" &&
            url.pathname === "/callback" &&
            !url.username &&
            !url.password &&
            !url.search &&
            !url.hash
        );
    } catch {
        return false;
    }
}

export interface ApprovalActionInput {
    requestId: string;
    csrfToken: string;
    decision: "approve" | "cancel";
}

export function parseApprovalAction(body: unknown): ApprovalActionInput | null {
    if (!isExactStringRecord(body, ["request_id", "csrf_token", "decision"])) return null;
    if (!isUuid(body.request_id) || !isSecureToken(body.csrf_token)) return null;
    if (body.decision !== "approve" && body.decision !== "cancel") return null;
    return { requestId: body.request_id, csrfToken: body.csrf_token, decision: body.decision };
}

export type TokenRequestInput =
    | {
          grantType: "authorization_code";
          clientId: typeof COMPANION_CLIENT_ID;
          code: string;
          redirectUri: string;
          codeVerifier: string;
      }
    | {
          grantType: "refresh_token";
          clientId: typeof COMPANION_CLIENT_ID;
          refreshToken: string;
      };

export function parseTokenRequest(body: unknown): TokenRequestInput | null {
    if (!isRecord(body)) return null;
    if (body.grant_type === "authorization_code") {
        if (!isExactStringRecord(body, ["grant_type", "client_id", "code", "redirect_uri", "code_verifier"])) return null;
        if (body.client_id !== COMPANION_CLIENT_ID || !isSecureToken(body.code)) return null;
        if (!isValidCompanionRedirectUri(body.redirect_uri) || !verifierPattern.test(body.code_verifier)) return null;
        return {
            grantType: "authorization_code",
            clientId: COMPANION_CLIENT_ID,
            code: body.code,
            redirectUri: body.redirect_uri,
            codeVerifier: body.code_verifier,
        };
    }

    if (body.grant_type === "refresh_token") {
        if (!isExactStringRecord(body, ["grant_type", "client_id", "refresh_token"])) return null;
        if (body.client_id !== COMPANION_CLIENT_ID || !isSecureToken(body.refresh_token)) return null;
        return {
            grantType: "refresh_token",
            clientId: COMPANION_CLIENT_ID,
            refreshToken: body.refresh_token,
        };
    }

    return null;
}

export function readGrantType(body: unknown): unknown {
    return isRecord(body) ? body.grant_type : undefined;
}

export function parseRevocationRequest(body: unknown): { clientId: typeof COMPANION_CLIENT_ID; token: string } | null {
    if (!isRecord(body)) return null;
    const keys = Object.keys(body);
    if (keys.some((key) => !["client_id", "token", "token_type_hint"].includes(key))) return null;
    if (
        body.client_id !== COMPANION_CLIENT_ID ||
        typeof body.token !== "string" ||
        body.token.length < 1 ||
        body.token.length > 512 ||
        hasControlCharacters(body.token)
    ) {
        return null;
    }
    if (body.token_type_hint !== undefined && body.token_type_hint !== "access_token" && body.token_type_hint !== "refresh_token") {
        return null;
    }
    return { clientId: COMPANION_CLIENT_ID, token: body.token };
}

function hasOnlyUniqueParameters(parameters: URLSearchParams, allowed: ReadonlySet<string>): boolean {
    const seen = new Set<string>();
    for (const [key] of parameters) {
        if (!allowed.has(key) || seen.has(key)) return false;
        seen.add(key);
    }
    return true;
}

function isExactStringRecord(value: unknown, expectedKeys: readonly string[]): value is Record<string, string> {
    if (!isRecord(value)) return false;
    const keys = Object.keys(value);
    return (
        keys.length === expectedKeys.length &&
        keys.every((key) => expectedKeys.includes(key)) &&
        keys.every((key) => typeof value[key] === "string")
    );
}

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isUuid(value: string): boolean {
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function hasControlCharacters(value: string): boolean {
    for (const character of value) {
        const codePoint = character.codePointAt(0) ?? 0;
        if (codePoint <= 31 || codePoint === 127) return true;
    }
    return false;
}
