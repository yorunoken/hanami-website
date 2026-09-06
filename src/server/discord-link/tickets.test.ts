import { describe, expect, it } from "bun:test";

import type { PrismaClient } from "../../generated/prisma/web/client";

import { PrismaDiscordLinkTicketStore } from "./tickets";

interface FakeTransaction {
    $queryRaw(): Promise<Array<{ createdAt: Date; tokenHash: string }>>;
    discordLinkTicket: {
        updateMany: (args: { data: unknown }) => Promise<{ count: number }>;
        create: (args: { data: Record<string, unknown> }) => Promise<Record<string, unknown>>;
    };
}

describe("PrismaDiscordLinkTicketStore", () => {
    it("keeps an already-active newer ticket when an older transaction runs later", async () => {
        const createdAt = new Date("2026-07-15T12:00:04.000Z");
        const invalidations: unknown[] = [];
        let createdData: Record<string, unknown> | undefined;
        const transaction: FakeTransaction = {
            $queryRaw: async () => [{ createdAt, tokenHash: "z".repeat(64) }],
            discordLinkTicket: {
                updateMany: async (args) => {
                    invalidations.push(args.data);
                    return { count: 1 };
                },
                create: async (args) => {
                    createdData = args.data;
                    return args.data;
                },
            },
        };
        const prisma = {
            $transaction: async (callback: (value: FakeTransaction) => Promise<unknown>) => callback(transaction),
        } as unknown as PrismaClient;

        const ticket = await new PrismaDiscordLinkTicketStore(prisma).issue({
            discordUserId: "123456789012345678",
            username: "yoru",
            displayName: "Yoru",
            avatarUrl: "https://example.test/avatar.png",
            tokenHash: "a".repeat(64),
            now: new Date("2026-07-15T12:00:03.000Z"),
        });

        expect(invalidations).toEqual([]);
        expect(createdData?.invalidatedAt).toEqual(new Date("2026-07-15T12:00:03.000Z"));
        expect(ticket.id).toBe(createdData?.id as string);
    });

    it("uses the token hash as a deterministic tie-breaker for equal timestamps", async () => {
        const createdAt = new Date("2026-07-15T12:00:04.000Z");
        let invalidatedAt: unknown;
        const transaction: FakeTransaction = {
            $queryRaw: async () => [{ createdAt, tokenHash: "z".repeat(64) }],
            discordLinkTicket: {
                updateMany: async () => ({ count: 0 }),
                create: async (args) => {
                    invalidatedAt = args.data.invalidatedAt;
                    return args.data;
                },
            },
        };
        const prisma = {
            $transaction: async (callback: (value: FakeTransaction) => Promise<unknown>) => callback(transaction),
        } as unknown as PrismaClient;

        await new PrismaDiscordLinkTicketStore(prisma).issue({
            discordUserId: "123456789012345678",
            username: "yoru",
            displayName: "Yoru",
            avatarUrl: "https://example.test/avatar.png",
            tokenHash: "a".repeat(64),
            now: createdAt,
        });

        expect(invalidatedAt).toEqual(createdAt);
    });

    it("holds the per-user row lock in a serializable transaction through commit", async () => {
        let transactionOptions: unknown;
        const transaction: FakeTransaction = {
            $queryRaw: async () => [],
            discordLinkTicket: {
                updateMany: async () => ({ count: 0 }),
                create: async (args) => args.data,
            },
        };
        const prisma = {
            $transaction: async (callback: (value: FakeTransaction) => Promise<unknown>, options: unknown) => {
                transactionOptions = options;
                return callback(transaction);
            },
        } as unknown as PrismaClient;

        await new PrismaDiscordLinkTicketStore(prisma).issue({
            discordUserId: "123456789012345678",
            username: "yoru",
            displayName: "Yoru",
            avatarUrl: "https://example.test/avatar.png",
            tokenHash: "a".repeat(64),
            now: new Date("2026-07-15T12:00:00.000Z"),
        });

        expect(transactionOptions).toEqual({ isolationLevel: "Serializable", maxWait: 5_000, timeout: 35_000 });
    });

    it("retries a serializable transaction write conflict", async () => {
        let attempts = 0;
        const transaction: FakeTransaction = {
            $queryRaw: async () => [],
            discordLinkTicket: {
                updateMany: async () => ({ count: 0 }),
                create: async (args) => args.data,
            },
        };
        const prisma = {
            $transaction: async (callback: (value: FakeTransaction) => Promise<unknown>) => {
                attempts += 1;
                if (attempts === 1) {
                    throw {
                        code: "P2010",
                        meta: { driverAdapterError: { cause: { kind: "mysql", code: 1020 } } },
                    };
                }
                return callback(transaction);
            },
        } as unknown as PrismaClient;

        await new PrismaDiscordLinkTicketStore(prisma).issue({
            discordUserId: "123456789012345678",
            username: "yoru",
            displayName: "Yoru",
            avatarUrl: "https://example.test/avatar.png",
            tokenHash: "a".repeat(64),
            now: new Date("2026-07-15T12:00:00.000Z"),
        });

        expect(attempts).toBe(2);
    });
});
