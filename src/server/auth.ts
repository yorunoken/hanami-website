import { betterAuth } from "better-auth";
import { createPool } from "mysql2/promise";

import { mapDiscordProfileToUser } from "@/lib/discord-identity";

if (!process.env.WEB_DATABASE_URL) {
    throw new Error("WEB_DATABASE_URL environment variable is not set. Please provide it in your environment.");
}

const baseURL = process.env.BETTER_AUTH_URL || "http://localhost:3000";
const baseOrigin = new URL(baseURL).origin;
const developmentOrigins =
    process.env.NODE_ENV === "production"
        ? []
        : ["http://localhost:5173", "http://127.0.0.1:5173", "http://localhost:4173", "http://127.0.0.1:4173"];

export const trustedOrigins = [...new Set([baseOrigin, ...developmentOrigins])];

export const webDatabase = createPool({
    uri: process.env.WEB_DATABASE_URL,
    timezone: "Z",
});

export const auth = betterAuth({
    database: webDatabase,
    baseURL,
    trustedOrigins,
    session: {
        freshAge: 15 * 60,
    },
    socialProviders: {
        discord: {
            clientId: process.env.DISCORD_CLIENT_ID as string,
            clientSecret: process.env.DISCORD_CLIENT_SECRET as string,
            mapProfileToUser: mapDiscordProfileToUser,
            // Discord's provider account ID remains the identity anchor. Refreshing
            // profile fields keeps names/avatars current and replaces a synthetic
            // email if the provider later supplies a real one.
            overrideUserInfoOnSignIn: true,
        },
    },
    onAPIError: {
        errorURL: "/login?returnTo=%2Fprofile",
    },
});
