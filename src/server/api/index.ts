import { Elysia } from "elysia";
import { authRoute } from "./auth";
import { callbackRoute } from "./callback";

export const apiRoutes = new Elysia({ prefix: "/api" })
    .use(authRoute)
    .use(callbackRoute);
