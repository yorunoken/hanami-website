import { Elysia } from "elysia";

import { botPrisma } from "../database/bot";
import { serverIdentity } from "../identity";

interface BotSettings {
    mode: "osu" | "mania" | "taiko" | "fruits";
    score_embeds: 0 | 1;
    embed_type: "hanami" | "bathbot" | "owobot";
    score_data: 0 | 1;
}

const defaultSettings: BotSettings = {
    mode: "osu",
    score_embeds: 1,
    embed_type: "hanami",
    score_data: 0,
};

export const osuLinkRoute = new Elysia()
    .get("/osu-link/status", async ({ request, set }) => {
        const identity = await serverIdentity.getCurrent(request.headers);
        if (!identity) {
            set.status = 401;
            return { error: "Unauthorized" };
        }
        if (new URL(request.url).searchParams.size > 0) {
            set.status = 400;
            return { error: "Invalid request" };
        }

        if (!hasDatabaseConfiguration()) {
            set.status = 500;
            return { error: "Server configuration error" };
        }

        try {
            const discordId = await serverIdentity.resolveDiscordId(identity.userId);
            if (!discordId) {
                set.status = 400;
                return { error: "No Discord account is linked to this session" };
            }

            const user = await botPrisma.user.findUnique({ where: { id: discordId }, select: { banchoId: true } });
            const banchoId = user?.banchoId;
            if (!banchoId) return { linked: false };

            const profile = await fetchPublicOsuProfile(banchoId);
            return {
                linked: true,
                banchoId,
                username: profile?.username ?? "Unknown osu! player",
                avatarUrl: profile?.avatarUrl ?? `https://a.ppy.sh/${banchoId}`,
                globalRank: profile?.globalRank ?? null,
            };
        } catch (error) {
            logRouteFailure("read osu! link status", error);
            set.status = 500;
            return { error: "Could not read the osu! link status" };
        }
    })
    .get("/osu-link/settings", async ({ request, set }) => {
        const identity = await serverIdentity.getCurrent(request.headers);
        if (!identity) {
            set.status = 401;
            return { error: "Unauthorized" };
        }
        if (new URL(request.url).searchParams.size > 0) {
            set.status = 400;
            return { error: "Invalid request" };
        }

        if (!hasDatabaseConfiguration()) {
            set.status = 500;
            return { error: "Server configuration error" };
        }

        try {
            const discordId = await serverIdentity.resolveDiscordId(identity.userId);
            if (!discordId) {
                set.status = 400;
                return { error: "No Discord account is linked to this session" };
            }

            const settings = await botPrisma.user.findUnique({
                where: { id: discordId },
                select: { mode: true, score_embeds: true, embed_type: true, score_data: true },
            });
            if (!settings) return defaultSettings;

            return {
                mode: parseMode(settings.mode),
                score_embeds: parseBinary(settings.score_embeds, defaultSettings.score_embeds),
                embed_type: parseEmbedType(settings.embed_type),
                score_data: parseBinary(settings.score_data, defaultSettings.score_data),
            } satisfies BotSettings;
        } catch (error) {
            logRouteFailure("read bot preferences", error);
            set.status = 500;
            return { error: "Could not read bot preferences" };
        }
    })
    .post("/osu-link/settings", async ({ request, body, set }) => {
        const identity = await serverIdentity.getCurrent(request.headers);
        if (!identity) {
            set.status = 401;
            return { error: "Unauthorized" };
        }
        if (new URL(request.url).searchParams.size > 0) {
            set.status = 400;
            return { error: "Invalid request" };
        }

        const settings = parseSettings(body);
        if (!settings) {
            set.status = 400;
            return { error: "Invalid bot preferences" };
        }

        if (!hasDatabaseConfiguration()) {
            set.status = 500;
            return { error: "Server configuration error" };
        }

        try {
            const discordId = await serverIdentity.resolveDiscordId(identity.userId);
            if (!discordId) {
                set.status = 400;
                return { error: "No Discord account is linked to this session" };
            }

            await botPrisma.user.upsert({
                where: { id: discordId },
                create: { id: discordId, ...settings },
                update: settings,
            });
            return { success: true };
        } catch (error) {
            logRouteFailure("update bot preferences", error);
            set.status = 500;
            return { error: "Could not update bot preferences" };
        }
    });

async function fetchPublicOsuProfile(banchoId: string): Promise<{
    username: string;
    avatarUrl: string;
    globalRank: number | null;
} | null> {
    if (!process.env.OSU_CLIENT_ID || !process.env.OSU_CLIENT_SECRET) return null;

    try {
        const tokenResponse = await fetch("https://osu.ppy.sh/oauth/token", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                client_id: process.env.OSU_CLIENT_ID,
                client_secret: process.env.OSU_CLIENT_SECRET,
                grant_type: "client_credentials",
                scope: "public",
            }),
        });
        if (!tokenResponse.ok) return null;

        const tokenData: unknown = await tokenResponse.json();
        if (!isRecord(tokenData) || typeof tokenData.access_token !== "string") return null;

        const userResponse = await fetch(`https://osu.ppy.sh/api/v2/users/${encodeURIComponent(banchoId)}/osu`, {
            headers: {
                Authorization: `Bearer ${tokenData.access_token}`,
                Accept: "application/json",
            },
        });
        if (!userResponse.ok) return null;

        const userData: unknown = await userResponse.json();
        if (!isRecord(userData)) return null;
        const statistics = isRecord(userData.statistics) ? userData.statistics : null;

        return {
            username: typeof userData.username === "string" ? userData.username : "Unknown osu! player",
            avatarUrl: typeof userData.avatar_url === "string" ? userData.avatar_url : `https://a.ppy.sh/${banchoId}`,
            globalRank: statistics && typeof statistics.global_rank === "number" ? statistics.global_rank : null,
        };
    } catch (error) {
        logRouteFailure("fetch public osu! profile", error);
        return null;
    }
}

function parseSettings(value: unknown): BotSettings | null {
    if (!isRecord(value)) return null;
    const keys = Object.keys(value);
    if (keys.length !== 4 || keys.some((key) => !["mode", "embed_type", "score_embeds", "score_data"].includes(key))) return null;
    if (!isOneOf(value.mode, ["osu", "mania", "taiko", "fruits"] as const)) return null;
    if (!isOneOf(value.embed_type, ["hanami", "bathbot", "owobot"] as const)) return null;
    if (value.score_embeds !== 0 && value.score_embeds !== 1) return null;
    if (value.score_data !== 0 && value.score_data !== 1) return null;

    return {
        mode: value.mode,
        embed_type: value.embed_type,
        score_embeds: value.score_embeds,
        score_data: value.score_data,
    };
}

function parseMode(value: string | null): BotSettings["mode"] {
    return isOneOf(value, ["osu", "mania", "taiko", "fruits"] as const) ? value : defaultSettings.mode;
}

function parseEmbedType(value: string | null): BotSettings["embed_type"] {
    return isOneOf(value, ["hanami", "bathbot", "owobot"] as const) ? value : defaultSettings.embed_type;
}

export function parseBinary(value: number | null, fallback: 0 | 1): 0 | 1 {
    return value === 0 || value === 1 ? value : fallback;
}

function isOneOf<const T extends readonly string[]>(value: unknown, choices: T): value is T[number] {
    return typeof value === "string" && choices.includes(value);
}

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === "object" && value !== null;
}

function hasDatabaseConfiguration(): boolean {
    return Boolean(process.env.BOT_DATABASE_URL && process.env.WEB_DATABASE_URL);
}

function logRouteFailure(action: string, error: unknown): void {
    console.error(`Could not ${action}`, error instanceof Error ? { name: error.name, message: error.message } : { type: typeof error });
}
