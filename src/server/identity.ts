import type { PrismaClient } from "../generated/prisma/web/client";

import { auth } from "./auth";
import { webPrisma } from "./database/web";

export interface HanamiIdentity {
    userId: string;
    sessionId: string;
}

export interface IdentityService {
    getCurrent(headers: Headers): Promise<HanamiIdentity | null>;
    resolveDiscordId(userId: string): Promise<string | null>;
}

export class ServerIdentityService implements IdentityService {
    constructor(
        private readonly getSession: (headers: Headers) => ReturnType<typeof auth.api.getSession>,
        private readonly prisma: PrismaClient,
    ) {}

    async getCurrent(headers: Headers): Promise<HanamiIdentity | null> {
        const session = await this.getSession(headers);
        if (!session) return null;

        return {
            userId: session.user.id,
            sessionId: session.session.id,
        };
    }

    async resolveDiscordId(userId: string): Promise<string | null> {
        const account = await this.prisma.account.findFirst({
            where: { userId, providerId: "discord" },
            select: { accountId: true },
        });
        return account?.accountId ?? null;
    }
}

export const serverIdentity = new ServerIdentityService((headers) => auth.api.getSession({ headers }), webPrisma);
