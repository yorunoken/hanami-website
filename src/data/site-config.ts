import { routes, type InternalRoutePath } from "@/client/routes/paths";

export const siteConfig = {
    name: "Hanami",
    url: "https://hanami.yorunoken.com",
    description: "Tools, services, and games built for the osu! community.",
    links: {
        organization: "https://github.com/hanami-osu",
        community: "https://discord.gg/RcGjBZkDP6",
        support: "https://github.com/sponsors/yorunoken",
        discordPrivacy: "https://discord.com/privacy",
        osuPrivacy: "https://osu.ppy.sh/legal/en/Privacy",
        cloudflarePrivacy: "https://www.cloudflare.com/privacypolicy/",
        cloudflareCookies: "https://developers.cloudflare.com/fundamentals/reference/policies-compliances/cloudflare-cookies/",
        kvkk: "https://www.kvkk.gov.tr/",
        kvkkRequests: "https://www.kvkk.gov.tr/Icerik/6638/Comminuque-On-The-Principles-And-Procedures-For-The-Request-To-Data-Controller",
    },
} as const;

export type ProductKey = "bot" | "osuguessr" | "companion" | "map-analyzer";

export interface ProductSummary {
    key: ProductKey;
    name: string;
    route: InternalRoutePath;
    category: string;
    description: string;
    action: string;
    tone: "rose" | "violet" | "cyan" | "lime";
    links: {
        primary: string;
        source: string;
        crate?: string;
    };
}

export const products: readonly ProductSummary[] = [
    {
        key: "bot",
        name: "Hanami Bot",
        route: routes.bot,
        category: "Discord bot",
        description: "Profiles, recent plays, top scores, beatmaps, and performance tools inside Discord.",
        action: "View Hanami Bot",
        tone: "rose",
        links: {
            primary:
                "https://discord.com/oauth2/authorize?client_id=995999045157916763&permissions=347200&scope=bot%20applications.commands",
            source: "https://github.com/hanami-osu/bot",
        },
    },
    {
        key: "osuguessr",
        name: "osu!guessr",
        route: routes.osuguessr,
        category: "Browser game",
        description: "Identify beatmaps from their backgrounds, audio clips, or skin screenshots.",
        action: "View osu!guessr",
        tone: "violet",
        links: {
            primary: "https://osuguessr.com",
            source: "https://github.com/hanami-osu/osu-guessr",
        },
    },
    {
        key: "companion",
        name: "Hanami Companion",
        route: routes.companion,
        category: "Desktop app",
        description: "An osu! desktop app for tracking plays through tosu. Still in development.",
        action: "See the prototype",
        tone: "cyan",
        links: {
            primary: "https://github.com/hanami-osu/companion",
            source: "https://github.com/hanami-osu/companion",
        },
    },
    {
        key: "map-analyzer",
        name: "Map Analyzer",
        route: routes.mapAnalyzer,
        category: "Rust library",
        description: "Inspect stream and jump patterns from local .osu files in Rust.",
        action: "Open Map Analyzer",
        tone: "lime",
        links: {
            primary: "https://docs.rs/osu-map-analyzer/latest/osu_map_analyzer/",
            source: "https://github.com/yorunoken/osu-map-analyzer-lib",
            crate: "https://crates.io/crates/osu-map-analyzer",
        },
    },
] as const;

export const navigation = products.map(({ name, route }) => ({
    label: name,
    to: route,
}));

export function getProduct(key: ProductKey): ProductSummary {
    const product = products.find((item) => item.key === key);
    if (!product) throw new Error(`Unknown product: ${key}`);
    return product;
}

export interface RouteMetadata {
    title: string;
    description: string;
    indexable: boolean;
    socialImage?: string;
}

export const routeMetadata = {
    "/": {
        title: "Hanami | osu! tools and games",
        description: "Hanami Bot, osu!guessr, Hanami Companion, and Map Analyzer: osu! tools and games.",
        indexable: true,
    },
    "/bot": {
        title: "Hanami Bot | osu! Discord bot",
        description:
            "Bring osu! profiles, recent plays, top scores, beatmap details, and performance tools into your Discord server with Hanami Bot.",
        indexable: true,
    },
    "/osuguessr": {
        title: "osu!guessr | Hanami",
        description: "Identify osu! beatmaps from backgrounds, audio clips, and skin screenshots in classic or death mode.",
        indexable: true,
        socialImage: "/products/osuguessr-hero.webp",
    },
    "/companion": {
        title: "Hanami Companion | osu! desktop app",
        description: "Track osu! plays with Hanami Companion. The app is still in development.",
        indexable: true,
        socialImage: "/products/companion-icon.png",
    },
    "/map-analyzer": {
        title: "Map Analyzer | osu! beatmap analysis",
        description: "Analyze stream and jump patterns in .osu files with the published osu-map-analyzer Rust library.",
        indexable: true,
    },
    "/legal": {
        title: "Legal center | Hanami",
        description: "Privacy, terms, cookies, and account deletion for Hanami services.",
        indexable: true,
    },
    "/legal/privacy": {
        title: "Privacy policy | Hanami",
        description: "How Hanami services collect and use your data.",
        indexable: true,
    },
    "/legal/terms": {
        title: "Terms of service | Hanami",
        description: "Rules for using Hanami services.",
        indexable: true,
    },
    "/legal/cookies": {
        title: "Cookie policy | Hanami",
        description: "Cookies and browser storage used by Hanami services.",
        indexable: true,
    },
    "/legal/data-deletion": {
        title: "Data deletion | Hanami",
        description: "How sign-out, unlinking, immediate account deletion, and other privacy requests differ in Hanami.",
        indexable: true,
    },
    "/privacy": {
        title: "Privacy policy | Hanami",
        description: "Redirecting to the current Hanami privacy policy.",
        indexable: false,
    },
    "/privacy-policy": {
        title: "Privacy policy | Hanami",
        description: "Redirecting to the current Hanami privacy policy.",
        indexable: false,
    },
    "/terms": {
        title: "Terms of service | Hanami",
        description: "Redirecting to the current Hanami terms of service.",
        indexable: false,
    },
    "/terms-of-service": {
        title: "Terms of service | Hanami",
        description: "Redirecting to the current Hanami terms of service.",
        indexable: false,
    },
    "/profile": {
        title: "Account | Hanami",
        description: "Manage your linked Discord and osu! accounts and bot preferences.",
        indexable: false,
    },
    "/profile/privacy": {
        title: "Account privacy | Hanami",
        description: "View your account data and delete your Hanami account.",
        indexable: false,
    },
    "/profile/privacy/confirm": {
        title: "Confirm account deletion | Hanami",
        description: "Permanently delete website and Hanami Bot account data after fresh Discord authentication.",
        indexable: false,
    },
    "/login": {
        title: "Sign in | Hanami",
        description: "Sign in to Hanami with Discord or osu!.",
        indexable: false,
    },
    "/link-error": {
        title: "Link unavailable | Hanami",
        description: "The Discord account link expired or was already used.",
        indexable: false,
    },
} as const satisfies Record<string, RouteMetadata>;
