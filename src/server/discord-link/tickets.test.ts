import { describe, expect, it } from "bun:test";

import type { PrismaClient } from "../../generated/prisma/web/client";

import { PrismaDiscordLinkTicketStore } from "./tickets";

describe("PrismaDiscordLinkTicketStore", () => {
    it("keeps an already-active newer ticket when an older request acquires the lock later", async () => {
        const createdAt = new Date("2026-07-15T12:00:04.000Z");
        const invalidations: unknown[] = [];
        let createdData: Record<string, unknown> | undefined;
        type ExistingTicketTransaction = {
            $queryRaw(query: TemplateStringsArray, ...values: unknown[]): Promise<Array<{ acquired?: number; released?: number }>>;
            discordLinkTicket: {
                findFirst: () => Promise<{ createdAt: Date; tokenHash: string }>;
                updateMany: (args: { data: unknown }) => Promise<{ count: number }>;
                create: (args: { data: Record<string, unknown> }) => Promise<Record<string, unknown>>;
            };
        };
        const transaction: ExistingTicketTransaction = {
            $queryRaw: async (query: TemplateStringsArray) => {
                return query.join(" ").includes("GET_LOCK") ? [{ acquired: 1 }] : [{ released: 1 }];
            },
            discordLinkTicket: {
                findFirst: async () => ({ createdAt, tokenHash: "z".repeat(64) }),
                updateMany: async (args: { data: unknown }) => {
                    invalidations.push(args.data);
                    return { count: 1 };
                },
                create: async (args: { data: Record<string, unknown> }) => {
                    createdData = args.data;
                    return args.data;
                },
            },
        };
        const prisma = {
            $transaction: async (callback: (transaction: ExistingTicketTransaction) => Promise<unknown>) => callback(transaction),
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
        type TieBreakTransaction = {
            $queryRaw(query: TemplateStringsArray, ...values: unknown[]): Promise<Array<{ acquired?: number; released?: number }>>;
            discordLinkTicket: {
                findFirst: () => Promise<{ createdAt: Date; tokenHash: string }>;
                updateMany: () => Promise<{ count: number }>;
                create: (args: { data: { invalidatedAt: unknown } }) => Promise<{ invalidatedAt: unknown }>;
            };
        };
        const transaction: TieBreakTransaction = {
            $queryRaw: async (query: TemplateStringsArray) => {
                return query.join(" ").includes("GET_LOCK") ? [{ acquired: 1 }] : [{ released: 1 }];
            },
            discordLinkTicket: {
                findFirst: async () => ({ createdAt, tokenHash: "z".repeat(64) }),
                updateMany: async () => ({ count: 0 }),
                create: async (args: { data: { invalidatedAt: unknown } }) => {
                    invalidatedAt = args.data.invalidatedAt;
                    return args.data;
                },
            },
        };
        const prisma = {
            $transaction: async (callback: (transaction: TieBreakTransaction) => Promise<unknown>) => callback(transaction),
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

    it("rejects issuance when the per-user lock cannot be released", async () => {
        type FakeTransaction = {
            $queryRaw(query: TemplateStringsArray, ...values: unknown[]): Promise<Array<{ acquired?: number; released?: number }>>;
            discordLinkTicket: {
                findFirst: () => Promise<null>;
                updateMany: () => Promise<{ count: number }>;
                create: () => Promise<Record<string, never>>;
            };
        };
        const transaction: FakeTransaction = {
            $queryRaw: async (query) => {
                return query.join(" ").includes("GET_LOCK") ? [{ acquired: 1 }] : [{ released: 0 }];
            },
            discordLinkTicket: {
                findFirst: async () => null,
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

    it("preserves operation and release failures together", async () => {
        type FailingTransaction = {
            $queryRaw(query: TemplateStringsArray, ...values: unknown[]): Promise<Array<{ acquired?: number; released?: number }>>;
            discordLinkTicket: {
                findFirst: () => Promise<null>;
                updateMany: () => Promise<{ count: number }>;
                create: () => Promise<Record<string, never>>;
            };
        };
        const operationError = new Error("ticket write failed");
        const releaseError = new Error("lock release failed");
        const transaction: FailingTransaction = {
            $queryRaw: async (query: TemplateStringsArray) => {
                if (query.join(" ").includes("GET_LOCK")) return [{ acquired: 1 }];
                throw releaseError;
            },
            discordLinkTicket: {
                findFirst: async () => null,
                updateMany: async () => {
                    throw operationError;
                },
                create: async () => ({}),
            },
        };
        const prisma = {
            $transaction: async (callback: (transaction: FailingTransaction) => Promise<unknown>) => callback(transaction),
        } as unknown as PrismaClient;

        const error = await new PrismaDiscordLinkTicketStore(prisma)
            .issue({
                discordUserId: "123456789012345678",
                username: "yoru",
                displayName: "Yoru",
                avatarUrl: "https://example.test/avatar.png",
                tokenHash: "a".repeat(64),
                now: new Date("2026-07-15T12:00:03.000Z"),
            })
            .catch((issueError) => issueError);

        expect(error).toBeInstanceOf(AggregateError);
        expect((error as AggregateError).errors).toEqual([operationError, releaseError]);
    });
});
