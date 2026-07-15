import type { BetterAuthPlugin } from "better-auth";
import { createAuthEndpoint } from "better-auth/api";
import { setSessionCookie } from "better-auth/cookies";
import * as z from "zod";

import { createOsuAuthorizationUrl, type OsuAuthorizationConfiguration } from "../osu-authorization";
import type { OAuthStateStore } from "../oauth-state";
import { logSafeFailure } from "../security/http";
import { hashToken, isSecureToken } from "../security/tokens";
import { resolveDiscordIdentity } from "./better-auth";
import type { DiscordLinkTicketStore } from "./tickets";

interface DiscordBotLinkPluginDependencies {
    ticketStore: DiscordLinkTicketStore;
    oauthStateStore: OAuthStateStore;
    getOsuConfiguration(): OsuAuthorizationConfiguration | null;
    now?(): Date;
}

const consumeQuerySchema = z.object({ token: z.string().optional() });

export function discordBotLinkPlugin(dependencies: DiscordBotLinkPluginDependencies): BetterAuthPlugin {
    return {
        id: "discord-bot-link",
        endpoints: {
            consumeDiscordBotLink: createAuthEndpoint(
                "/bot-link/consume",
                {
                    method: "GET",
                    query: consumeQuerySchema,
                    requireHeaders: true,
                },
                async (ctx) => {
                    ctx.setHeader("Cache-Control", "no-store");
                    const token = ctx.query.token;
                    if (!isSecureToken(token)) return redirectToLinkError(ctx);

                    const osuConfiguration = dependencies.getOsuConfiguration();
                    if (!osuConfiguration) {
                        logSafeFailure("load osu! authorization configuration", new Error("Missing osu! OAuth configuration"));
                        return redirectToLinkError(ctx);
                    }

                    let ticket;
                    try {
                        ticket = await dependencies.ticketStore.consume(await hashToken(token), dependencies.now?.() ?? new Date());
                    } catch (error) {
                        logSafeFailure("consume a Discord link ticket", error);
                        return redirectToLinkError(ctx);
                    }
                    if (!ticket) return redirectToLinkError(ctx);

                    let osuAuthorizationUrl: string;
                    try {
                        const user = await resolveDiscordIdentity(ctx.context.internalAdapter, ticket);
                        const session = await ctx.context.internalAdapter.createSession(user.id);
                        if (!session) throw new Error("Better Auth did not create a session");

                        osuAuthorizationUrl = await createOsuAuthorizationUrl(
                            dependencies.oauthStateStore,
                            { userId: user.id, sessionId: session.id },
                            osuConfiguration,
                        );
                        await setSessionCookie(ctx, { session, user });
                    } catch (error) {
                        logSafeFailure("finish a Discord bot link", error);
                        return redirectToLinkError(ctx);
                    }

                    throw ctx.redirect(osuAuthorizationUrl);
                },
            ),
        },
    } satisfies BetterAuthPlugin;
}

function redirectToLinkError(ctx: { context: { baseURL: string }; redirect(url: string): unknown }): never {
    throw ctx.redirect(new URL("/link-error", ctx.context.baseURL).toString());
}
