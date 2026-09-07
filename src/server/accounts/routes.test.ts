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

    it("starts the osu OAuth continuation link only at its fixed same-origin callback", async () => {
        const dependencies = makeDependencies();
        const app = new Elysia({ prefix: "/api" }).use(createAccountRoutes(dependencies));
        const oauthQuery =
            "scope=openid+osu&client_id=guessr-client&ba_iat=1730000000000&exp=1730000600&ba_param=ba_iat&ba_param=ba_param&ba_param=client_id&ba_param=exp&ba_param=scope&sig=signature";

        const response = await app.handle(
            new Request("http://localhost:3000/api/account/providers/osu/link/continuation", {
                method: "POST",
                headers: { Origin: "http://localhost:3000", "Content-Type": "application/json" },
                body: JSON.stringify({ oauthQuery }),
            }),
        );

        expect(response.status).toBe(200);
        expect(dependencies.beginLink).toHaveBeenCalledWith({
            userId: "user-1",
            provider: "osu",
            headers: expect.any(Headers),
            callbackURL: `http://localhost:3000/oauth/continue/osu?${oauthQuery}&linked=1`,
            errorCallbackURL: `http://localhost:3000/oauth/continue/osu?${oauthQuery}`,
            oauthQuery,
            preventIdentityTransfer: true,
        });
    });

    it("rejects malformed continuation state before starting account linking", async () => {
        const dependencies = makeDependencies();
        const app = new Elysia({ prefix: "/api" }).use(createAccountRoutes(dependencies));

        const response = await app.handle(
            new Request("http://localhost:3000/api/account/providers/osu/link/continuation", {
                method: "POST",
                headers: { Origin: "http://localhost:3000", "Content-Type": "application/json" },
                body: JSON.stringify({ oauthQuery: "scope=openid+osu&redirect_uri=https%3A%2F%2Fevil.example" }),
            }),
        );

        expect(response.status).toBe(400);
        expect(await response.json()).toEqual({ error: "This authorization request could not be verified." });
        expect(dependencies.beginLink).not.toHaveBeenCalled();
    });

    it("returns a controlled error when Better Auth rejects the signed continuation query", async () => {
        const dependencies = makeDependencies();
        dependencies.beginLink = mock(async () => {
            throw Object.assign(new Error("Bad Request"), { body: { error: "invalid_signature" } });
        });
        const app = new Elysia({ prefix: "/api" }).use(createAccountRoutes(dependencies));
        const oauthQuery =
            "scope=openid+osu&client_id=guessr-client&ba_iat=1730000000000&exp=1730000600&ba_param=ba_iat&ba_param=ba_param&ba_param=client_id&ba_param=exp&ba_param=scope&sig=signature";

        const response = await app.handle(
            new Request("http://localhost:3000/api/account/providers/osu/link/continuation", {
                method: "POST",
                headers: { Origin: "http://localhost:3000", "Content-Type": "application/json" },
                body: JSON.stringify({ oauthQuery }),
            }),
        );

        expect(response.status).toBe(400);
        expect(await response.json()).toEqual({ error: "This authorization request could not be verified." });
    });

    it("forwards every Better Auth link cookie while returning the authorization URL", async () => {
        const dependencies = makeDependencies();
        const headers = new Headers();
        headers.append("Set-Cookie", "better-auth.state=one; Path=/; HttpOnly");
        headers.append("Set-Cookie", "better-auth.pkce=two; Path=/; HttpOnly");
        dependencies.beginLink = mock(async () => ({ url: "https://osu.ppy.sh/oauth/authorize?state=link", headers }));
        const app = new Elysia({ prefix: "/api" }).use(createAccountRoutes(dependencies));

        const response = await app.handle(
            new Request("http://localhost:3000/api/account/providers/osu/link", {
                method: "POST",
                headers: { Origin: "http://localhost:3000" },
            }),
        );

        expect(response.status).toBe(200);
        expect(await response.json()).toEqual({ url: "https://osu.ppy.sh/oauth/authorize?state=link" });
        expect(response.headers.getSetCookie()).toEqual([
            "better-auth.state=one; Path=/; HttpOnly",
            "better-auth.pkce=two; Path=/; HttpOnly",
        ]);
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

    it("clears Bot compatibility before atomically unlinking the Web provider", async () => {
        const events: string[] = [];
        const dependencies = makeDependencies();
        dependencies.clearBotLink = mock(async () => {
            events.push("bot");
        });
        dependencies.unlink = mock(async () => {
            events.push("web");
        });
        const app = new Elysia({ prefix: "/api" }).use(createAccountRoutes(dependencies));

        const response = await app.handle(
            new Request("http://localhost:3000/api/account/providers/osu", {
                method: "DELETE",
                headers: { Origin: "http://localhost:3000" },
            }),
        );

        expect(response.status).toBe(200);
        expect(events).toEqual(["bot", "web"]);
        expect(dependencies.clearBotLink).toHaveBeenCalledWith({
            userId: "user-1",
            provider: "osu",
            providerAccountId: "24680",
        });
    });

    it("reports an atomic Web unlink failure", async () => {
        const dependencies = makeDependencies();
        dependencies.unlink = mock(async () => {
            throw new Error("Web database unavailable");
        });
        const app = new Elysia({ prefix: "/api" }).use(createAccountRoutes(dependencies));

        const response = await app.handle(
            new Request("http://localhost:3000/api/account/providers/osu", {
                method: "DELETE",
                headers: { Origin: "http://localhost:3000" },
            }),
        );

        expect(response.status).toBe(500);
        expect(dependencies.unlink).toHaveBeenCalledTimes(1);
    });

    it("keeps the Web provider linked when Bot cleanup fails", async () => {
        const dependencies = makeDependencies();
        dependencies.clearBotLink = mock(async () => {
            throw new Error("Bot database unavailable");
        });
        dependencies.unlink = mock(async () => undefined);
        const app = new Elysia({ prefix: "/api" }).use(createAccountRoutes(dependencies));

        const response = await app.handle(
            new Request("http://localhost:3000/api/account/providers/osu", {
                method: "DELETE",
                headers: { Origin: "http://localhost:3000" },
            }),
        );

        expect(response.status).toBe(500);
        expect(dependencies.unlink).not.toHaveBeenCalled();
    });
});

function makeDependencies(): AccountRouteDependencies {
    return {
        getCurrent: async () => ({ userId: "user-1", sessionId: "session-1" }),
        listLoginMethods: async () => [
            { provider: "discord" as const, providerUserId: "123456789012345678" },
            { provider: "osu" as const, providerUserId: "24680" },
        ],
        beginLink: mock(async () => ({ url: "https://osu.ppy.sh/oauth/authorize?state=link", headers: new Headers() })),
        clearBotLink: mock(async () => undefined),
        unlink: async () => undefined,
    };
}
