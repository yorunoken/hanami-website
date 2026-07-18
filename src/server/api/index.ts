import { Elysia } from "elysia";
import { botPreferenceRoutes } from "./bot-preferences";
import { accountDeletionRoutes } from "../deletion-requests/routes";
import { discordLinkTicketStore } from "../auth";
import { createDiscordLinkRoutes, productionDiscordLinkRouteDependencies } from "../discord-link/routes";
import { companionDeviceRoutes } from "../companion/device-routes";
import { loginMethodRoutes } from "../accounts/routes";

export const apiRoutes = new Elysia({ prefix: "/api" })
    .use(companionDeviceRoutes)
    .use(accountDeletionRoutes)
    .use(createDiscordLinkRoutes({ ...productionDiscordLinkRouteDependencies, ticketStore: discordLinkTicketStore }))
    .use(loginMethodRoutes)
    .use(botPreferenceRoutes);
