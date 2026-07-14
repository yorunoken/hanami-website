import { Elysia } from "elysia";
import mysql, { type Connection, type RowDataPacket } from "mysql2/promise";

import { auth } from "../auth";
import { validateOAuthState } from "../oauth-state";

interface DiscordAccountRow extends RowDataPacket {
    accountId: string;
}

interface OsuTokenResponse {
    access_token: string;
}

interface OsuIdentity {
    id: number | string;
}

export const callbackRoute = new Elysia().get("/callback", async ({ request, query, set, redirect }) => {
    const botDatabaseUrl = process.env.BOT_DATABASE_URL;
    const webDatabaseUrl = process.env.WEB_DATABASE_URL;
    const stateSecret = process.env.BETTER_AUTH_SECRET;

    if (!botDatabaseUrl || !webDatabaseUrl || !stateSecret) {
        set.status = 500;
        return { success: false, message: "Server configuration error" };
    }

    if (!process.env.OSU_CLIENT_ID || !process.env.OSU_CLIENT_SECRET || !process.env.OSU_CALLBACK_URL) {
        set.status = 500;
        return { success: false, message: "Server configuration error" };
    }

    const { code, state } = query;
    if (!code || !state) {
        set.status = 400;
        return { success: false, message: "Missing OAuth callback parameters." };
    }

    const session = await auth.api.getSession({ headers: request.headers });
    if (!session) {
        set.status = 401;
        return {
            success: false,
            message: "Sign in before linking an osu! account.",
        };
    }

    if (!(await validateOAuthState(state, session.user.id, stateSecret))) {
        set.status = 400;
        return {
            success: false,
            message: "The osu! authorization request expired or could not be verified. Please start again.",
        };
    }

    let webDb: Connection | null = null;
    let botDb: Connection | null = null;

    try {
        webDb = await mysql.createConnection(webDatabaseUrl);
        const [accounts] = await webDb.execute<DiscordAccountRow[]>(
            "SELECT accountId FROM account WHERE userId = ? AND providerId = 'discord'",
            [session.user.id],
        );

        const discordId = accounts[0]?.accountId;
        if (!discordId) {
            set.status = 400;
            return {
                success: false,
                message: "No Discord account is linked to this web session.",
            };
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
            console.error("osu! token exchange failed", {
                status: tokenResponse.status,
            });
            set.status = 400;
            return {
                success: false,
                message: "osu! rejected or expired the authorization code. Please start again.",
            };
        }

        const tokenData: unknown = await tokenResponse.json();
        if (!isOsuTokenResponse(tokenData)) {
            console.error("osu! token exchange returned an unexpected response shape");
            set.status = 502;
            return {
                success: false,
                message: "osu! returned an unexpected authorization response.",
            };
        }

        const userResponse = await fetch("https://osu.ppy.sh/api/v2/me", {
            headers: { Authorization: `Bearer ${tokenData.access_token}` },
        });

        if (!userResponse.ok) {
            console.error("osu! identity request failed", {
                status: userResponse.status,
            });
            set.status = 502;
            return {
                success: false,
                message: "The authorized osu! account could not be read.",
            };
        }

        const userData: unknown = await userResponse.json();
        if (!isOsuIdentity(userData)) {
            console.error("osu! identity request returned an unexpected response shape");
            set.status = 502;
            return {
                success: false,
                message: "osu! returned an unexpected account response.",
            };
        }

        botDb = await mysql.createConnection(botDatabaseUrl);
        await botDb.execute("INSERT INTO users (id, banchoId) VALUES (?, ?) ON DUPLICATE KEY UPDATE banchoId = VALUES(banchoId)", [
            discordId,
            String(userData.id),
        ]);

        return redirect("/profile");
    } catch (error) {
        console.error(
            "osu! account linking failed",
            error instanceof Error ? { name: error.name, message: error.message } : { type: typeof error },
        );
        set.status = 502;
        return {
            success: false,
            message: "The account link could not be completed. Please try again.",
        };
    } finally {
        await webDb?.end();
        await botDb?.end();
    }
});

function isOsuTokenResponse(value: unknown): value is OsuTokenResponse {
    return isRecord(value) && typeof value.access_token === "string" && value.access_token.length > 0;
}

function isOsuIdentity(value: unknown): value is OsuIdentity {
    return isRecord(value) && (typeof value.id === "number" || typeof value.id === "string");
}

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === "object" && value !== null;
}
