import { afterEach, describe, expect, it, mock, spyOn } from "bun:test";

import { auth } from "./auth";
import app from "./index";
import { validateOAuthState } from "./oauth-state";

const originalClientId = process.env.OSU_CLIENT_ID;
const originalCallbackUrl = process.env.OSU_CALLBACK_URL;
const originalAuthSecret = process.env.BETTER_AUTH_SECRET;

afterEach(() => {
    mock.restore();
    restoreEnvironment("OSU_CLIENT_ID", originalClientId);
    restoreEnvironment("OSU_CALLBACK_URL", originalCallbackUrl);
    restoreEnvironment("BETTER_AUTH_SECRET", originalAuthSecret);
});

describe("Auth Endpoint", () => {
    it("returns 401 when the request has no authenticated session", async () => {
        const request = new Request("http://localhost/api/auth?state=teststate");
        const response = await app.handle(request);

        expect(response.status).toBe(401);
        expect(await response.json()).toEqual({ error: "Unauthorized" });
    });

    it("returns 500 for an authenticated request when osu! auth is not configured", async () => {
        mockAuthenticatedSession();
        delete process.env.OSU_CLIENT_ID;
        delete process.env.OSU_CALLBACK_URL;

        const request = new Request("http://localhost/api/auth?state=teststate");
        const response = await app.handle(request);

        expect(response.status).toBe(500);
        expect(await response.json()).toEqual({
            error: "Server configuration error",
        });
    });

    it("returns an osu! authorization URL for an authenticated request", async () => {
        mockAuthenticatedSession();
        process.env.OSU_CLIENT_ID = "12345";
        process.env.OSU_CALLBACK_URL = "http://localhost:3000/api/callback";
        process.env.BETTER_AUTH_SECRET = "test-secret-that-is-long-enough-for-hmac";

        const request = new Request("http://localhost/api/auth?state=teststate");
        const response = await app.handle(request);

        expect(response.status).toBe(200);
        const data = (await response.json()) as { url: string };
        expect(data.url).toContain("https://osu.ppy.sh/oauth/authorize");
        expect(data.url).toContain("client_id=12345");
        const state = new URL(data.url).searchParams.get("state");
        expect(state).toBeTruthy();
        expect(state).not.toBe("teststate");
        expect(await validateOAuthState(state!, "test-user", process.env.BETTER_AUTH_SECRET)).toBe(true);
    });
});

describe("Legacy legal URLs", () => {
    it("redirects old privacy URLs to the legal center", async () => {
        const response = await app.handle(new Request("http://localhost/privacy?source=footer"));
        expect(response.status).toBe(308);
        expect(response.headers.get("location")).toBe("http://localhost/legal/privacy?source=footer");
    });

    it("redirects old terms URLs to the legal center", async () => {
        const response = await app.handle(new Request("http://localhost/terms-of-service"));
        expect(response.status).toBe(308);
        expect(response.headers.get("location")).toBe("http://localhost/legal/terms");
    });
});

function mockAuthenticatedSession() {
    return spyOn(auth.api, "getSession").mockResolvedValue({
        session: {
            id: "test-session",
            token: "test-token",
            userId: "test-user",
            expiresAt: new Date(Date.now() + 60_000),
            createdAt: new Date(),
            updatedAt: new Date(),
        },
        user: {
            id: "test-user",
            name: "Test User",
            email: "test@example.com",
            emailVerified: true,
            createdAt: new Date(),
            updatedAt: new Date(),
            image: null,
        },
    });
}

function restoreEnvironment(key: "OSU_CLIENT_ID" | "OSU_CALLBACK_URL" | "BETTER_AUTH_SECRET", value: string | undefined) {
    if (value === undefined) {
        delete process.env[key];
        return;
    }

    process.env[key] = value;
}
