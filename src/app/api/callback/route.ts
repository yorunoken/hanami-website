import { NextResponse } from "next/server";
import { Database } from "sqlite3";
import os from "os";
import path from "path";
import fs from "node:fs/promises";

const tableName = "users";
const tablePrimaryKey = "discord_id";

export async function GET(request: Request) {
    const databasePath = process.env.DATABASE_PATH;
    if (!databasePath) {
        throw new Error("Please set DATABASE_PATH in your environment variables.");
    }

    const db = new Database(databasePath);

    try {
        const { searchParams } = new URL(request.url);
        const code = searchParams.get("code");
        const state = searchParams.get("state");

        if (!code) {
            return NextResponse.json({ success: false, message: "There seems to have been an error in your request, as `code` doesn't exist in your url parameters. Please try again." });
        }

        let userCachePath = process.env.USER_CACHE_PATH;
        if (!userCachePath) {
            throw new Error("Please set USER_CACHE_PATH in your environment variables.");
        }

        if (userCachePath.startsWith("~")) {
            userCachePath = path.join(os.homedir(), userCachePath.slice(1));
        }

        const userCache = await fs.readFile(userCachePath, "utf8");
        const data = userCache.trim().split("\n");
        const discordLine = data.find((line) => line.startsWith(state + "="));

        if (!discordLine) {
            throw new Error("It seems I couldn't find any discord IDs linked to the state: ");
        }

        const discordId = discordLine.split("=")[1];

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
                redirect_uri: process.env.OSU_REDIRECT_URI,
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

        const content = await fs.readFile(userCachePath, "utf8");
        const lines = content.split("\n");
        const filteredLines = lines.filter((line) => !line.endsWith(`=${discordId}`));
        await fs.writeFile(userCachePath, filteredLines.join("\n"));

        // Insert bancho_id and discord_id into database.
        db.prepare(`INSERT OR REPLACE INTO ${tableName} (${tablePrimaryKey}, bancho_id) VALUES (?, ?);`).run(discordId, userData.id);

        return NextResponse.json({ success: true, message: `Successfully authenticated as ${userData.username}. You may close this tab.` });
    } catch (error) {
        console.error("Error during OAuth callback:", error);
        return NextResponse.json({ success: false, message: String(error) });
    } finally {
        // Ensure database connection is always closed
        db.close();
    }
}
