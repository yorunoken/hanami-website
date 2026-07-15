import { routes, type InternalRoutePath } from "@/client/routes/paths";

export const siteConfig = {
    name: "Hanami",
    url: "https://hanami.yorunoken.com",
    description: "Open-source tools, services, and games built for the osu! community.",
    links: {
        organization: "https://github.com/hanami-osu",
        community: "https://discord.gg/RcGjBZkDP6",
        support: "https://yorunoken.com#support",
        discordPrivacy: "https://discord.com/privacy",
        osuPrivacy: "https://osu.ppy.sh/legal/en/Privacy",
        googlePrivacy: "https://policies.google.com/privacy",
    },
} as const;

export type ProductKey = "bot" | "osuguessr" | "companion" | "map-analyzer";

export interface ProductSummary {
    key: ProductKey;
    name: string;
    shortName: string;
    route: InternalRoutePath;
    status: string;
    category: string;
    headline: string;
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
        shortName: "Bot",
        route: routes.bot,
        status: "Available",
        category: "Discord bot",
        headline: "Bring osu! into the conversation.",
        description: "Profiles, recent plays, top scores, beatmaps, and performance tools inside Discord.",
        action: "Meet Hanami Bot",
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
        shortName: "osu!guessr",
        route: routes.osuguessr,
        status: "Live",
        category: "Browser game",
        headline: "How well do you know your maps?",
        description: "Identify beatmaps from their backgrounds, audio clips, or skin screenshots.",
        action: "Explore the game",
        tone: "violet",
        links: {
            primary: "https://osuguessr.com",
            source: "https://github.com/hanami-osu/osu-guessr",
        },
    },
    {
        key: "companion",
        name: "Hanami Companion",
        shortName: "Companion",
        route: routes.companion,
        status: "Prototype",
        category: "Desktop app",
        headline: "A local bridge, still taking shape.",
        description: "An early Tauri desktop prototype for reading local osu! state through tosu.",
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
        shortName: "Analyzer",
        route: routes.mapAnalyzer,
        status: "Published",
        category: "Rust library & CLI",
        headline: "Inspect the map behind the play.",
        description: "Turn .osu files into readable reports, structured metrics, tags, and feature vectors.",
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

export const routeMetadata = {
    "/": {
        title: "Hanami — osu! tools, games, and open-source projects",
        description:
            "Explore Hanami Bot, osu!guessr, Hanami Companion, and Map Analyzer—four osu!-related tools and experiences built under one open-source ecosystem.",
    },
    "/bot": {
        title: "Hanami Bot — osu! in Discord",
        description:
            "Bring osu! profiles, recent plays, top scores, beatmap details, and performance tools into your Discord server with Hanami Bot.",
    },
    "/osuguessr": {
        title: "osu!guessr — the osu! guessing game",
        description: "Identify osu! beatmaps from backgrounds, audio clips, and skin screenshots in classic or death mode.",
    },
    "/companion": {
        title: "Hanami Companion — desktop prototype",
        description: "Follow the early Hanami Companion desktop prototype for local osu! state tracking through tosu.",
    },
    "/map-analyzer": {
        title: "Map Analyzer — osu! beatmap analysis for Rust",
        description:
            "Analyze .osu files with a published Rust library and CLI that produces reports, metrics, tags, validation, and feature vectors.",
    },
    "/legal": {
        title: "Legal center — Hanami",
        description: "Privacy, terms, cookies, and data-request information for the Hanami ecosystem.",
    },
    "/legal/privacy": {
        title: "Privacy policy — Hanami",
        description: "How the Hanami ecosystem processes account, service, and technical data.",
    },
    "/legal/terms": {
        title: "Terms of service — Hanami",
        description: "Terms for using the hosted Hanami ecosystem.",
    },
    "/legal/cookies": {
        title: "Cookie policy — Hanami",
        description: "Cookies and browser storage used across the Hanami ecosystem.",
    },
    "/legal/data-deletion": {
        title: "Data deletion — Hanami",
        description: "How sign-out, unlinking, immediate account deletion, and other privacy requests differ in Hanami.",
    },
    "/privacy": {
        title: "Privacy policy — Hanami",
        description: "Redirecting to the current Hanami privacy policy.",
    },
    "/privacy-policy": {
        title: "Privacy policy — Hanami",
        description: "Redirecting to the current Hanami privacy policy.",
    },
    "/terms": {
        title: "Terms of service — Hanami",
        description: "Redirecting to the current Hanami terms of service.",
    },
    "/terms-of-service": {
        title: "Terms of service — Hanami",
        description: "Redirecting to the current Hanami terms of service.",
    },
    "/profile": {
        title: "Account — Hanami",
        description: "Manage your linked Hanami and osu! account settings.",
    },
    "/profile/privacy": {
        title: "Account privacy and deletion — Hanami",
        description: "Review the signed-in identity or permanently delete website and Hanami Bot account data.",
    },
    "/profile/privacy/confirm": {
        title: "Confirm account deletion — Hanami",
        description: "Permanently delete website and Hanami Bot account data after fresh Discord authentication.",
    },
    "/login": {
        title: "Sign in — Hanami",
        description: "Continue to Discord to access your Hanami account.",
    },
    "/link-error": {
        title: "Link unavailable — Hanami",
        description: "The Discord account link expired or was already used.",
    },
} as const;
