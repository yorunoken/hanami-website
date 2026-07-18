import type { Account, BetterAuthOptions } from "better-auth";

import { isFreshAuthentication } from "../deletion-requests/domain";
import { logSafeFailure } from "../security/http";
import { IdentityConflictError, isSupportedIdentityProvider } from "./model";
import type { UserIdentityRepository } from "./repository";

type DatabaseHooks = NonNullable<BetterAuthOptions["databaseHooks"]>;

export function createIdentityDatabaseHooks(repository: UserIdentityRepository): DatabaseHooks {
    return {
        user: {
            update: {
                after: async (user, context) => {
                    const provider = providerFromAuthPath(context?.path);
                    if (!provider) return;
                    await synchronizeProfileSnapshot(repository, user, provider);
                },
            },
        },
        account: {
            create: {
                before: async (account, context) => {
                    if (!isSupportedIdentityProvider(account.providerId)) return;
                    const activeSession = context?.context.session;
                    if (activeSession && !isFreshAuthentication(new Date(activeSession.session.createdAt))) {
                        throw Object.assign(new Error("Fresh authentication is required for provider linking"), {
                            code: "fresh_session_required",
                        });
                    }
                    try {
                        await repository.assertProviderSlotAvailable(account.userId, account.providerId, account.accountId);
                    } catch (error) {
                        if (error instanceof IdentityConflictError) {
                            logIdentityConflict(account.userId, account.providerId);
                        }
                        throw error;
                    }
                },
                after: async (account) => {
                    await synchronizeAccount(repository, account);
                },
            },
            update: {
                after: async (account) => {
                    await synchronizeAccount(repository, account);
                },
            },
            delete: {
                after: async (account) => {
                    if (!isSupportedIdentityProvider(account.providerId)) return;
                    await repository.unlinkIdentity(account.userId, account.providerId);
                },
            },
        },
    };
}

export function providerFromAuthPath(path: string | undefined): "discord" | "osu" | null {
    if (!path) return null;
    const match = /(?:^|\/)(?:oauth2\/)?callback\/(discord|osu)(?:\/|$)/.exec(path);
    return match?.[1] === "discord" || match?.[1] === "osu" ? match[1] : null;
}

async function synchronizeAccount(repository: UserIdentityRepository, account: Account): Promise<void> {
    if (!isSupportedIdentityProvider(account.providerId)) return;
    const user = await repository.getUserByCanonicalId(account.userId);
    if (!user) throw new Error("Provider account references a missing canonical user");

    await repository.linkIdentity(account.userId, {
        provider: account.providerId,
        providerUserId: account.accountId,
        username: user.name,
        displayName: user.name,
        avatarUrl: user.image,
    });
}

async function synchronizeProfileSnapshot(
    repository: UserIdentityRepository,
    user: { id: string; name: string; image?: string | null },
    provider: "discord" | "osu",
): Promise<void> {
    const identity = (await repository.getUserIdentities(user.id)).find((candidate) => candidate.provider === provider);
    if (!identity) return;
    await repository.linkIdentity(user.id, {
        provider,
        providerUserId: identity.providerUserId,
        username: user.name,
        displayName: user.name,
        avatarUrl: user.image,
        metadata: identity.metadata,
    });
}

function logIdentityConflict(userId: string, provider: string): void {
    logSafeFailure(
        "link a provider identity",
        Object.assign(new Error("Provider identity conflict"), {
            code: "identity_conflict",
            userId: redactIdentifier(userId),
            provider,
        }),
    );
}

function redactIdentifier(value: string): string {
    return value.length <= 8 ? "[redacted]" : `${value.slice(0, 4)}…${value.slice(-4)}`;
}
