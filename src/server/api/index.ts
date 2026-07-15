import { Elysia } from "elysia";
import { authRoute } from "./auth";
import { callbackRoute } from "./callback";
import { osuLinkRoute } from "./osu-link";
import { accountDeletionRoutes } from "../deletion-requests/routes";
import { discordLinkTicketStore } from "../auth";
import { createDiscordLinkRoutes, productionDiscordLinkRouteDependencies } from "../discord-link/routes";

export const apiRoutes = new Elysia({ prefix: "/api" })
    .use(accountDeletionRoutes)
    .use(createDiscordLinkRoutes({ ...productionDiscordLinkRouteDependencies, ticketStore: discordLinkTicketStore }))
    .use(authRoute)
    .use(callbackRoute)
    .use(osuLinkRoute);
