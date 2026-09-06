import { botPrisma } from "../database/bot";
import { logSafeFailure } from "../security/http";
import type { LoginMethod } from "./service";

export interface BotAccountDatabase {
    user: {
        upsert(args: { where: { id: string }; create: { id: string; banchoId: string }; update: { banchoId: string } }): Promise<unknown>;
        updateMany(args: { where: { id: string }; data: { banchoId: null } }): Promise<unknown>;
    };
}

export interface CanonicalAccountMethods {
    listLoginMethods(userId: string): Promise<ReadonlyArray<Pick<LoginMethod, "provider" | "providerUserId">>>;
}

interface RemovedLoginMethod {
    provider: LoginMethod["provider"];
    providerUserId: string;
}

export class BotAccountCompatibility {
    constructor(
        private readonly accounts: CanonicalAccountMethods,
        private readonly botDatabase: BotAccountDatabase = botPrisma,
    ) {}

    async synchronizeUser(userId: string, removed?: RemovedLoginMethod): Promise<void> {
        const methods = await this.accounts.listLoginMethods(userId);
        const discord = methods.find((method) => method.provider === "discord");
        const osu = methods.find((method) => method.provider === "osu");

        if (removed?.provider === "discord") {
            await this.botDatabase.user.updateMany({ where: { id: removed.providerUserId }, data: { banchoId: null } });
            return;
        }
        if (removed?.provider === "osu") {
            if (!discord) return;
            await this.botDatabase.user.updateMany({ where: { id: discord.providerUserId }, data: { banchoId: null } });
            return;
        }
        if (!discord || !osu) return;

        await this.botDatabase.user.upsert({
            where: { id: discord.providerUserId },
            create: { id: discord.providerUserId, banchoId: osu.providerUserId },
            update: { banchoId: osu.providerUserId },
        });
    }

    async runBestEffort(operation: string, callback: () => Promise<void>): Promise<void> {
        try {
            await callback();
        } catch (error) {
            logSafeFailure(`Bot compatibility: ${operation}`, error);
        }
    }
}
