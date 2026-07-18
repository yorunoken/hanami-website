import type { SupportedIdentityProvider } from "./model";
import type { UserIdentityRepository } from "./repository";

export class IdentityUnlinkStateError extends Error {
    readonly code: "final_login_method" | "provider_account_missing" | "identity_reconciliation_required";

    constructor(code: IdentityUnlinkStateError["code"]) {
        super(code);
        this.name = "IdentityUnlinkStateError";
        this.code = code;
    }
}

interface UnlinkAccountApi {
    (input: { headers: Headers; body: { providerId: SupportedIdentityProvider; accountId: string } }): Promise<unknown>;
}

export interface UnlinkProviderAccountResult {
    alreadyUnlinked: boolean;
    providerUserId: string | null;
}

export async function unlinkProviderAccount(
    repository: UserIdentityRepository,
    unlinkAccount: UnlinkAccountApi,
    headers: Headers,
    userId: string,
    provider: SupportedIdentityProvider,
): Promise<UnlinkProviderAccountResult> {
    const [accounts, identities, accountCount] = await Promise.all([
        repository.getUserProviderAccounts(userId),
        repository.getUserAuthenticationIdentities(userId),
        repository.getUserAuthenticationAccountCount(userId),
    ]);
    const targetAccount = accounts.find((account) => account.provider === provider);
    const targetIdentity = identities.find((identity) => identity.provider === provider);
    if (!targetAccount && !targetIdentity) return { alreadyUnlinked: true, providerUserId: null };
    if (!targetAccount) throw new IdentityUnlinkStateError("provider_account_missing");
    if (!targetIdentity?.canAuthenticate || targetAccount.providerUserId !== targetIdentity.providerUserId) {
        throw new IdentityUnlinkStateError("identity_reconciliation_required");
    }
    if (accountCount <= 1) throw new IdentityUnlinkStateError("final_login_method");

    await unlinkAccount({
        headers,
        body: {
            providerId: provider,
            accountId: targetAccount.providerUserId,
        },
    });

    const [remainingAccounts, remainingIdentities] = await Promise.all([
        repository.getUserProviderAccounts(userId),
        repository.getUserIdentities(userId),
    ]);
    if (
        remainingAccounts.some((account) => account.id === targetAccount.id) ||
        remainingIdentities.some((identity) => identity.provider === provider && identity.providerUserId === targetAccount.providerUserId)
    ) {
        throw new IdentityUnlinkStateError("identity_reconciliation_required");
    }

    return { alreadyUnlinked: false, providerUserId: targetAccount.providerUserId };
}
