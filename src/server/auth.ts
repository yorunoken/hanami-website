import { betterAuth } from "better-auth";
import { genericOAuth } from "better-auth/plugins";

import { mapDiscordProfileToUser } from "@/lib/discord-identity";
import { validateProductionOAuthConfiguration } from "./auth-configuration";
import { runBetterAuthSchemaMigrations } from "./auth-schema";
import { webDatabase } from "./database";
import { discordBotLinkPlugin } from "./discord-link/plugin";
import { MySqlDiscordLinkTicketStore } from "./discord-link/tickets";
import { createIdentityDatabaseHooks } from "./identities/auth-hooks";
import { createOsuOAuthProvider } from "./identities/osu-provider";
import { userIdentities } from "./identities/runtime";

validateProductionOAuthConfiguration();

const baseURL = process.env.BETTER_AUTH_URL || "http://localhost:3000";
const baseOrigin = new URL(baseURL).origin;
const developmentOrigins =
    process.env.NODE_ENV === "production"
        ? []
        : ["http://localhost:5173", "http://127.0.0.1:5173", "http://localhost:4173", "http://127.0.0.1:4173"];

export const trustedOrigins = [...new Set([baseOrigin, ...developmentOrigins])];

export const discordLinkTicketStore = new MySqlDiscordLinkTicketStore(webDatabase);

export const auth = betterAuth({
    database: webDatabase,
    baseURL,
    trustedOrigins,
    databaseHooks: createIdentityDatabaseHooks(userIdentities),
    session: {
        freshAge: 15 * 60,
    },
    account: {
        accountLinking: {
            allowDifferentEmails: true,
            disableImplicitLinking: true,
            trustedProviders: ["discord", "osu"],
            updateUserInfoOnLink: true,
        },
    },
    plugins: [
        discordBotLinkPlugin({
            ticketStore: discordLinkTicketStore,
            identities: userIdentities,
        }),
        genericOAuth({
            config: [createOsuOAuthProvider()],
        }),
    ],
    socialProviders: {
        discord: {
            clientId: process.env.DISCORD_CLIENT_ID as string,
            clientSecret: process.env.DISCORD_CLIENT_SECRET as string,
            mapProfileToUser: mapDiscordProfileToUser,
            // Discord's provider account ID remains the identity anchor. Profile
            // fields refresh without using provider email for account matching.
            overrideUserInfoOnSignIn: true,
        },
    },
    onAPIError: {
        errorURL: "/login?returnTo=%2Fprofile",
    },
});

export function prepareAuthenticationSchema(): Promise<void> {
    return runBetterAuthSchemaMigrations(auth.options);
}

export { webDatabase };
