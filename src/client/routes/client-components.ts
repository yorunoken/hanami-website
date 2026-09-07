import { lazy, type ComponentType } from "react";

import { routes, type InternalRoutePath } from "./paths";

type RouteModule<T extends ComponentType = ComponentType> = {
    default: T;
};

function createPreloadableRoute<T extends ComponentType>(loader: () => Promise<RouteModule<T>>) {
    let pendingModule: Promise<RouteModule<T>> | undefined;

    function load() {
        pendingModule ??= loader().catch((error) => {
            pendingModule = undefined;
            throw error;
        });

        return pendingModule;
    }

    return {
        Component: lazy(load),
        preload: load,
    };
}

const accountPrivacy = createPreloadableRoute(() => import("../pages/AccountPrivacy"));
const bot = createPreloadableRoute(() => import("../pages/Bot"));
const companion = createPreloadableRoute(() => import("../pages/Companion"));
const home = createPreloadableRoute(() => import("../pages/Home"));
const linkError = createPreloadableRoute(() => import("../pages/LinkError"));
const login = createPreloadableRoute(() => import("../pages/Login"));
const mapAnalyzer = createPreloadableRoute(() => import("../pages/MapAnalyzer"));
const notFound = createPreloadableRoute(() => import("../pages/NotFound"));
const osuGuessr = createPreloadableRoute(() => import("../pages/OsuGuessr"));
const osuOAuthContinuation = createPreloadableRoute(() => import("../pages/OsuOAuthContinuation"));
const profile = createPreloadableRoute(() => import("../pages/Profile"));

const cookiePolicy = createPreloadableRoute(() => import("@/components/legal/cookie-policy"));
const dataDeletion = createPreloadableRoute(() => import("@/components/legal/data-deletion"));
const legalIndex = createPreloadableRoute(() => import("@/components/legal/legal-index"));
const privacyPolicy = createPreloadableRoute(() => import("@/components/legal/privacy-policy"));
const termsOfService = createPreloadableRoute(() => import("@/components/legal/tos"));

export const clientRouteComponents = {
    AccountPrivacyPage: accountPrivacy.Component,
    BotPage: bot.Component,
    CompanionPage: companion.Component,
    CookiePolicy: cookiePolicy.Component,
    DataDeletion: dataDeletion.Component,
    HomePage: home.Component,
    LegalIndex: legalIndex.Component,
    LinkErrorPage: linkError.Component,
    LoginPage: login.Component,
    MapAnalyzerPage: mapAnalyzer.Component,
    NotFoundPage: notFound.Component,
    OsuGuessrPage: osuGuessr.Component,
    OsuOAuthContinuationPage: osuOAuthContinuation.Component,
    PrivacyPolicy: privacyPolicy.Component,
    ProfilePage: profile.Component,
    TermsOfService: termsOfService.Component,
} as const;

const routePreloaders: Partial<Record<InternalRoutePath, () => Promise<unknown>>> = {
    [routes.home]: home.preload,
    [routes.bot]: bot.preload,
    [routes.osuguessr]: osuGuessr.preload,
    [routes.companion]: companion.preload,
    [routes.mapAnalyzer]: mapAnalyzer.preload,
    [routes.legal]: legalIndex.preload,
    [routes.legalPrivacy]: privacyPolicy.preload,
    [routes.legalTerms]: termsOfService.preload,
    [routes.legalCookies]: cookiePolicy.preload,
    [routes.legalDataDeletion]: dataDeletion.preload,
    [routes.profile]: profile.preload,
    [routes.profilePrivacy]: accountPrivacy.preload,
    [routes.profilePrivacyConfirm]: accountPrivacy.preload,
    [routes.oauthContinuation]: osuOAuthContinuation.preload,
    [routes.login]: login.preload,
    [routes.linkError]: linkError.preload,
};

export function preloadRoute(pathname: string): Promise<unknown> {
    const normalizedPath = pathname === routes.home ? pathname : pathname.replace(/\/+$/, "");
    const preload = routePreloaders[normalizedPath as InternalRoutePath];

    return preload?.() ?? Promise.resolve();
}
