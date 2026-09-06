import type { PrismaClient } from "../../generated/prisma/web/client";

import type { DiscordLinkRequest } from "./validation";

export const DISCORD_LINK_TICKET_LIFETIME_MS = 5 * 60 * 1_000;

export interface DiscordLinkTicket extends DiscordLinkRequest {
    id: string;
    createdAt: Date;
    expiresAt: Date;
}

export interface DiscordLinkTicketStore {
    issue(input: DiscordLinkRequest & { tokenHash: string; now: Date }): Promise<DiscordLinkTicket>;
    consume(tokenHash: string, now: Date): Promise<DiscordLinkTicket | null>;
}

export class PrismaDiscordLinkTicketStore implements DiscordLinkTicketStore {
    constructor(private readonly prisma: PrismaClient) {}

    async issue(input: DiscordLinkRequest & { tokenHash: string; now: Date }): Promise<DiscordLinkTicket> {
        return this.prisma.$transaction(
            async (transaction) => {
                const lockName = `hanami-discord-link-ticket:${input.discordUserId}`;
                const lockRows = await transaction.$queryRaw<{ acquired: number | string | null }[]>`
                SELECT GET_LOCK(${lockName}, 30) AS acquired
            `;
                if (Number(lockRows[0]?.acquired) !== 1) throw new Error("Could not acquire the Discord link ticket lock");

                try {
                    await transaction.discordLinkTicket.updateMany({
                        where: {
                            discordUserId: input.discordUserId,
                            consumedAt: null,
                            invalidatedAt: null,
                        },
                        data: { invalidatedAt: input.now },
                    });

                    const ticket: DiscordLinkTicket = {
                        id: crypto.randomUUID(),
                        discordUserId: input.discordUserId,
                        username: input.username,
                        displayName: input.displayName,
                        avatarUrl: input.avatarUrl,
                        createdAt: input.now,
                        expiresAt: new Date(input.now.getTime() + DISCORD_LINK_TICKET_LIFETIME_MS),
                    };

                    await transaction.discordLinkTicket.create({
                        data: {
                            id: ticket.id,
                            tokenHash: input.tokenHash,
                            discordUserId: ticket.discordUserId,
                            username: ticket.username,
                            displayName: ticket.displayName,
                            avatarUrl: ticket.avatarUrl,
                            createdAt: ticket.createdAt,
                            expiresAt: ticket.expiresAt,
                        },
                    });
                    return ticket;
                } finally {
                    await transaction.$queryRaw`
                    SELECT RELEASE_LOCK(${lockName})
                `.catch(() => undefined);
                }
            },
            { maxWait: 5_000, timeout: 35_000 },
        );
    }

    async consume(tokenHash: string, now: Date): Promise<DiscordLinkTicket | null> {
        return this.prisma.$transaction(async (transaction) => {
            const result = await transaction.discordLinkTicket.updateMany({
                where: {
                    tokenHash,
                    consumedAt: null,
                    invalidatedAt: null,
                    expiresAt: { gt: now },
                },
                data: { consumedAt: now },
            });
            if (result.count !== 1) return null;

            const ticket = await transaction.discordLinkTicket.findUnique({
                where: { tokenHash },
                select: {
                    id: true,
                    discordUserId: true,
                    username: true,
                    displayName: true,
                    avatarUrl: true,
                    createdAt: true,
                    expiresAt: true,
                },
            });
            return ticket;
        });
    }
}
