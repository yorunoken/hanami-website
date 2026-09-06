import { betterAuth } from "better-auth";
import { getOAuthState } from "better-auth/api";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { genericOAuth } from "better-auth/plugins";
import { jwt } from "better-auth/plugins";

import { mapVerifiedDiscordProfileToUser } from "@/lib/discord-identity";
import { createOsuOAuthProvider } from "./identities/osu-provider";
import { synchronizeOsuProfile } from "./identities/osu-profile";
import { BotAccountCompatibility } from "./accounts/bot-compatibility";
import { CanonicalAccountService, createCanonicalAccountDatabase } from "./accounts/service";
import { transferVerifiedDiscordIdentity, transferVerifiedOsuIdentity } from "./accounts/transfer";
import { webPrisma } from "./database/web";
import { discordBotLinkPlugin } from "./discord-link/plugin";
import { PrismaDiscordLinkTicketStore } from "./discord-link/tickets";
import { createHanamiOAuthProviderPlugin } from "./oauth-provider/provider";

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

export const discordLinkTicketStore = new PrismaDiscordLinkTicketStore(webPrisma);
const canonicalAccountService = new CanonicalAccountService(createCanonicalAccountDatabase(webPrisma));
export const botAccountCompatibility = new BotAccountCompatibility(canonicalAccountService);
async function synchronizeTransferredIdentity(
    targetUserId: string,
    sourceUserId: string,
    provider: "discord" | "osu",
    providerUserId: string,
): Promise<void> {
    await botAccountCompatibility.runBestEffort(`synchronize transferred ${provider} identity`, async () => {
        await botAccountCompatibility.synchronizeUser(sourceUserId, { provider, providerUserId });
        await botAccountCompatibility.synchronizeUser(targetUserId);
    });
}

const osuProvider =
    process.env.OSU_AUTH_CLIENT_ID || process.env.OSU_CLIENT_ID
        ? createOsuOAuthProvider(process.env, {
              onVerifiedIdentity: async ({ osuId }) => {
                  const state = await getOAuthState();
                  const targetUserId = state?.link?.userId;
                  if (!targetUserId) return;
                  const sourceUserId = await transferVerifiedOsuIdentity(targetUserId, osuId);
                  if (!sourceUserId) return;
                  await synchronizeTransferredIdentity(targetUserId, sourceUserId, "osu", osuId);
              },
          })
        : null;

async function refreshOsuProfile(account: { userId: string; accountId: string; accessToken?: string | null }): Promise<void> {
    await synchronizeOsuProfile(account, webPrisma);
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
                        await refreshOsuProfile(account);
                    }
                },
            },
            update: {
                after: async (account) => {
                    if (account.providerId === "osu" && account.accessToken) await refreshOsuProfile(account);
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
        createHanamiOAuthProviderPlugin(webPrisma),
        ...(osuProvider ? [genericOAuth({ config: [osuProvider] })] : []),
    ],
    socialProviders: {
        discord: {
            clientId: process.env.DISCORD_CLIENT_ID as string,
            clientSecret: process.env.DISCORD_CLIENT_SECRET as string,
            mapProfileToUser: (profile) =>
                mapVerifiedDiscordProfileToUser(profile, async ({ discordId }) => {
                    const state = await getOAuthState();
                    const targetUserId = state?.link?.userId;
                    if (!targetUserId) return;
                    const sourceUserId = await transferVerifiedDiscordIdentity(targetUserId, discordId);
                    if (!sourceUserId) return;
                    await synchronizeTransferredIdentity(targetUserId, sourceUserId, "discord", discordId);
                }),
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
