import { oauthProvider } from "@better-auth/oauth-provider";

import { buildOsuClaims, osuClaimNames, type OsuClaimsDatabase } from "./claims";

const coreClaimNames = ["sub", "iss", "aud", "exp", "iat", "sid", "scope", "azp"] as const;
export const osuOAuthContinuationPath = "/oauth/continue/osu";

export function createHanamiOAuthProviderPlugin(database: OsuClaimsDatabase) {
    const customClaims = async ({ user, scopes }: { user?: { id: string } | null; scopes: readonly string[] }) => {
        if (!user) return {};
        const claims = await buildOsuClaims(user.id, scopes, database);
        delete claims.sub;
        return claims;
    };

    return oauthProvider({
        scopes: ["openid", "osu", "offline_access"],
        grantTypes: ["authorization_code", "refresh_token"],
        loginPage: "/login",
        consentPage: "/oauth/consent",
        postLogin: {
            page: osuOAuthContinuationPath,
            consentReferenceId: async () => undefined,
            shouldRedirect: async ({ user, scopes }) => {
                if (!scopes.includes("osu")) return false;
                const profile = await database.osuProfile.findUnique({
                    where: { userId: user.id },
                    select: { osuId: true, username: true, avatarUrl: true },
                });
                return profile === null;
            },
        },
        allowDynamicClientRegistration: false,
        allowUnauthenticatedClientRegistration: false,
        refreshTokenReuseInterval: 0,
        advertisedMetadata: {
            claims_supported: [...coreClaimNames, ...osuClaimNames],
        },
        customAccessTokenClaims: customClaims,
        customIdTokenClaims: customClaims,
        customUserInfoClaims: customClaims,
    });
}
