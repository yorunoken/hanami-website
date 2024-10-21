import { NextResponse } from "next/server";

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get("code");
    const state = searchParams.get("state");

    if (!code) {
        return NextResponse.redirect(new URL("/error", request.url));
    }

    try {
        const tokenResponse = await fetch("https://osu.ppy.sh/oauth/token", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                client_id: process.env.OSU_CLIENT_ID,
                client_secret: process.env.OSU_CLIENT_SECRET,
                code,
                grant_type: "authorization_code",
                redirect_uri: process.env.OSU_REDIRECT_URI,
            }),
        });

        if (!tokenResponse.ok) {
            throw new Error("Failed to fetch token");
        }

        const tokenData = await tokenResponse.json();
        const { access_token } = tokenData;

        const userResponse = await fetch("https://osu.ppy.sh/api/v2/me", {
            headers: { Authorization: `Bearer ${access_token}` },
        });

        if (!userResponse.ok) {
            throw new Error("Failed to fetch user data (banned user?)");
        }

        const userData = await userResponse.json();

        console.log("State:", state);
        console.log("User Data:", userData);

        return NextResponse.json({ success: true, message: `Successfully authenticated as ${userData.username}. You may close this tab.` });
    } catch (error) {
        console.error("Error during OAuth callback:", error);
        return NextResponse.json({ success: false, message: String(error) });
    }
}
