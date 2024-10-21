import { NextResponse } from "next/server";

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const state = searchParams.get("state") || "";

    const osuAuthUrl = `https://osu.ppy.sh/oauth/authorize?client_id=${process.env.OSU_CLIENT_ID}&redirect_uri=${encodeURIComponent(process.env.OSU_REDIRECT_URI!)}&response_type=code&scope=identify&state=${state}`;

    return NextResponse.json({ url: osuAuthUrl });
}
