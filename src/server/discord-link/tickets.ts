import type { PrismaClient } from "../../generated/prisma/web/client";

import type { DiscordLinkRequest } from "./validation";

export const DISCORD_LINK_TICKET_LIFETIME_MS = 5 * 60 * 1_000;
const TICKET_ISSUE_TRANSACTION_ATTEMPTS = 5;

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
        for (let attempt = 1; attempt <= TICKET_ISSUE_TRANSACTION_ATTEMPTS; attempt += 1) {
            try {
                return await this.prisma.$transaction(
                    async (transaction) => {
                        const activeTickets = await transaction.$queryRaw<Array<{ createdAt: Date; tokenHash: string }>>`
                    SELECT createdAt, tokenHash
                      FROM discordLinkTicket FORCE INDEX (discordLinkTicket_discord_active_idx)
                     WHERE discordUserId = ${input.discordUserId}
                       AND consumedAt IS NULL
                       AND invalidatedAt IS NULL
                       AND expiresAt > ${input.now}
                     ORDER BY createdAt DESC, tokenHash DESC
                     FOR UPDATE
                `;
                        const activeTicket = activeTickets[0];
                        const candidateWins =
                            !activeTicket ||
                            input.now > activeTicket.createdAt ||
                            (input.now.getTime() === activeTicket.createdAt.getTime() && input.tokenHash > activeTicket.tokenHash);

                        if (candidateWins) {
                            await transaction.discordLinkTicket.updateMany({
                                where: {
                                    discordUserId: input.discordUserId,
                                    consumedAt: null,
                                    invalidatedAt: null,
                                },
                                data: { invalidatedAt: input.now },
                            });
                        }

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
                                invalidatedAt: candidateWins ? null : input.now,
                            },
                        });
                        return ticket;
                    },
                    { isolationLevel: "Serializable", maxWait: 5_000, timeout: 35_000 },
                );
            } catch (error) {
                if (attempt === TICKET_ISSUE_TRANSACTION_ATTEMPTS || !isRetryableTransactionConflict(error)) throw error;
            }
        }

        throw new Error("Discord link ticket transaction retry limit was exhausted");
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

function isRetryableTransactionConflict(error: unknown): boolean {
    if (!isRecord(error) || typeof error.code !== "string") return false;
    if (error.code === "P2034") return true;
    if (error.code !== "P2010" || !isRecord(error.meta) || !isRecord(error.meta.driverAdapterError)) return false;
    return hasMariaDbTransactionConflict(error.meta.driverAdapterError);
}

function hasMariaDbTransactionConflict(value: Record<string, unknown>): boolean {
    if (value.kind === "TransactionWriteConflict") return true;
    if (value.originalCode === "1020" || value.originalCode === "1213" || value.code === 1020 || value.code === 1213) return true;
    return isRecord(value.cause) && hasMariaDbTransactionConflict(value.cause);
}

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === "object" && value !== null;
}
