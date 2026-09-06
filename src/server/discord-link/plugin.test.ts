import { describe, expect, it, mock } from "bun:test";
import { betterAuth } from "better-auth";
import { memoryAdapter, type MemoryDB } from "better-auth/adapters/memory";

import { createSecureToken } from "../security/tokens";
import { discordBotLinkPlugin } from "./plugin";
import type { DiscordLinkTicket, DiscordLinkTicketStore } from "./tickets";

const now = new Date("2026-07-15T12:00:00.000Z");

describe("Discord bot link Better Auth plugin", () => {
    it("creates a normal session cookie, redirects into explicit osu! linking, and rejects replay", async () => {
        const database: MemoryDB = { user: [], account: [], session: [], verification: [] };
        const token = createSecureToken();
        const ticketStore = new SingleUseTicketStore(makeTicket());
        const synchronizeUser = mock(async () => undefined);
        const testAuth = betterAuth({
            database: memoryAdapter(database),
            baseURL: "https://hanami.yorunoken.com",
            secret: "test-secret-that-is-at-least-thirty-two-characters",
            plugins: [
                discordBotLinkPlugin({
                    ticketStore,
                    synchronizeUser,
                    now: () => now,
                }),
            ],
        });

        const response = await testAuth.handler(makeRequest(token));

        expect(response.status).toBe(302);
        expect(response.headers.get("location")).toBe("https://hanami.yorunoken.com/profile?link=osu&source=bot");
        expect(response.headers.get("cache-control")).toBe("no-store");
        expect(response.headers.get("set-cookie")).toContain("better-auth.session_token=");
        expect(database.user).toHaveLength(1);
        expect(database.account).toHaveLength(1);
        expect(database.session).toHaveLength(1);
        expect(synchronizeUser).toHaveBeenCalledWith(database.user[0].id);
        expect(database.account[0]).toMatchObject({
            providerId: "discord",
            accountId: "123456789012345678",
            userId: database.user[0].id,
        });

        const replay = await testAuth.handler(makeRequest(token));
        expect(replay.status).toBe(302);
        expect(replay.headers.get("location")).toBe("https://hanami.yorunoken.com/link-error");
        expect(database.user).toHaveLength(1);
        expect(database.account).toHaveLength(1);
        expect(database.session).toHaveLength(1);
    });

    it("synchronizes an existing canonical Discord and osu! pair before redirecting", async () => {
        const userId = "canonical-user";
        const database: MemoryDB = {
            user: [
                {
                    id: userId,
                    name: "Yoru",
                    email: "discord-123456789012345678@users.hanami.invalid",
                    emailVerified: false,
                    image: null,
                    createdAt: now,
                    updatedAt: now,
                },
            ],
            account: [
                {
                    id: "discord-account",
                    providerId: "discord",
                    accountId: "123456789012345678",
                    userId,
                    createdAt: now,
                    updatedAt: now,
                },
                {
                    id: "osu-account",
                    providerId: "osu",
                    accountId: "24680",
                    userId,
                    createdAt: now,
                    updatedAt: now,
                },
            ],
            session: [],
            verification: [],
        };
        const synchronizeUser = mock(async () => undefined);
        const testAuth = betterAuth({
            database: memoryAdapter(database),
            baseURL: "https://hanami.yorunoken.com",
            secret: "test-secret-that-is-at-least-thirty-two-characters",
            plugins: [
                discordBotLinkPlugin({
                    ticketStore: new SingleUseTicketStore(makeTicket()),
                    synchronizeUser,
                    now: () => now,
                }),
            ],
        });

        const response = await testAuth.handler(makeRequest(createSecureToken()));

        expect(response.status).toBe(302);
        expect(synchronizeUser).toHaveBeenCalledWith(userId);
        expect(database.user).toHaveLength(1);
        expect(database.account).toHaveLength(2);
    });
});

function makeRequest(token: string): Request {
    return new Request(`https://hanami.yorunoken.com/api/auth/bot-link/consume?token=${encodeURIComponent(token)}`, {
        headers: { "User-Agent": "Discord link test" },
    });
}

function makeTicket(): DiscordLinkTicket {
    return {
        id: "ticket-1",
        discordUserId: "123456789012345678",
        username: "yoru",
        displayName: "Yoru",
        avatarUrl: "https://cdn.discordapp.com/avatars/123456789012345678/avatar.png",
        createdAt: now,
        expiresAt: new Date(now.getTime() + 5 * 60_000),
    };
}

class SingleUseTicketStore implements DiscordLinkTicketStore {
    private used = false;

    constructor(private readonly ticket: DiscordLinkTicket) {}

    async issue(): Promise<DiscordLinkTicket> {
        return this.ticket;
    }

    async consume(): Promise<DiscordLinkTicket | null> {
        if (this.used) return null;
        this.used = true;
        return this.ticket;
    }
}
