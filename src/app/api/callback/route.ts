import { NextResponse } from "next/server";
import { Database } from "sqlite3";

import { createClient } from "redis";

const tableName = "users";
const tablePrimaryKey = "discord_id";

export async function GET(request: Request) {
    const databasePath = process.env.DATABASE_PATH;
    if (!databasePath) {
        throw new Error("Please set DATABASE_PATH in your environment variables.");
    }
    const db = new Database(databasePath);

    const redis = createClient({
        socket: {
            host: process.env.REDIS_HOST || "localhost",
            port: parseInt(process.env.REDIS_PORT || "6379"),
            connectTimeout: 10000,
        },
        password: process.env.REDIS_PASSWORD,
        database: parseInt(process.env.REDIS_DB || "0"),
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
        discordId = await redis.get(`state:${state}`);
        if (!discordId) {
            throw new Error(`It seems I couldn't find any discord IDs linked to the state: ${state}`);
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

        if (!userResponse.ok) {
            throw new Error("Failed to fetch user data (banned user?)");
        }

        const userData = await userResponse.json();

        await redis.del(`state:${state}`);

        // Insert bancho_id and discord_id into database.
        db.prepare(`INSERT OR REPLACE INTO ${tableName} (${tablePrimaryKey}, bancho_id) VALUES (?, ?);`).run(discordId, userData.id);

        return NextResponse.json({ success: true, message: `Successfully authenticated as ${userData.username}. You may close this tab.` });
    } catch (error) {
        console.error("Error during OAuth callback:", error);
        return NextResponse.json({ success: false, message: String(error) });
    } finally {
        db.close();
        if (redis.isOpen) {
            await redis.quit();
        }
    }
}
