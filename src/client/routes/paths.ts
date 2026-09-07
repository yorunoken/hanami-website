export const routes = {
    home: "/",
    bot: "/bot",
    osuguessr: "/osuguessr",
    companion: "/companion",
    mapAnalyzer: "/map-analyzer",
    legal: "/legal",
    legalPrivacy: "/legal/privacy",
    legalTerms: "/legal/terms",
    legalCookies: "/legal/cookies",
    legalDataDeletion: "/legal/data-deletion",
    profile: "/profile",
    profilePrivacy: "/profile/privacy",
    profilePrivacyConfirm: "/profile/privacy/confirm",
    login: "/login",
    oauthContinuation: "/oauth/continue/osu",
    linkError: "/link-error",
} as const;

export type InternalRoutePath = (typeof routes)[keyof typeof routes];

export const legacyRedirects = {
    "/privacy": routes.legalPrivacy,
    "/privacy-policy": routes.legalPrivacy,
    "/terms": routes.legalTerms,
    "/terms-of-service": routes.legalTerms,
} as const satisfies Record<string, InternalRoutePath>;
