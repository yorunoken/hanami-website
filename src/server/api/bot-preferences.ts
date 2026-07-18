import { Elysia } from "elysia";
import mysql, { type Connection, type RowDataPacket } from "mysql2/promise";

import { serverIdentity } from "../identity";
import { logSafeFailure } from "../security/http";

interface BotSettingsRow extends RowDataPacket {
    mode: BotSettings["mode"] | null;
    score_embeds: 0 | 1 | null;
    embed_type: BotSettings["embed_type"] | null;
    score_data: 0 | 1 | null;
}

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

export const botPreferenceRoutes = new Elysia({ prefix: "/bot-preferences" })
    .get("/", async ({ request, set }) => {
        const identity = await serverIdentity.getCurrent(request.headers);
        if (!identity) return fail(set, 401, "Unauthorized");
        if (new URL(request.url).searchParams.size > 0) return fail(set, 400, "Invalid request");

        try {
            const discordId = await serverIdentity.resolveDiscordId(identity.userId);
            if (!discordId) return { available: false, settings: null };

            return await withBotDatabase(async (botDb) => {
                const [users] = await botDb.execute<BotSettingsRow[]>(
                    "SELECT mode, score_embeds, embed_type, score_data FROM users WHERE id = ?",
                    [discordId],
                );
                const settings = users[0];
                return {
                    available: true,
                    settings: settings
                        ? {
                              mode: settings.mode ?? defaultSettings.mode,
                              score_embeds: settings.score_embeds ?? defaultSettings.score_embeds,
                              embed_type: settings.embed_type ?? defaultSettings.embed_type,
                              score_data: settings.score_data ?? defaultSettings.score_data,
                          }
                        : defaultSettings,
                };
            });
        } catch (error) {
            logSafeFailure("read Bot preferences", error);
            return fail(set, 500, "Bot preferences could not be loaded.");
        }
    })
    .post("/", async ({ request, body, set }) => {
        const identity = await serverIdentity.getCurrent(request.headers);
        if (!identity) return fail(set, 401, "Unauthorized");
        if (new URL(request.url).searchParams.size > 0) return fail(set, 400, "Invalid request");

        const settings = parseSettings(body);
        if (!settings) return fail(set, 400, "Invalid bot preferences");

        try {
            const discordId = await serverIdentity.resolveDiscordId(identity.userId);
            if (!discordId) return fail(set, 409, "Link Discord before managing Bot preferences.");

            await withBotDatabase(async (botDb) => {
                await botDb.execute(
                    `INSERT INTO users (id, mode, score_embeds, embed_type, score_data)
                     VALUES (?, ?, ?, ?, ?)
                     ON DUPLICATE KEY UPDATE
                         mode = VALUES(mode),
                         score_embeds = VALUES(score_embeds),
                         embed_type = VALUES(embed_type),
                         score_data = VALUES(score_data)`,
                    [discordId, settings.mode, settings.score_embeds, settings.embed_type, settings.score_data],
                );
            });
            return { success: true };
        } catch (error) {
            logSafeFailure("update Bot preferences", error);
            return fail(set, 500, "Bot preferences could not be saved.");
        }
    });

async function withBotDatabase<T>(callback: (botDb: Connection) => Promise<T>): Promise<T> {
    const databaseUrl = process.env.BOT_DATABASE_URL;
    if (!databaseUrl) throw Object.assign(new Error("Bot database is not configured"), { code: "configuration_missing" });

    let botDb: Connection | null = null;
    try {
        botDb = await mysql.createConnection(databaseUrl);
        return await callback(botDb);
    } finally {
        await botDb?.end();
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

function isOneOf<const T extends readonly string[]>(value: unknown, choices: T): value is T[number] {
    return typeof value === "string" && choices.includes(value);
}

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === "object" && value !== null;
}

function fail(set: { status?: number | string }, status: number, error: string) {
    set.status = status;
    return { error };
}
