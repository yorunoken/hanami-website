import { Elysia } from "elysia";
import mysql from "mysql2/promise";
import { createClient } from "redis";

export const callbackRoute = new Elysia().get("/callback", async ({ query, set }) => {
    const databaseUrl = process.env.DATABASE_URL;
    if (!databaseUrl) {
        set.status = 500;
        return { success: false, message: "DATABASE_URL not set" };
    }

    const { code, state } = query;
    if (!code || !state) {
        set.status = 400;
        return { success: false, message: "Missing code or state in url parameters." };
    }

    const db = await mysql.createConnection(databaseUrl);
    const redis = createClient({ url: process.env.REDIS_URL });

    try {
        await redis.connect();

        const rawDiscordId = await redis.get(`state:${state}`);
        if (!rawDiscordId) {
            throw new Error(`Couldn't find any discord IDs linked to the state: ${state}`);
        }

        let discordId: string;
        try {
            discordId = JSON.parse(rawDiscordId);
        } catch {
            discordId = rawDiscordId;
        }

        const tokenResponse = await fetch("https://osu.ppy.sh/oauth/token", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                client_id: process.env.OSU_CLIENT_ID,
                client_secret: process.env.OSU_CLIENT_SECRET,
                code,
                grant_type: "authorization_code",
                redirect_uri: process.env.OSU_CALLBACK_URL,
            }),
        });

        if (!tokenResponse.ok) {
            throw new Error("Failed to fetch token");
        }

        const { access_token } = (await tokenResponse.json()) as any;

        const userResponse = await fetch("https://osu.ppy.sh/api/v2/me", {
            headers: { Authorization: `Bearer ${access_token}` },
        });

        if (!userResponse.ok) {
            throw new Error("Failed to fetch user data (banned user?)");
        }

        const userData = (await userResponse.json()) as any;

        await redis.del(`state:${state}`);

        await db.execute(`INSERT INTO users (id, banchoId) VALUES (?, ?) ON DUPLICATE KEY UPDATE banchoId = VALUES(banchoId)`, [discordId, userData.id.toString()]);

        return { success: true, message: `Successfully authenticated as ${userData.username}. You may close this tab.` };
    } catch (e) {
        console.error("Error during OAuth callback:", e);
        set.status = 500;
        return { success: false, message: String(e) };
    } finally {
        await db.end();
        if (redis.isOpen) {
            await redis.quit();
        }
    }
});
