import type { Pool, RowDataPacket } from "mysql2/promise";

export const loginProviders = ["discord", "osu"] as const;
export type LoginProvider = (typeof loginProviders)[number];

export interface CanonicalUser {
    id: string;
    name: string;
    image: string | null;
    createdAt: Date;
    updatedAt: Date;
}

export interface LoginMethod {
    provider: LoginProvider;
    providerUserId: string;
    createdAt: Date;
}

interface UserRow extends RowDataPacket {
    id: string;
    name: string;
    image: string | null;
    createdAt: Date;
    updatedAt: Date;
}

interface AccountRow extends RowDataPacket {
    providerId: LoginProvider;
    accountId: string;
    createdAt: Date;
}

interface CountRow extends RowDataPacket {
    count: number | string;
}

export class AccountService {
    constructor(private readonly pool: Pool) {}

    async getCanonicalUser(userId: string): Promise<CanonicalUser | null> {
        const [rows] = await this.pool.execute<UserRow[]>("SELECT id, name, image, createdAt, updatedAt FROM user WHERE id = ? LIMIT 1", [
            userId,
        ]);
        return rows[0] ? mapUser(rows[0]) : null;
    }

    async listLoginMethods(userId: string): Promise<LoginMethod[]> {
        const [rows] = await this.pool.execute<AccountRow[]>(
            `SELECT providerId, accountId, createdAt
               FROM account
              WHERE userId = ? AND providerId IN ('discord', 'osu')
              ORDER BY FIELD(providerId, 'discord', 'osu'), createdAt`,
            [userId],
        );
        return rows.map((row) => ({
            provider: row.providerId,
            providerUserId: row.accountId,
            createdAt: new Date(row.createdAt),
        }));
    }

    async findUserByProviderAccount(provider: LoginProvider, providerUserId: string): Promise<CanonicalUser | null> {
        const [rows] = await this.pool.execute<UserRow[]>(
            `SELECT user.id, user.name, user.image, user.createdAt, user.updatedAt
               FROM account
               JOIN user ON user.id = account.userId
              WHERE account.providerId = ? AND account.accountId = ?
              LIMIT 1`,
            [provider, providerUserId],
        );
        return rows[0] ? mapUser(rows[0]) : null;
    }

    async countLoginMethods(userId: string): Promise<number> {
        const [rows] = await this.pool.execute<CountRow[]>("SELECT COUNT(*) AS count FROM account WHERE userId = ?", [userId]);
        return Number(rows[0]?.count ?? 0);
    }
}

export function isLoginProvider(value: unknown): value is LoginProvider {
    return typeof value === "string" && loginProviders.includes(value as LoginProvider);
}

function mapUser(row: UserRow): CanonicalUser {
    return {
        id: row.id,
        name: row.name,
        image: row.image,
        createdAt: new Date(row.createdAt),
        updatedAt: new Date(row.updatedAt),
    };
}
