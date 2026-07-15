import { afterEach, describe, expect, it, mock, spyOn } from "bun:test";

import { auth, osuOAuthStateStore } from "./auth";
import app from "./index";
import { hashToken } from "./security/tokens";

const originalClientId = process.env.OSU_CLIENT_ID;
const originalCallbackUrl = process.env.OSU_CALLBACK_URL;

afterEach(() => {
    mock.restore();
    restoreEnvironment("OSU_CLIENT_ID", originalClientId);
    restoreEnvironment("OSU_CALLBACK_URL", originalCallbackUrl);
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
        const createState = spyOn(osuOAuthStateStore, "create").mockResolvedValue();

        const request = new Request("http://localhost/api/auth?state=teststate");
        const response = await app.handle(request);

        expect(response.status).toBe(200);
        const data = (await response.json()) as { url: string };
        expect(data.url).toContain("https://osu.ppy.sh/oauth/authorize");
        expect(data.url).toContain("client_id=12345");
        const state = new URL(data.url).searchParams.get("state");
        expect(state).toBeTruthy();
        expect(state).not.toBe("teststate");
        expect(createState).toHaveBeenCalledTimes(1);
        expect(createState.mock.calls[0]?.[0]).toMatchObject({
            userId: "test-user",
            sessionId: "test-session",
            stateHash: await hashToken(state!),
        });
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

describe("Canonical route redirects", () => {
    it("redirects index.html and trailing-slash duplicates", async () => {
        const indexResponse = await app.handle(new Request("http://localhost/index.html?source=old"));
        expect(indexResponse.status).toBe(308);
        expect(indexResponse.headers.get("location")).toBe("http://localhost/?source=old");

        const trailingSlashResponse = await app.handle(new Request("http://localhost/bot/?source=old"));
        expect(trailingSlashResponse.status).toBe(308);
        expect(trailingSlashResponse.headers.get("location")).toBe("http://localhost/bot?source=old");
    });
});

describe("Unknown API routes", () => {
    it("returns a non-indexable JSON 404 instead of the application shell", async () => {
        const response = await app.handle(new Request("http://localhost/api/does-not-exist"));

        expect(response.status).toBe(404);
        expect(response.headers.get("content-type")).toContain("application/json");
        expect(response.headers.get("x-robots-tag")).toBe("noindex, nofollow");
        expect(await response.json()).toEqual({ error: "Not Found" });
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

function restoreEnvironment(key: "OSU_CLIENT_ID" | "OSU_CALLBACK_URL", value: string | undefined) {
    if (value === undefined) {
        delete process.env[key];
        return;
    }

    process.env[key] = value;
}
