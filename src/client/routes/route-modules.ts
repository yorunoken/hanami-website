import { createRouteModule } from "./create-route-module";
import { routes, type InternalRoutePath } from "./paths";

const accountPrivacy = createRouteModule(() => import("@/client/pages/AccountPrivacy"));
const bot = createRouteModule(() => import("@/client/pages/Bot"));
const companion = createRouteModule(() => import("@/client/pages/Companion"));
const legalIndex = createRouteModule(() => import("@/components/legal/legal-index"));
const legalPrivacy = createRouteModule(() => import("@/components/legal/privacy-policy"));
const legalTerms = createRouteModule(() => import("@/components/legal/tos"));
const legalCookies = createRouteModule(() => import("@/components/legal/cookie-policy"));
const legalDataDeletion = createRouteModule(() => import("@/components/legal/data-deletion"));
const mapAnalyzer = createRouteModule(() => import("@/client/pages/MapAnalyzer"));
const notFound = createRouteModule(() => import("@/client/pages/NotFound"));
const osuguessr = createRouteModule(() => import("@/client/pages/OsuGuessr"));

export const routeModules = {
    accountPrivacy,
    bot,
    companion,
    legalCookies,
    legalDataDeletion,
    legalIndex,
    legalPrivacy,
    legalTerms,
    mapAnalyzer,
    notFound,
    osuguessr,
} as const;

export type RoutePreloader = () => Promise<unknown>;

export const routePreloaders = {
    [routes.bot]: bot.preload,
    [routes.osuguessr]: osuguessr.preload,
    [routes.companion]: companion.preload,
    [routes.mapAnalyzer]: mapAnalyzer.preload,
    [routes.legal]: legalIndex.preload,
    [routes.legalPrivacy]: legalPrivacy.preload,
    [routes.legalTerms]: legalTerms.preload,
    [routes.legalCookies]: legalCookies.preload,
    [routes.legalDataDeletion]: legalDataDeletion.preload,
    [routes.profilePrivacy]: accountPrivacy.preload,
    [routes.profilePrivacyConfirm]: accountPrivacy.preload,
} as const satisfies Partial<Record<InternalRoutePath, RoutePreloader>>;

export function getRoutePreloader(path: string): RoutePreloader | undefined {
    return (routePreloaders as Partial<Record<string, RoutePreloader>>)[path];
}
