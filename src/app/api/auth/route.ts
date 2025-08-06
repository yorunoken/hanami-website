import { NextResponse } from "next/server";

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const state = searchParams.get("state") || "";

        // Validate required environment variables
        if (!process.env.OSU_CLIENT_ID) {
            console.error("OSU_CLIENT_ID environment variable is not set");
            return NextResponse.json({ error: "Server configuration error" }, { status: 500 });
        }

        if (!process.env.OSU_CALLBACK_URL) {
            console.error("OSU_CALLBACK_URL environment variable is not set");
            return NextResponse.json({ error: "Server configuration error" }, { status: 500 });
        }

        const osuAuthUrl = `https://osu.ppy.sh/oauth/authorize?client_id=${process.env.OSU_CLIENT_ID}&redirect_uri=${encodeURIComponent(
            process.env.OSU_CALLBACK_URL
        )}&response_type=code&scope=identify&state=${encodeURIComponent(state)}`;

        return NextResponse.json({ url: osuAuthUrl });
    } catch (error) {
        console.error("Error in auth route:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
