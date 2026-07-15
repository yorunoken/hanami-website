import { Elysia } from "elysia";
import { auth, osuOAuthStateStore } from "../auth";
import { createOsuAuthorizationUrl, getOsuAuthorizationConfiguration } from "../osu-authorization";
import { logSafeFailure } from "../security/http";

export const authRoute = new Elysia().get("/auth", async ({ request, set }) => {
    set.headers["Cache-Control"] = "no-store";
    const session = await auth.api.getSession({ headers: request.headers });

    if (!session) {
        set.status = 401;
        return { error: "Unauthorized" };
    }

    const osuConfiguration = getOsuAuthorizationConfiguration();
    if (!osuConfiguration) {
        console.error("Missing required environment variables for osu! auth");
        set.status = 500;
        return { error: "Server configuration error" };
    }

    try {
        const osuAuthUrl = await createOsuAuthorizationUrl(
            osuOAuthStateStore,
            { userId: session.user.id, sessionId: session.session.id },
            osuConfiguration,
        );
        return { url: osuAuthUrl };
    } catch (error) {
        logSafeFailure("start osu! authorization", error);
        set.status = 500;
        return { error: "The osu! authorization could not be started" };
    }
});
