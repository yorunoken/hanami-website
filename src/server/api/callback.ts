import { Elysia } from "elysia";
import mysql from "mysql2/promise";
import { auth } from "../auth";

export const callbackRoute = new Elysia().get("/callback", async ({ request, query, set, redirect }) => {
    const botDatabaseUrl = process.env.BOT_DATABASE_URL;
    const webDatabaseUrl = process.env.WEB_DATABASE_URL;
    if (!botDatabaseUrl || !webDatabaseUrl) {
        set.status = 500;
        return { success: false, message: "Database URLs not set" };
    }

    if (!process.env.OSU_CLIENT_ID || !process.env.OSU_CLIENT_SECRET || !process.env.OSU_CALLBACK_URL) {
        set.status = 500;
        return { success: false, message: "osu! OAuth environment variables are not set" };
    }

    const { code, state } = query;
    if (!code || !state) {
        set.status = 400;
        return { success: false, message: "Missing code or state in url parameters." };
    }

    const session = await auth.api.getSession({ headers: request.headers });
    if (!session) {
        set.status = 401;
        return { success: false, message: "Unauthorized. Please log in first." };
    }

    const webDb = await mysql.createConnection(webDatabaseUrl);
    let botDb: mysql.Connection | null = null;

    try {
        const [rows] = await webDb.execute("SELECT accountId FROM account WHERE userId = ? AND providerId = 'discord'", [session.user.id]);
        const accounts = rows as any[];

        if (accounts.length === 0) {
            set.status = 400;
            return { success: false, message: "No Discord account linked to this session." };
        }

        const discordId = accounts[0].accountId;

        let tokenResponse: Response;
        try {
            tokenResponse = await fetch("https://osu.ppy.sh/oauth/token", {
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
        } catch (e) {
            console.error("Unable to reach osu! OAuth token endpoint:", e);
            set.status = 502;
            return {
                success: false,
                message: "Unable to reach osu! OAuth. Check network access and proxy settings.",
            };
        }

        if (!tokenResponse.ok) {
            const tokenError = await readResponseBody(tokenResponse);
            console.error("osu! token exchange failed:", tokenResponse.status, tokenError);
            set.status = 400;
            return {
                success: false,
                message: "osu! rejected the authorization code.",
                details: tokenError,
            };
        }

        const { access_token } = (await tokenResponse.json()) as any;

        let userResponse: Response;
        try {
            userResponse = await fetch("https://osu.ppy.sh/api/v2/me", {
                headers: { Authorization: `Bearer ${access_token}` },
            });
        } catch (e) {
            console.error("Unable to reach osu! user endpoint:", e);
            set.status = 502;
            return {
                success: false,
                message: "Unable to fetch osu! user data. Check network access and proxy settings.",
            };
        }

        if (!userResponse.ok) {
            const userError = await readResponseBody(userResponse);
            console.error("osu! user fetch failed:", userResponse.status, userError);
            set.status = 502;
            return {
                success: false,
                message: "osu! user data request failed.",
                details: userError,
            };
        }

        const userData = (await userResponse.json()) as any;

        botDb = await mysql.createConnection(botDatabaseUrl);
        await botDb.execute(`INSERT INTO users (id, banchoId) VALUES (?, ?) ON DUPLICATE KEY UPDATE banchoId = VALUES(banchoId)`, [discordId, userData.id.toString()]);

        return redirect("/profile");
    } catch (e) {
        console.error("Error during OAuth callback:", e);
        set.status = 500;
        return { success: false, message: String(e) };
    } finally {
        await webDb.end();
        await botDb?.end();
    }
});

async function readResponseBody(response: Response) {
    const contentType = response.headers.get("content-type") ?? "";

    if (contentType.includes("application/json")) {
        return response.json().catch(() => ({ status: response.status }));
    }

    return response.text().catch(() => `HTTP ${response.status}`);
}
