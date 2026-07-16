import { oauthProvider } from "@better-auth/oauth-provider";
import { betterAuth } from "better-auth";
import { APIError } from "better-auth/api";
import { genericOAuth, jwt } from "better-auth/plugins";

import { getBaseUrl, getDiscordCallbackUrl, getOsuCallbackUrl, getTrustedOrigins, isSecureProduction } from "./config";
import { getWebDatabase } from "./database";
import { HanamiAccountRepository } from "./identity/account-repository";
import { hanamiAccountsPlugin } from "./identity/plugin";

const pool = getWebDatabase();
const accountRepository = new HanamiAccountRepository(pool);

const discordClientId = process.env.DISCORD_CLIENT_ID || "missing-discord-client-id";
const discordClientSecret = process.env.DISCORD_CLIENT_SECRET || "missing-discord-client-secret";
const osuClientId = process.env.OSU_CLIENT_ID || "missing-osu-client-id";
const osuClientSecret = process.env.OSU_CLIENT_SECRET || "missing-osu-client-secret";

const firstPartyClients = new Set(["osu-guessr", "hanami-companion"]);
const oidcScopes = ["openid", "profile", "osu.identity"] as const;
const issuer = process.env.HANAMI_OAUTH_ISSUER || `${getBaseUrl()}/api/auth`;

export const auth = betterAuth({
    database: pool,
    baseURL: getBaseUrl(),
    basePath: "/api/auth",
    secret: process.env.BETTER_AUTH_SECRET,
    trustedOrigins: getTrustedOrigins(),
    disabledPaths: [
        "/token",
        "/sign-in/social",
        "/sign-in/oauth2",
        "/oauth2/link",
        "/unlink-account",
        "/oauth2/create-client",
        "/oauth2/get-client",
        "/oauth2/get-clients",
        "/oauth2/update-client",
        "/oauth2/client/rotate-secret",
        "/oauth2/delete-client",
    ],
    emailAndPassword: { enabled: false },
    account: {
        encryptOAuthTokens: true,
        storeStateStrategy: "database",
        accountLinking: {
            enabled: true,
            disableImplicitLinking: true,
            allowDifferentEmails: true,
            updateUserInfoOnLink: false,
            allowUnlinkingAll: false,
        },
    },
    user: {
        additionalFields: {
            accountStatus: { type: "string", required: true, defaultValue: "legacy_incomplete", input: false, returned: false },
            identityVersion: { type: "number", required: true, defaultValue: 1, input: false, returned: false },
            identityUpdatedAt: { type: "date", required: true, input: false, returned: false },
            contactEmailAvailable: { type: "boolean", required: true, defaultValue: false, input: false, returned: false },
        },
        deleteUser: { enabled: false },
    },
    session: {
        freshAge: 15 * 60,
        expiresIn: 7 * 24 * 60 * 60,
    },
    advanced: {
        useSecureCookies: isSecureProduction(),
    },
    rateLimit: {
        enabled: true,
        window: 60,
        max: 100,
    },
    socialProviders: {
        discord: {
            clientId: discordClientId,
            clientSecret: discordClientSecret,
            redirectURI: getDiscordCallbackUrl(),
            disableImplicitSignUp: true,
            disableSignUp: true,
            overrideUserInfoOnSignIn: false,
        },
    },
    plugins: [
        jwt({
            jwt: { issuer },
            disableSettingJwtHeader: true,
        }),
        genericOAuth({
            config: [
                {
                    providerId: "osu",
                    clientId: osuClientId,
                    clientSecret: osuClientSecret,
                    authorizationUrl: "https://osu.ppy.sh/oauth/authorize",
                    tokenUrl: "https://osu.ppy.sh/oauth/token",
                    userInfoUrl: "https://osu.ppy.sh/api/v2/me",
                    redirectURI: getOsuCallbackUrl(),
                    scopes: ["identify"],
                    responseType: "code",
                    pkce: true,
                    disableImplicitSignUp: true,
                    disableSignUp: true,
                    overrideUserInfo: false,
                    getUserInfo: async (tokens) => {
                        if (!tokens.accessToken) return null;
                        const response = await fetch("https://osu.ppy.sh/api/v2/me", {
                            headers: { Accept: "application/json", Authorization: `Bearer ${tokens.accessToken}` },
                            redirect: "error",
                            signal: AbortSignal.timeout(8_000),
                        });
                        if (!response.ok) return null;
                        const profile = (await response.json()) as { id?: number | string; username?: string; avatar_url?: string };
                        if (!profile.id || !profile.username) return null;
                        return {
                            id: String(profile.id),
                            name: profile.username,
                            image: profile.avatar_url,
                            email: null,
                            emailVerified: false,
                        };
                    },
                },
            ],
        }),
        hanamiAccountsPlugin(),
        oauthProvider({
            loginPage: "/login",
            consentPage: "/account/consent",
            scopes: oidcScopes,
            grantTypes: ["authorization_code"],
            allowDynamicClientRegistration: false,
            allowUnauthenticatedClientRegistration: false,
            allowPublicClientPrelogin: false,
            cachedTrustedClients: firstPartyClients,
            codeExpiresIn: 60,
            accessTokenExpiresIn: 600,
            idTokenExpiresIn: 600,
            storeClientSecret: "hashed",
            storeTokens: "hashed",
            advertisedMetadata: {
                claims_supported: [
                    "sub",
                    "iss",
                    "aud",
                    "exp",
                    "iat",
                    "sid",
                    "scope",
                    "azp",
                    "name",
                    "picture",
                    "family_name",
                    "given_name",
                    "osu_id",
                    "account_complete",
                ],
            },
            postLogin: {
                page: "/account/complete",
                shouldRedirect: async ({ user }) => !(await isActiveAccount(user.id)),
                consentReferenceId: async ({ user }) => {
                    if (!(await isActiveAccount(user.id))) {
                        throw new APIError("FORBIDDEN", {
                            message: "Complete your Hanami account before authorizing a first-party application.",
                        });
                    }
                    return undefined;
                },
            },
            customIdTokenClaims: async ({ user, scopes }) => createIdentityClaims(user.id, scopes),
            customUserInfoClaims: async ({ user, scopes }) => createIdentityClaims(user.id, scopes),
            customTokenResponseFields: async ({ user }) => {
                if (!user || !(await isActiveAccount(user.id))) {
                    throw new APIError("FORBIDDEN", { message: "Hanami account is incomplete." });
                }
                return {};
            },
        }),
    ],
    onAPIError: {
        errorURL: "/login?error=authentication_failed",
    },
});

async function isActiveAccount(userId: string): Promise<boolean> {
    const identity = await accountRepository.getIdentityByUserId(userId);
    return Boolean(identity && identity.status === "active" && identity.discord && identity.osu);
}

async function createIdentityClaims(userId: string, scopes: readonly string[]): Promise<Record<string, unknown>> {
    const identity = await accountRepository.getIdentityByUserId(userId);
    if (!identity || identity.status !== "active" || !identity.discord || !identity.osu) {
        throw new APIError("FORBIDDEN", { message: "Hanami account is incomplete." });
    }
    if (!scopes.includes("osu.identity")) return { account_complete: true };
    return {
        osu_id: identity.osu.accountId,
        account_complete: true,
    };
}
