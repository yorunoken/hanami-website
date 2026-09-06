import { describe, expect, it, mock } from "bun:test";
import { Elysia } from "elysia";

import { createAccountRoutes, type AccountRouteDependencies } from "./routes";

describe("canonical account routes", () => {
    it("lists provider-owned login methods without exposing provider tokens", async () => {
        const app = new Elysia({ prefix: "/api" }).use(createAccountRoutes(makeDependencies()));

        const response = await app.handle(new Request("http://localhost/api/account/providers"));

        expect(response.status).toBe(200);
        expect(await response.json()).toEqual({
            loginMethods: [
                { provider: "discord", providerUserId: "123456789012345678" },
                { provider: "osu", providerUserId: "24680" },
            ],
        });
    });

    it("starts explicit provider linking through the configured auth flow", async () => {
        const dependencies = makeDependencies();
        const app = new Elysia({ prefix: "/api" }).use(createAccountRoutes(dependencies));

        const response = await app.handle(
            new Request("http://localhost:3000/api/account/providers/osu/link", {
                method: "POST",
                headers: { Origin: "http://localhost:3000" },
            }),
        );

        expect(response.status).toBe(200);
        expect(await response.json()).toEqual({ url: "https://osu.ppy.sh/oauth/authorize?state=link" });
        expect(dependencies.beginLink).toHaveBeenCalledWith(expect.objectContaining({ userId: "user-1", provider: "osu" }));
    });

    it("refuses to unlink the final sign-in method", async () => {
        const dependencies = makeDependencies();
        dependencies.listLoginMethods = async () => [{ provider: "osu", providerUserId: "24680" }];
        const app = new Elysia({ prefix: "/api" }).use(createAccountRoutes(dependencies));

        const response = await app.handle(
            new Request("http://localhost:3000/api/account/providers/osu", {
                method: "DELETE",
                headers: { Origin: "http://localhost:3000" },
            }),
        );

        expect(response.status).toBe(409);
        expect(await response.json()).toEqual({ error: "Your final sign-in method cannot be removed." });
    });
});

function makeDependencies(): AccountRouteDependencies {
    return {
        getCurrent: async () => ({ userId: "user-1", sessionId: "session-1", sessionCreatedAt: new Date() }),
        listLoginMethods: async () => [
            { provider: "discord" as const, providerUserId: "123456789012345678" },
            { provider: "osu" as const, providerUserId: "24680" },
        ],
        beginLink: mock(async () => "https://osu.ppy.sh/oauth/authorize?state=link"),
        unlink: async () => undefined,
        isFreshSession: () => true,
    };
}
