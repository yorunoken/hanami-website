export const COMPANION_CLIENT_ID = "hanami-companion";
export const AUTHORIZATION_REQUEST_LIFETIME_MS = 10 * 60_000;
export const AUTHORIZATION_CODE_LIFETIME_MS = 5 * 60_000;
export const ACCESS_TOKEN_LIFETIME_MS = 15 * 60_000;
export const REFRESH_TOKEN_LIFETIME_MS = 30 * 24 * 60 * 60_000;

export interface CompanionAuthorizationInput {
    clientId: typeof COMPANION_CLIENT_ID;
    redirectUri: string;
    state: string;
    codeChallenge: string;
    codeChallengeMethod: "S256";
    deviceName: string;
    platform: CompanionPlatform;
}

export type CompanionPlatform = "windows" | "macos" | "linux" | "unknown";

export interface CompanionTokenResponse {
    access_token: string;
    token_type: "Bearer";
    expires_in: number;
    refresh_token: string;
}

export type OAuthErrorCode = "invalid_request" | "invalid_client" | "invalid_grant" | "unsupported_grant_type";
