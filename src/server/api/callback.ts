import { Elysia } from "elysia";
import mysql from "mysql2/promise";

import { osuOAuthStateStore } from "../auth";
import { serverIdentity } from "../identity";
import { consumeOAuthState } from "../oauth-state";
import { logSafeFailure } from "../security/http";

interface OsuTokenResponse {
    access_token: string;
}

interface OsuIdentity {
    id: number | string;
}

export const callbackRoute = new Elysia().get("/callback", async ({ request, set, redirect }) => {
    set.headers["Cache-Control"] = "no-store";
    const callbackParameters = readCallbackParameters(new URL(request.url));
    if (!callbackParameters) {
        set.status = 400;
        return { success: false, message: "Missing OAuth callback parameters." };
    }
    const { code, state } = callbackParameters;

    const identity = await serverIdentity.getCurrent(request.headers);
    if (!identity) {
        set.status = 401;
        return {
            success: false,
            message: "Sign in before linking an osu! account.",
        };
    }

    const botDatabaseUrl = process.env.BOT_DATABASE_URL;
    if (!botDatabaseUrl || !process.env.OSU_CLIENT_ID || !process.env.OSU_CLIENT_SECRET || !process.env.OSU_CALLBACK_URL) {
        set.status = 500;
        return { success: false, message: "Server configuration error" };
    }

    let validState: boolean;
    try {
        validState = await consumeOAuthState(osuOAuthStateStore, state, {
            userId: identity.userId,
            sessionId: identity.sessionId,
        });
    } catch (error) {
        logSafeFailure("verify osu! authorization state", error);
        set.status = 502;
        return { success: false, message: "The osu! authorization could not be verified. Please start again." };
    }

    if (!validState) {
        set.status = 400;
        return {
            success: false,
            message: "The osu! authorization request expired or could not be verified. Please start again.",
        };
    }

    let botDb: Awaited<ReturnType<typeof mysql.createConnection>> | null = null;

    try {
        const discordId = await serverIdentity.resolveDiscordId(identity.userId);
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
        logSafeFailure("link an osu! account", error);
        set.status = 502;
        return {
            success: false,
            message: "The account link could not be completed. Please try again.",
        };
    } finally {
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

function readCallbackParameters(url: URL): { code: string; state: string } | null {
    const allowed = new Set(["code", "state"]);
    const seen = new Set<string>();
    for (const [key] of url.searchParams) {
        if (!allowed.has(key) || seen.has(key)) return null;
        seen.add(key);
    }

    const code = url.searchParams.get("code");
    const state = url.searchParams.get("state");
    if (!code || hasControlCharacters(code)) return null;
    if (!state) return null;
    return { code, state };
}

function hasControlCharacters(value: string): boolean {
    for (const character of value) {
        const codePoint = character.codePointAt(0) ?? 0;
        if (codePoint <= 31 || codePoint === 127) return true;
    }
    return false;
}
