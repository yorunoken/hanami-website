import { describe, expect, it } from "bun:test";

import type { PrismaClient } from "../../generated/prisma/web/client";

import { PrismaDiscordLinkTicketStore } from "./tickets";

describe("PrismaDiscordLinkTicketStore", () => {
    it("rejects issuance when the per-user lock cannot be released", async () => {
        type FakeTransaction = {
            $queryRaw(query: TemplateStringsArray, ...values: unknown[]): Promise<Array<{ acquired?: number; released?: number }>>;
            discordLinkTicket: {
                updateMany: () => Promise<{ count: number }>;
                create: () => Promise<Record<string, never>>;
            };
        };
        const transaction: FakeTransaction = {
            $queryRaw: async (query) => {
                return query.join(" ").includes("GET_LOCK") ? [{ acquired: 1 }] : [{ released: 0 }];
            },
            discordLinkTicket: {
                updateMany: async () => ({ count: 0 }),
                create: async () => ({}),
            },
        };
        const prisma = {
            $transaction: async (callback: (transaction: FakeTransaction) => Promise<unknown>) => callback(transaction),
        } as unknown as PrismaClient;
        const store = new PrismaDiscordLinkTicketStore(prisma);

        await expect(
            store.issue({
                discordUserId: "123456789012345678",
                username: "yoru",
                displayName: "Yoru",
                avatarUrl: "https://example.test/avatar.png",
                tokenHash: "a".repeat(64),
                now: new Date("2026-07-15T12:00:00.000Z"),
            }),
        ).rejects.toThrow("Could not release the Discord link ticket lock");
    });
});
