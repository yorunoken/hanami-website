import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { genericOAuth } from "better-auth/plugins";
import { jwt } from "better-auth/plugins";
import { oauthProvider } from "@better-auth/oauth-provider";
import { createPool } from "mysql2/promise";

import { mapDiscordProfileToUser } from "@/lib/discord-identity";
import { createOsuOAuthProvider, fetchOsuUserInfo } from "./identities/osu-provider";
import { BotAccountCompatibility } from "./accounts/bot-compatibility";
import { CanonicalAccountService, createCanonicalAccountDatabase } from "./accounts/service";
import { webPrisma } from "./database/web";
import { discordBotLinkPlugin } from "./discord-link/plugin";
import { PrismaDiscordLinkTicketStore } from "./discord-link/tickets";
import { buildOsuClaims } from "./oauth-provider/claims";

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

export const discordLinkTicketStore = new PrismaDiscordLinkTicketStore(webPrisma);
const canonicalAccountService = new CanonicalAccountService(createCanonicalAccountDatabase(webPrisma));
export const botAccountCompatibility = new BotAccountCompatibility(canonicalAccountService);
const osuProvider = process.env.OSU_AUTH_CLIENT_ID || process.env.OSU_CLIENT_ID ? createOsuOAuthProvider() : null;
async function synchronizeOsuProfile(account: { userId: string; accountId: string; accessToken?: string | null }): Promise<void> {
    if (!account.accessToken) return;
    const profile = await fetchOsuUserInfo({ accessToken: account.accessToken });
    if (!profile || profile.id !== account.accountId || typeof profile.name !== "string") return;

    await webPrisma.osuProfile.upsert({
        where: { userId: account.userId },
        create: {
            userId: account.userId,
            osuId: profile.id,
            username: profile.name,
            avatarUrl: profile.image ?? null,
        },
        update: {
            osuId: profile.id,
            username: profile.name,
            avatarUrl: profile.image ?? null,
        },
    });
}

export const auth = betterAuth({
    database: prismaAdapter(webPrisma, { provider: "mysql" }),
    baseURL,
    trustedOrigins,
    disabledPaths: ["/unlink-account"],
    session: {
        freshAge: 15 * 60,
    },
    account: {
        accountLinking: {
            allowDifferentEmails: true,
            disableImplicitLinking: true,
            trustedProviders: ["discord", "osu"],
            updateUserInfoOnLink: false,
        },
    },
    databaseHooks: {
        account: {
            create: {
                after: async (account) => {
                    if (account.providerId === "discord" || account.providerId === "osu") {
                        await botAccountCompatibility.runBestEffort("synchronize linked identities", () =>
                            botAccountCompatibility.synchronizeUser(account.userId),
                        );
                    }
                    if (account.providerId === "osu") {
                        await botAccountCompatibility.runBestEffort("synchronize the durable osu! profile", () =>
                            synchronizeOsuProfile(account),
                        );
                    }
                },
            },
            delete: {
                after: async (account) => {
                    const provider = account.providerId === "discord" || account.providerId === "osu" ? account.providerId : null;
                    if (provider) {
                        await botAccountCompatibility.runBestEffort("clear an unlinked identity", () =>
                            botAccountCompatibility.synchronizeUser(account.userId, {
                                provider,
                                providerUserId: account.accountId,
                            }),
                        );
                    }
                },
            },
        },
    },
    plugins: [
        discordBotLinkPlugin({
            ticketStore: discordLinkTicketStore,
            synchronizeUser: (userId) => botAccountCompatibility.synchronizeUser(userId),
        }),
        jwt(),
        oauthProvider({
            scopes: ["openid", "osu", "offline_access"],
            grantTypes: ["authorization_code", "refresh_token"],
            loginPage: "/login",
            consentPage: "/oauth/consent",
            allowDynamicClientRegistration: false,
            allowUnauthenticatedClientRegistration: false,
            refreshTokenReuseInterval: 0,
            customAccessTokenClaims: async ({ user, scopes }) => {
                if (!user) return {};
                const claims = await buildOsuClaims(user.id, scopes, webPrisma);
                delete claims.sub;
                return claims;
            },
            customIdTokenClaims: async ({ user, scopes }) => {
                const claims = await buildOsuClaims(user.id, scopes, webPrisma);
                delete claims.sub;
                return claims;
            },
            customUserInfoClaims: async ({ user, scopes }) => {
                const claims = await buildOsuClaims(user.id, scopes, webPrisma);
                delete claims.sub;
                return claims;
            },
        }),
        ...(osuProvider ? [genericOAuth({ config: [osuProvider] })] : []),
    ],
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
