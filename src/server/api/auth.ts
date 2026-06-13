import { Elysia } from "elysia";
import { auth } from "../auth";

export const authRoute = new Elysia().get("/auth", async ({ request, query, set }) => {
    const session = await auth.api.getSession({ headers: request.headers });

    if (!session) {
        set.status = 401;
        return { error: "Unauthorized" };
    }

    if (!process.env.OSU_CLIENT_ID || !process.env.OSU_CALLBACK_URL) {
        console.error("Missing required environment variables for osu! auth");
        set.status = 500;
        return { error: "Server configuration error" };
    }

    const state = query.state || crypto.randomUUID();

    const osuAuthUrl = `https://osu.ppy.sh/oauth/authorize?client_id=${process.env.OSU_CLIENT_ID}&redirect_uri=${encodeURIComponent(
        process.env.OSU_CALLBACK_URL,
    )}&response_type=code&scope=identify&state=${encodeURIComponent(state)}`;

    return { url: osuAuthUrl };
});
