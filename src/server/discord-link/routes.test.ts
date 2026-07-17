import { describe, expect, it } from "bun:test";
import { Elysia } from "elysia";

import { hashToken } from "../security/tokens";
import { createDiscordLinkRoutes } from "./routes";
import type { DiscordLinkTicket, DiscordLinkTicketStore } from "./tickets";

const now = new Date("2026-07-15T12:00:00.000Z");
const validBody = {
    discordUserId: "123456789012345678",
    username: "yoru",
    displayName: "Yoru",
    avatarUrl: "https://cdn.discordapp.com/avatars/123456789012345678/avatar.png",
};

describe("Discord bot link ticket endpoint", () => {
    it("refuses requests without the correct bot secret", async () => {
        const { app, store } = makeApp();

        for (const authorization of [undefined, "Bearer wrong-secret"]) {
            const response = await app.handle(makeRequest(authorization));
            expect(response.status).toBe(401);
            expect(response.headers.get("cache-control")).toBe("no-store");
            expect(await response.json()).toEqual({ error: "Unauthorized" });
        }
        expect(store.issued).toHaveLength(0);
    });

    it("issues a hashed five-minute ticket and returns only the consume URL", async () => {
        const { app, store } = makeApp();
        const response = await app.handle(makeRequest("Bearer bot-secret"));

        expect(response.status).toBe(200);
        expect(response.headers.get("cache-control")).toBe("no-store");
        const body = (await response.json()) as { url: string; expiresAt: string };
        const url = new URL(body.url);
        const token = url.searchParams.get("token");
        expect(url.origin + url.pathname).toBe("https://hanami.yorunoken.com/api/auth/bot-link/consume");
        expect(token).toHaveLength(43);
        expect(body.expiresAt).toBe("2026-07-15T12:05:00.000Z");
        expect(store.issued[0]).toMatchObject({
            ...validBody,
            tokenHash: await hashToken(token!),
            now,
        });
        expect(JSON.stringify(body)).not.toContain(store.issued[0]!.tokenHash);
    });
});

function makeApp() {
    const store = new RecordingTicketStore();
    const routes = createDiscordLinkRoutes({
        ticketStore: store,
        getSecret: () => "bot-secret",
        getBaseUrl: () => "https://hanami.yorunoken.com",
        now: () => now,
    });
    return { app: new Elysia({ prefix: "/api" }).use(routes), store };
}

function makeRequest(authorization?: string): Request {
    const headers = new Headers({ "Content-Type": "application/json" });
    if (authorization) headers.set("Authorization", authorization);
    return new Request("http://localhost/api/internal/discord-link-ticket", {
        method: "POST",
        headers,
        body: JSON.stringify(validBody),
    });
}

class RecordingTicketStore implements DiscordLinkTicketStore {
    readonly issued: Array<typeof validBody & { tokenHash: string; now: Date }> = [];

    async issue(input: typeof validBody & { tokenHash: string; now: Date }): Promise<DiscordLinkTicket> {
        this.issued.push(input);
        return {
            id: "ticket-1",
            ...validBody,
            createdAt: input.now,
            expiresAt: new Date(input.now.getTime() + 5 * 60_000),
        };
    }

    async consume(): Promise<DiscordLinkTicket | null> {
        return null;
    }
}
