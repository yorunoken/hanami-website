import type { Pool, RowDataPacket } from "mysql2/promise";

import { auth, webDatabase } from "./auth";

export interface HanamiIdentity {
    userId: string;
    sessionId: string;
}

export interface IdentityService {
    getCurrent(headers: Headers): Promise<HanamiIdentity | null>;
    resolveDiscordId(userId: string): Promise<string | null>;
}

interface DiscordAccountRow extends RowDataPacket {
    accountId: string;
}

export class ServerIdentityService implements IdentityService {
    constructor(
        private readonly getSession: (headers: Headers) => ReturnType<typeof auth.api.getSession>,
        private readonly pool: Pool,
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
        const [accounts] = await this.pool.execute<DiscordAccountRow[]>(
            "SELECT accountId FROM account WHERE userId = ? AND providerId = 'discord' LIMIT 1",
            [userId],
        );
        return accounts[0]?.accountId ?? null;
    }
}

export const serverIdentity = new ServerIdentityService((headers) => auth.api.getSession({ headers }), webDatabase);
