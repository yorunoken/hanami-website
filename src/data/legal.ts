export const legalContacts = {
    privacy: "privacy@yorunoken.com",
    legal: "legal@yorunoken.com",
} as const;

export const legalMetadata = {
    lastUpdated: "July 18, 2026",
    effectiveDate: "July 18, 2026",
} as const;

export const legalServices = [
    { name: "Hanami Web", status: "Hosted account and public site" },
    { name: "Hanami Bot", status: "Hosted Discord bot" },
    { name: "osu!guessr", status: "Separately hosted game" },
    { name: "Hanami Companion", status: "Unfinished local prototype" },
    { name: "Map Analyzer", status: "Distributed Rust library" },
] as const;

export const legalDocuments = [
    {
        title: "Privacy policy",
        path: "/legal/privacy",
        description: "What data Hanami collects, why, and who it is shared with.",
    },
    {
        title: "Terms of service",
        path: "/legal/terms",
        description: "The rules for hosted services, linked accounts, third-party platforms, and unfinished features.",
    },
    {
        title: "Cookie policy",
        path: "/legal/cookies",
        description: "Which cookies, browser storage, and analytics the services use.",
    },
    {
        title: "Data deletion",
        path: "/legal/data-deletion",
        description: "What sign-out, unlinking, account deletion, and privacy requests each do.",
    },
] as const;
