import { Elysia } from "elysia";

import type { IdentityService } from "../identity";
import { serverIdentity } from "../identity";
import { logSafeFailure } from "../security/http";
import { isSecureToken } from "../security/tokens";
import { renderCompanionApprovalPage } from "./approval-page";
import {
    ACCESS_TOKEN_LIFETIME_MS,
    AUTHORIZATION_CODE_LIFETIME_MS,
    AUTHORIZATION_REQUEST_LIFETIME_MS,
    REFRESH_TOKEN_LIFETIME_MS,
    type CompanionTokenResponse,
    type OAuthErrorCode,
} from "./protocol";
import { createPkceChallenge, createSecureToken, hashToken } from "./security";
import { MySqlCompanionStore, type CompanionStore, type NewTokenSet } from "./store";
import { parseApprovalAction, parseAuthorizationRequest, parseRevocationRequest, parseTokenRequest, readGrantType } from "./validation";
import { trustedOrigins, webDatabase } from "../auth";

interface CompanionRouteDependencies {
    identity: IdentityService;
    store: CompanionStore;
    now(): Date;
    trustedOrigins: readonly string[];
}

const productionDependencies: CompanionRouteDependencies = {
    identity: serverIdentity,
    store: new MySqlCompanionStore(webDatabase),
    now: () => new Date(),
    trustedOrigins,
};

export function createCompanionOAuthRoutes(dependencies: CompanionRouteDependencies = productionDependencies) {
    return new Elysia({ prefix: "/oauth" })
        .get("/authorize", async ({ request, set, redirect }) => {
            setSecurityHeaders(set);
            const identity = await dependencies.identity.getCurrent(request.headers);
            if (!identity) {
                const requestUrl = new URL(request.url);
                const returnTo = `${requestUrl.pathname}${requestUrl.search}`;
                return redirect(`/login?returnTo=${encodeURIComponent(returnTo)}`, 302);
            }

            const authorization = parseAuthorizationRequest(new URL(request.url));
            if (!authorization) return oauthFailure(set, 400, "invalid_request", "The authorization request is invalid.");
            allowCompanionCallback(set, authorization.redirectUri);

            const now = dependencies.now();
            const requestId = crypto.randomUUID();
            const csrfToken = createSecureToken();
            try {
                await dependencies.store.createAuthorizationRequest({
                    ...authorization,
                    id: requestId,
                    userId: identity.userId,
                    sessionId: identity.sessionId,
                    csrfTokenHash: await hashToken(csrfToken),
                    now,
                    expiresAt: new Date(now.getTime() + AUTHORIZATION_REQUEST_LIFETIME_MS),
                });
            } catch (error) {
                logSafeFailure("create Companion approval request", error);
                return oauthFailure(set, 500, "invalid_request", "The approval request could not be created.");
            }

            set.headers["Content-Type"] = "text/html; charset=utf-8";
            return renderCompanionApprovalPage({ authorization, requestId, csrfToken });
        })
        .post("/authorize", async ({ request, body, set, redirect }) => {
            setSecurityHeaders(set);
            const identity = await dependencies.identity.getCurrent(request.headers);
            if (!identity) return oauthFailure(set, 401, "invalid_request", "Authentication is required.");
            if (new URL(request.url).searchParams.size > 0) {
                return oauthFailure(set, 400, "invalid_request", "The approval action is invalid.");
            }
            if (!hasValidApprovalOrigin(request, dependencies.trustedOrigins)) {
                return oauthFailure(set, 403, "invalid_request", "The approval action could not be verified.");
            }
            if (!isFormContentType(request.headers.get("content-type"))) {
                return oauthFailure(set, 415, "invalid_request", "Form encoding is required.");
            }

            const action = parseApprovalAction(body);
            if (!action) return oauthFailure(set, 400, "invalid_request", "The approval action is invalid.");

            const now = dependencies.now();
            let authorization;
            try {
                authorization = await dependencies.store.consumeAuthorizationRequest({
                    id: action.requestId,
                    userId: identity.userId,
                    sessionId: identity.sessionId,
                    csrfTokenHash: await hashToken(action.csrfToken),
                    now,
                });
            } catch (error) {
                logSafeFailure("consume Companion approval request", error);
                return oauthFailure(set, 500, "invalid_request", "The approval action could not be completed.");
            }
            if (!authorization) return oauthFailure(set, 400, "invalid_request", "The approval request expired or was already used.");
            allowCompanionCallback(set, authorization.redirectUri);

            if (action.decision === "cancel") {
                return redirect(
                    createClientRedirect(authorization.redirectUri, { error: "access_denied", state: authorization.state }),
                    302,
                );
            }

            const code = createSecureToken();
            try {
                await dependencies.store.createAuthorizationCode({
                    ...authorization,
                    codeHash: await hashToken(code),
                    now,
                    expiresAt: new Date(now.getTime() + AUTHORIZATION_CODE_LIFETIME_MS),
                });
            } catch (error) {
                logSafeFailure("issue Companion authorization code", error);
                return oauthFailure(set, 500, "invalid_request", "The authorization code could not be issued.");
            }

            return redirect(createClientRedirect(authorization.redirectUri, { code, state: authorization.state }), 302);
        })
        .post("/token", async ({ request, body, set }) => {
            setTokenHeaders(set);
            if (new URL(request.url).searchParams.size > 0) {
                return oauthFailure(set, 400, "invalid_request", "The token request is invalid.");
            }
            if (!isFormContentType(request.headers.get("content-type"))) {
                return oauthFailure(set, 415, "invalid_request", "Form encoding is required.");
            }

            const tokenRequest = parseTokenRequest(body);
            if (!tokenRequest) {
                const error =
                    readGrantType(body) && readGrantType(body) !== "authorization_code" && readGrantType(body) !== "refresh_token"
                        ? "unsupported_grant_type"
                        : "invalid_request";
                return oauthFailure(set, 400, error, "The token request is invalid.");
            }

            const now = dependencies.now();
            const issued = await issueRawTokenSet(now);
            try {
                if (tokenRequest.grantType === "authorization_code") {
                    const redeemed = await dependencies.store.redeemAuthorizationCode({
                        codeHash: await hashToken(tokenRequest.code),
                        clientId: tokenRequest.clientId,
                        redirectUri: tokenRequest.redirectUri,
                        codeChallenge: await createPkceChallenge(tokenRequest.codeVerifier),
                        deviceId: crypto.randomUUID(),
                        familyId: crypto.randomUUID(),
                        tokens: issued.stored,
                        now,
                    });
                    if (!redeemed) return oauthFailure(set, 400, "invalid_grant", "The authorization grant is invalid.");
                    return issued.response;
                }

                const rotation = await dependencies.store.rotateRefreshToken({
                    refreshTokenHash: await hashToken(tokenRequest.refreshToken),
                    clientId: tokenRequest.clientId,
                    tokens: issued.stored,
                    now,
                });
                if (rotation !== "rotated") return oauthFailure(set, 400, "invalid_grant", "The refresh grant is invalid.");
                return issued.response;
            } catch (error) {
                logSafeFailure("exchange Companion token", error);
                return oauthFailure(set, 500, "invalid_request", "The token request could not be completed.");
            }
        })
        .post("/revoke", async ({ request, body, set }) => {
            setTokenHeaders(set);
            if (new URL(request.url).searchParams.size > 0) {
                return oauthFailure(set, 400, "invalid_request", "The revocation request is invalid.");
            }
            if (!isFormContentType(request.headers.get("content-type"))) {
                return oauthFailure(set, 415, "invalid_request", "Form encoding is required.");
            }

            const revocation = parseRevocationRequest(body);
            if (!revocation) return oauthFailure(set, 400, "invalid_request", "The revocation request is invalid.");
            if (isSecureToken(revocation.token)) {
                try {
                    await dependencies.store.revokeByTokenHash({
                        tokenHash: await hashToken(revocation.token),
                        clientId: revocation.clientId,
                        now: dependencies.now(),
                    });
                } catch (error) {
                    logSafeFailure("revoke Companion token family", error);
                }
            }
            set.status = 200;
            return null;
        });
}

async function issueRawTokenSet(now: Date): Promise<{ stored: NewTokenSet; response: CompanionTokenResponse }> {
    const accessToken = createSecureToken();
    const refreshToken = createSecureToken();
    return {
        stored: {
            accessTokenId: crypto.randomUUID(),
            accessTokenHash: await hashToken(accessToken),
            accessTokenExpiresAt: new Date(now.getTime() + ACCESS_TOKEN_LIFETIME_MS),
            refreshTokenId: crypto.randomUUID(),
            refreshTokenHash: await hashToken(refreshToken),
            refreshTokenExpiresAt: new Date(now.getTime() + REFRESH_TOKEN_LIFETIME_MS),
        },
        response: {
            access_token: accessToken,
            token_type: "Bearer",
            expires_in: ACCESS_TOKEN_LIFETIME_MS / 1_000,
            refresh_token: refreshToken,
        },
    };
}

function createClientRedirect(redirectUri: string, parameters: Record<string, string>): string {
    const url = new URL(redirectUri);
    for (const [key, value] of Object.entries(parameters)) url.searchParams.set(key, value);
    return url.toString();
}

function hasValidApprovalOrigin(request: Request, allowedOrigins: readonly string[]): boolean {
    const origin = request.headers.get("origin");
    // Some privacy-focused browsers omit Origin on same-origin form posts or
    // serialize an opaque origin as "null". The approval still requires the
    // request-bound, session-bound, single-use CSRF token checked below.
    if (!origin || origin === "null") return true;
    return origin === new URL(request.url).origin || allowedOrigins.includes(origin);
}

function isFormContentType(value: string | null): boolean {
    return value?.split(";", 1)[0]?.trim().toLowerCase() === "application/x-www-form-urlencoded";
}

function setSecurityHeaders(set: { headers: Record<string, string | number> }): void {
    set.headers["Cache-Control"] = "no-store";
    set.headers["Pragma"] = "no-cache";
    set.headers["Referrer-Policy"] = "no-referrer";
    set.headers["X-Frame-Options"] = "DENY";
    set.headers["Content-Security-Policy"] =
        "default-src 'none'; style-src 'unsafe-inline'; form-action 'self'; frame-ancestors 'none'; base-uri 'none'";
}

function allowCompanionCallback(set: { headers: Record<string, string | number> }, redirectUri: string): void {
    const callbackOrigin = new URL(redirectUri).origin;
    set.headers["Content-Security-Policy"] =
        `default-src 'none'; style-src 'unsafe-inline'; form-action 'self' ${callbackOrigin}; frame-ancestors 'none'; base-uri 'none'`;
}

function setTokenHeaders(set: { headers: Record<string, string | number> }): void {
    setSecurityHeaders(set);
    set.headers["Content-Type"] = "application/json; charset=utf-8";
}

function oauthFailure(
    set: { status?: number | string; headers: Record<string, string | number> },
    status: number,
    error: OAuthErrorCode,
    description: string,
) {
    set.status = status;
    set.headers["Content-Type"] = "application/json; charset=utf-8";
    return { error, error_description: description };
}

export const companionOAuthRoutes = createCompanionOAuthRoutes();
