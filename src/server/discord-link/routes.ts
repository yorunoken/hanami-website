import { Elysia } from "elysia";

import { logSafeFailure } from "../security/http";
import { createSecureToken, hashToken } from "../security/tokens";
import { getBotLinkSecret, hasValidBotAuthorization } from "./bot-auth";
import type { DiscordLinkTicketStore } from "./tickets";
import { parseDiscordLinkRequest } from "./validation";

interface DiscordLinkRouteDependencies {
    ticketStore: DiscordLinkTicketStore;
    getSecret(): string;
    getBaseUrl(): string;
    now(): Date;
}

export function createDiscordLinkRoutes(dependencies: DiscordLinkRouteDependencies) {
    return new Elysia({ prefix: "/internal" }).post("/discord-link-ticket", async ({ body, request, set }) => {
        set.headers["Cache-Control"] = "no-store";

        let expectedSecret: string;
        try {
            expectedSecret = dependencies.getSecret();
        } catch (error) {
            logSafeFailure("load Discord bot link configuration", error);
            set.status = 500;
            return { error: "Server configuration error" };
        }

        if (!hasValidBotAuthorization(request.headers.get("authorization"), expectedSecret)) {
            set.status = 401;
            return { error: "Unauthorized" };
        }

        const input = parseDiscordLinkRequest(body);
        if (!input) {
            set.status = 400;
            return { error: "Invalid Discord link request" };
        }

        let baseUrl: string;
        try {
            baseUrl = dependencies.getBaseUrl();
        } catch (error) {
            logSafeFailure("load Discord bot link URL configuration", error);
            set.status = 500;
            return { error: "Server configuration error" };
        }

        try {
            const token = createSecureToken();
            const ticket = await dependencies.ticketStore.issue({ ...input, tokenHash: await hashToken(token), now: dependencies.now() });
            const url = new URL("/api/auth/bot-link/consume", baseUrl);
            url.searchParams.set("token", token);
            return { url: url.toString(), expiresAt: ticket.expiresAt.toISOString() };
        } catch (error) {
            logSafeFailure("issue a Discord link ticket", error);
            set.status = 500;
            return { error: "The link could not be created" };
        }
    });
}

export function getBetterAuthBaseUrl(): string {
    const value = process.env.BETTER_AUTH_URL;
    if (!value) throw new Error("BETTER_AUTH_URL environment variable is not set.");
    return new URL(value).toString();
}

export const productionDiscordLinkRouteDependencies = {
    getSecret: getBotLinkSecret,
    getBaseUrl: getBetterAuthBaseUrl,
    now: () => new Date(),
};
