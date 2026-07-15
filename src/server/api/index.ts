import { Elysia } from "elysia";
import { authRoute } from "./auth";
import { callbackRoute } from "./callback";
import { osuLinkRoute } from "./osu-link";
import { accountDeletionRoutes } from "../deletion-requests/routes";

export const apiRoutes = new Elysia({ prefix: "/api" }).use(accountDeletionRoutes).use(authRoute).use(callbackRoute).use(osuLinkRoute);
