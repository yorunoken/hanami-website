import { Elysia } from "elysia";

export const authRoute = new Elysia().get("/auth", ({ query, set }) => {
    const state = query.state || "";

    if (!process.env.OSU_CLIENT_ID || !process.env.OSU_CALLBACK_URL) {
        console.error("OSU_CLIENT_ID or OSU_CALLBACK_URL environment variable is not set");
        set.status = 500;
        return { error: "Server configuration error" };
    }

    const osuAuthUrl = `https://osu.ppy.sh/oauth/authorize?client_id=${process.env.OSU_CLIENT_ID}&redirect_uri=${encodeURIComponent(
        process.env.OSU_CALLBACK_URL,
    )}&response_type=code&scope=identify&state=${encodeURIComponent(state)}`;

    return { url: osuAuthUrl };
});
