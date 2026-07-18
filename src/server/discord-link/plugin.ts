import type { BetterAuthPlugin } from "better-auth";
import { createAuthEndpoint } from "better-auth/api";
import { setSessionCookie } from "better-auth/cookies";
import * as z from "zod";

import type { UserIdentityRepository } from "../identities/repository";
import { logSafeFailure } from "../security/http";
import { hashToken, isSecureToken } from "../security/tokens";
import { resolveDiscordIdentity } from "./better-auth";
import type { DiscordLinkTicketStore } from "./tickets";

interface DiscordBotLinkPluginDependencies {
    ticketStore: DiscordLinkTicketStore;
    identities: UserIdentityRepository;
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

                    let ticket;
                    try {
                        ticket = await dependencies.ticketStore.consume(await hashToken(token), dependencies.now?.() ?? new Date());
                    } catch (error) {
                        logSafeFailure("consume a Discord link ticket", error);
                        return redirectToLinkError(ctx);
                    }
                    if (!ticket) return redirectToLinkError(ctx);

                    try {
                        const user = await resolveDiscordIdentity(ctx.context.internalAdapter, ticket);
                        await dependencies.identities.linkIdentity(user.id, {
                            provider: "discord",
                            providerUserId: ticket.discordUserId,
                            username: ticket.username,
                            displayName: ticket.displayName,
                            avatarUrl: ticket.avatarUrl,
                        });
                        const session = await ctx.context.internalAdapter.createSession(user.id);
                        if (!session) throw new Error("Better Auth did not create a session");

                        await setSessionCookie(ctx, { session, user });
                    } catch (error) {
                        logSafeFailure("finish a Discord bot link", error);
                        return redirectToLinkError(ctx);
                    }

                    const destination = new URL("/profile", ctx.context.baseURL);
                    destination.searchParams.set("link", "osu");
                    destination.searchParams.set("source", "bot");
                    throw ctx.redirect(destination.toString());
                },
            ),
        },
    } satisfies BetterAuthPlugin;
}

function redirectToLinkError(ctx: { context: { baseURL: string }; redirect(url: string): unknown }): never {
    throw ctx.redirect(new URL("/link-error", ctx.context.baseURL).toString());
}
