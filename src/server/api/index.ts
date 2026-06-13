import { Elysia } from "elysia";
import { authRoute } from "./auth";
import { callbackRoute } from "./callback";
import { osuLinkRoute } from "./osu-link";

export const apiRoutes = new Elysia({ prefix: "/api" }).use(authRoute).use(callbackRoute).use(osuLinkRoute);
