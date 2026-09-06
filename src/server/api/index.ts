import { Elysia } from "elysia";
import { osuLinkRoute } from "./osu-link";
import { accountRoutes } from "../accounts/routes";
import { accountDeletionRoutes } from "../deletion-requests/routes";
import { discordLinkTicketStore } from "../auth";
import { createDiscordLinkRoutes, productionDiscordLinkRouteDependencies } from "../discord-link/routes";
import { companionDeviceRoutes } from "../companion/device-routes";

export const apiRoutes = new Elysia({ prefix: "/api" })
    .use(companionDeviceRoutes)
    .use(accountDeletionRoutes)
    .use(accountRoutes)
    .use(createDiscordLinkRoutes({ ...productionDiscordLinkRouteDependencies, ticketStore: discordLinkTicketStore }))
    .use(osuLinkRoute);
