import { NextResponse } from "next/server";
import mysql from "mysql2/promise";

import { createClient } from "redis";

const tableName = "users";
const tablePrimaryKey = "id";

export async function GET(request: Request) {
    const databaseUrl = process.env.DATABASE_URL;
    if (!databaseUrl) {
        throw new Error("Please set DATABASE_URL in your environment variables.");
    }
    const db = await mysql.createConnection(databaseUrl);

    const redis = createClient({
        url: process.env.REDIS_URL,
    });
    await redis.connect();

    try {
        const { searchParams } = new URL(request.url);
        const code = searchParams.get("code");
        const state = searchParams.get("state");

        if (!code) {
            throw new Error("There seems to have been an error in your request, as `code` doesn't exist in your url parameters. Please try again.");
        }

        let discordId: string | null = null;
        const rawDiscordId = await redis.get(`state:${state}`);
        if (!rawDiscordId) {
            throw new Error(`It seems I couldn't find any discord IDs linked to the state: ${state}`);
        }
        
        try {
            discordId = JSON.parse(rawDiscordId);
        } catch {
            discordId = rawDiscordId;
        }

        const tokenResponse = await fetch("https://osu.ppy.sh/oauth/token", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
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

        const tokenData = await tokenResponse.json();
        const { access_token } = tokenData;

        const userResponse = await fetch("https://osu.ppy.sh/api/v2/me", {
            headers: { Authorization: `Bearer ${access_token}` },
        });

        console.log(userResponse);
        if (!userResponse.ok) {
            throw new Error("Failed to fetch user data (banned user?)");
        }

        const userData = await userResponse.json();
        console.log(userData);

        await redis.del(`state:${state}`);

        // Insert banchoId and id into database.
        await db.execute(`INSERT INTO ${tableName} (${tablePrimaryKey}, banchoId) VALUES (?, ?) ON DUPLICATE KEY UPDATE banchoId = VALUES(banchoId)`, [discordId, userData.id.toString()]);

        return NextResponse.json({ success: true, message: `Successfully authenticated as ${userData.username}. You may close this tab.` });
    } catch (error) {
        console.error("Error during OAuth callback:", error);
        return NextResponse.json({ success: false, message: String(error) });
    } finally {
        await db.end();
        if (redis.isOpen) {
            await redis.quit();
        }
    }
}
