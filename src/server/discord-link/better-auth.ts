import type { BetterAuthOptions, InternalAdapter, User } from "better-auth";

import { createDiscordPlaceholderEmail } from "@/lib/discord-identity";

import type { DiscordLinkTicket } from "./tickets";

export async function resolveDiscordIdentity(adapter: InternalAdapter<BetterAuthOptions>, ticket: DiscordLinkTicket): Promise<User> {
    const account = await adapter.findAccountByKey({ providerId: "discord", accountId: ticket.discordUserId });
    if (account) {
        const user = await adapter.findUserById(account.userId);
        if (!user) throw new Error("Discord account references a missing user");
        return updateSnapshot(adapter, user.id, ticket);
    }

    const email = createDiscordPlaceholderEmail(ticket.discordUserId);
    const existingUser = await adapter.findUserByEmail(email, { includeAccounts: true });

    try {
        if (existingUser) {
            await adapter.linkAccount({
                providerId: "discord",
                accountId: ticket.discordUserId,
                userId: existingUser.user.id,
            });
            return updateSnapshot(adapter, existingUser.user.id, ticket);
        }

        const created = await adapter.createOAuthUser(
            {
                name: ticket.displayName || ticket.username,
                email,
                emailVerified: false,
                image: ticket.avatarUrl,
            },
            {
                providerId: "discord",
                accountId: ticket.discordUserId,
            },
        );
        return created.user;
    } catch (error) {
        // A concurrent Discord OAuth callback can win the unique provider/account
        // insert. Re-read through Better Auth rather than creating another identity.
        const concurrentAccount = await adapter.findAccountByKey({ providerId: "discord", accountId: ticket.discordUserId });
        if (!concurrentAccount) throw error;
        const concurrentUser = await adapter.findUserById(concurrentAccount.userId);
        if (!concurrentUser) throw error;
        return updateSnapshot(adapter, concurrentUser.id, ticket);
    }
}

function updateSnapshot(adapter: InternalAdapter<BetterAuthOptions>, userId: string, ticket: DiscordLinkTicket): Promise<User> {
    return adapter.updateUser(userId, {
        name: ticket.displayName || ticket.username,
        image: ticket.avatarUrl,
    });
}
