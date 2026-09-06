import type { Prisma, PrismaClient } from "../../generated/prisma/web/client";

import { safelyEqualHashes } from "../security/tokens";
import { REAUTHENTICATION_WINDOW_MS } from "./domain";

export type AccountDeletionFailureCode = "account_not_found" | "challenge_invalid" | "challenge_stale" | "service_unavailable";

export class AccountDeletionStoreError extends Error {
    constructor(public readonly code: AccountDeletionFailureCode) {
        super(code);
        this.name = "AccountDeletionStoreError";
    }
}

export interface AccountDeletionStore {
    startReauthentication(input: { userId: string; tokenHash: string; now: Date; alreadyFresh: boolean }): Promise<void>;
    completeReauthentication(input: { userId: string; tokenHash: string; sessionCreatedAt: Date; now: Date }): Promise<Date>;
    deleteAccount(input: { userId: string; tokenHash: string; now: Date }): Promise<void>;
}

type DeleteBotAccountData = (discordAccountId: string) => Promise<void>;

export class PrismaDeletionRequestStore implements AccountDeletionStore {
    constructor(
        private readonly prisma: PrismaClient,
        private readonly deleteBotAccountData: DeleteBotAccountData,
    ) {}

    async startReauthentication(input: { userId: string; tokenHash: string; now: Date; alreadyFresh: boolean }): Promise<void> {
        const expiresAt = new Date(input.now.getTime() + REAUTHENTICATION_WINDOW_MS);
        const reauthenticatedAt = input.alreadyFresh ? input.now : null;

        await this.prisma.accountDeletionReauthChallenge.upsert({
            where: { userId: input.userId },
            create: {
                id: crypto.randomUUID(),
                userId: input.userId,
                tokenHash: input.tokenHash,
                createdAt: input.now,
                expiresAt,
                reauthenticatedAt,
            },
            update: {
                tokenHash: input.tokenHash,
                createdAt: input.now,
                expiresAt,
                reauthenticatedAt,
                consumedAt: null,
            },
        });
    }

    async completeReauthentication(input: { userId: string; tokenHash: string; sessionCreatedAt: Date; now: Date }): Promise<Date> {
        return this.prisma.$transaction(async (transaction) => {
            const challenge = await getChallenge(transaction, input.userId, input.tokenHash);
            assertChallengeUsable(challenge, input.now);

            if (challenge.reauthenticatedAt) return challenge.reauthenticatedAt;
            if (input.sessionCreatedAt.getTime() < challenge.createdAt.getTime() - 5_000) {
                throw new AccountDeletionStoreError("challenge_stale");
            }

            const result = await transaction.accountDeletionReauthChallenge.updateMany({
                where: { id: challenge.id, reauthenticatedAt: null, consumedAt: null },
                data: { reauthenticatedAt: input.now },
            });
            if (result.count !== 1) throw new AccountDeletionStoreError("challenge_invalid");
            return input.now;
        });
    }

    async deleteAccount(input: { userId: string; tokenHash: string; now: Date }): Promise<void> {
        await this.prisma.$transaction(async (transaction) => {
            const challenge = await getChallenge(transaction, input.userId, input.tokenHash);
            assertChallengeUsable(challenge, input.now);
            if (!challenge.reauthenticatedAt || input.now.getTime() - challenge.reauthenticatedAt.getTime() >= REAUTHENTICATION_WINDOW_MS) {
                throw new AccountDeletionStoreError("challenge_stale");
            }

            const account = await transaction.account.findFirst({
                where: { userId: input.userId, providerId: "discord" },
                select: { accountId: true },
            });
            const discordAccountId = account?.accountId;
            if (!discordAccountId) throw new AccountDeletionStoreError("account_not_found");

            await this.deleteBotAccountData(discordAccountId);
            await transaction.user.deleteMany({ where: { id: input.userId } });
        });
    }
}

async function getChallenge(prisma: Prisma.TransactionClient, userId: string, tokenHash: string) {
    const challenge = await prisma.accountDeletionReauthChallenge.findUnique({
        where: { userId },
        select: { id: true, createdAt: true, expiresAt: true, reauthenticatedAt: true, consumedAt: true, tokenHash: true },
    });
    if (!challenge || !safelyEqualHashes(challenge.tokenHash, tokenHash)) throw new AccountDeletionStoreError("challenge_invalid");
    return challenge;
}

function assertChallengeUsable(challenge: { consumedAt: Date | null; expiresAt: Date }, now: Date): void {
    if (challenge.consumedAt) throw new AccountDeletionStoreError("challenge_invalid");
    if (challenge.expiresAt.getTime() <= now.getTime()) throw new AccountDeletionStoreError("challenge_stale");
}
