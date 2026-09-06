import { describe, expect, it } from "bun:test";
import type { Account, BetterAuthOptions, InternalAdapter, User } from "better-auth";

import { resolveDiscordIdentity } from "./better-auth";
import type { DiscordLinkTicket } from "./tickets";

const createdAt = new Date("2026-07-15T12:00:00.000Z");

describe("Better Auth Discord identity resolution", () => {
    it("resolves the user belonging to the requested Discord account", async () => {
        const adapter = new MemoryAuthAdapter(
            [makeUser("user-1"), makeUser("user-2")],
            [makeAccount("account-1", "111111111111111111", "user-1"), makeAccount("account-2", "222222222222222222", "user-2")],
        );

        const user = await resolveDiscordIdentity(adapter.value, makeTicket("222222222222222222"));

        expect(user.id).toBe("user-2");
        expect(adapter.createOAuthUserCount).toBe(0);
    });

    it("creates one user/account pair and reuses it on later resolutions", async () => {
        const adapter = new MemoryAuthAdapter();
        const ticket = makeTicket("123456789012345678");

        const first = await resolveDiscordIdentity(adapter.value, ticket);
        const second = await resolveDiscordIdentity(adapter.value, ticket);

        expect(second.id).toBe(first.id);
        expect(adapter.users).toHaveLength(1);
        expect(adapter.accounts).toHaveLength(1);
        expect(adapter.accounts[0]).toMatchObject({ providerId: "discord", accountId: ticket.discordUserId, userId: first.id });
        expect(adapter.users[0]).toMatchObject({
            email: "discord-123456789012345678@users.hanami.invalid",
            emailVerified: false,
        });
        expect(adapter.createOAuthUserCount).toBe(1);
    });
});

class MemoryAuthAdapter {
    createOAuthUserCount = 0;

    constructor(
        readonly users: User[] = [],
        readonly accounts: Account[] = [],
    ) {}

    readonly value = {
        findAccountByKey: async ({ accountId, providerId }: { accountId: string; providerId: string }) =>
            this.accounts.find((account) => account.accountId === accountId && account.providerId === providerId) ?? null,
        findUserById: async (userId: string) => this.users.find((user) => user.id === userId) ?? null,
        findUserByEmail: async (email: string) => {
            const user = this.users.find((candidate) => candidate.email === email);
            return user ? { user, accounts: this.accounts.filter((account) => account.userId === user.id) } : null;
        },
        linkAccount: async (account: Omit<Account, "id" | "createdAt" | "updatedAt"> & Partial<Account>) => {
            const created = makeAccount(crypto.randomUUID(), account.accountId, account.userId);
            this.accounts.push(created);
            return created;
        },
        createOAuthUser: async (
            user: Omit<User, "id" | "createdAt" | "updatedAt">,
            account: Omit<Account, "id" | "userId" | "createdAt" | "updatedAt">,
        ) => {
            this.createOAuthUserCount += 1;
            const createdUser: User = { id: crypto.randomUUID(), createdAt, updatedAt: createdAt, ...user };
            const createdAccount = makeAccount(crypto.randomUUID(), account.accountId, createdUser.id);
            this.users.push(createdUser);
            this.accounts.push(createdAccount);
            return { user: createdUser, account: createdAccount };
        },
        updateUser: async (userId: string, data: Partial<User>) => {
            const index = this.users.findIndex((user) => user.id === userId);
            if (index < 0) throw new Error("User not found");
            const updated = { ...this.users[index]!, ...data, updatedAt: createdAt };
            this.users[index] = updated;
            return updated;
        },
    } as unknown as InternalAdapter<BetterAuthOptions>;
}

function makeUser(id: string): User {
    return {
        id,
        name: id,
        email: `${id}@example.test`,
        emailVerified: true,
        image: null,
        createdAt,
        updatedAt: createdAt,
    };
}

function makeAccount(id: string, accountId: string, userId: string): Account {
    return { id, accountId, providerId: "discord", userId, createdAt, updatedAt: createdAt };
}

function makeTicket(discordUserId: string): DiscordLinkTicket {
    return {
        id: "ticket-1",
        discordUserId,
        username: "yoru",
        displayName: "Yoru",
        avatarUrl: `https://cdn.discordapp.com/avatars/${discordUserId}/avatar.png`,
        createdAt,
        expiresAt: new Date(createdAt.getTime() + 5 * 60_000),
    };
}
