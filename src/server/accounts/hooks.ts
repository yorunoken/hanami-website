import type { BetterAuthOptions } from "better-auth";

import { isFreshAuthentication } from "../deletion-requests/domain";
import type { TemporaryBotAccountCompatibility } from "./bot-compatibility";
import { isLoginProvider } from "./service";

type DatabaseHooks = NonNullable<BetterAuthOptions["databaseHooks"]>;

export function createAccountHooks(botCompatibility: TemporaryBotAccountCompatibility): DatabaseHooks {
    return {
        account: {
            create: {
                before: async (account, context) => {
                    if (!isLoginProvider(account.providerId)) return;
                    const activeSession = context?.context.session;
                    if (activeSession && !isFreshAuthentication(new Date(activeSession.session.createdAt))) {
                        throw Object.assign(new Error("Fresh authentication is required for provider linking"), {
                            code: "fresh_session_required",
                        });
                    }
                },
                after: async (account) => {
                    if (!isLoginProvider(account.providerId)) return;
                    await botCompatibility.runBestEffort("synchronize linked accounts", () =>
                        botCompatibility.synchronizeUser(account.userId),
                    );
                },
            },
            delete: {
                after: async (account) => {
                    if (!isLoginProvider(account.providerId)) return;
                    const provider = account.providerId;
                    await botCompatibility.runBestEffort("remove unlinked account", () =>
                        botCompatibility.accountRemoved(account.userId, provider, account.accountId),
                    );
                },
            },
        },
    };
}
