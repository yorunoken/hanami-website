export const loginProviders = ["discord", "osu"] as const;
export type LoginProvider = (typeof loginProviders)[number];

export interface CanonicalUserRecord {
    id: string;
    name: string;
    email: string;
    emailVerified: boolean;
    image: string | null;
    createdAt: Date;
    updatedAt: Date;
}

export interface CanonicalAccountRecord {
    id: string;
    accountId: string;
    providerId: string;
    userId: string;
    accessToken?: string | null;
    refreshToken?: string | null;
    idToken?: string | null;
    accessTokenExpiresAt?: Date | null;
    refreshTokenExpiresAt?: Date | null;
    scope?: string | null;
    password?: string | null;
    createdAt: Date;
    updatedAt: Date;
}

export interface CanonicalOwnedRecordDelegate {
    updateMany(args: { where: { userId: string }; data: { userId: string } }): Promise<unknown>;
    findFirst?(args: { where: { userId: string } }): Promise<unknown>;
    deleteMany?(args: { where: { userId: string } }): Promise<unknown>;
    uniquePerUser?: boolean;
}

export interface CanonicalAccountDatabase {
    user: {
        findUnique(args: { where: { id: string } }): Promise<CanonicalUserRecord | null>;
        delete(args: { where: { id: string } }): Promise<unknown>;
    };
    account: {
        findFirst(args: { where: Record<string, string> }): Promise<CanonicalAccountRecord | null>;
        findMany(args: { where: { userId: string } }): Promise<CanonicalAccountRecord[]>;
        create(args: { data: CanonicalAccountRecord }): Promise<CanonicalAccountRecord>;
        update(args: { where: { id: string }; data: { userId: string } }): Promise<CanonicalAccountRecord>;
    };
    session: {
        deleteMany(args: { where: { userId: { in: string[] } } }): Promise<unknown>;
    };
    ownedRecords?: readonly CanonicalOwnedRecordDelegate[];
    $transaction<T>(
        callback: (transaction: CanonicalAccountDatabase) => Promise<T>,
        options: { isolationLevel: "Serializable" },
    ): Promise<T>;
}

export interface LoginMethod {
    provider: LoginProvider;
    providerUserId: string;
    createdAt: Date;
}

export interface LinkedAccountView {
    providerId: LoginProvider;
    accountId: string;
    displayName: string | null;
    avatarUrl: string | null;
    profileUrl: string | null;
}

export interface LinkProviderInput {
    userId: string;
    provider: LoginProvider;
    providerAccountId: string;
    account?: Partial<CanonicalAccountRecord>;
}

export type LinkProviderResult =
    | { status: "linked"; userId: string }
    | { status: "already-linked"; userId: string }
    | { status: "conflict"; userId: string; ownerUserId: string };

export interface VerifiedProviderProof {
    provider: LoginProvider;
    userId: string;
    providerAccountId: string;
    authenticatedAt: Date;
}

export interface MergeProofVerifier {
    verify(proofToken: string): Promise<VerifiedProviderProof | null>;
}

export interface MergeUsersInput {
    retainedUserId: string;
    duplicateUserId: string;
    retainedProofToken: string;
    duplicateProofToken: string;
}

export type MergeUsersResult = { status: "merged"; retainedUserId: string };

export class CanonicalAccountError extends Error {
    constructor(
        readonly code:
            | "CANONICAL_USER_NOT_FOUND"
            | "INVALID_PROVIDER_ACCOUNT_ID"
            | "MERGE_PROOF_REQUIRED"
            | "MERGE_PROOF_INVALID"
            | "MERGE_PROOF_STALE"
            | "MERGE_PROVIDER_CONFLICT",
        message: string,
    ) {
        super(message);
        this.name = "CanonicalAccountError";
    }
}

export interface CanonicalAccountServiceOptions {
    proofVerifier?: MergeProofVerifier;
    now?(): Date;
    mergeProofMaxAgeMs?: number;
}

const rejectingMergeProofVerifier: MergeProofVerifier = {
    verify: async () => null,
};

export class CanonicalAccountService {
    private readonly proofVerifier: MergeProofVerifier;
    private readonly now: () => Date;
    private readonly mergeProofMaxAgeMs: number;

    constructor(
        private readonly database: CanonicalAccountDatabase,
        options: CanonicalAccountServiceOptions = {},
    ) {
        this.proofVerifier = options.proofVerifier ?? rejectingMergeProofVerifier;
        this.now = options.now ?? (() => new Date());
        this.mergeProofMaxAgeMs = options.mergeProofMaxAgeMs ?? 5 * 60_000;
    }

    async linkProvider(input: LinkProviderInput): Promise<LinkProviderResult> {
        validateProviderAccountId(input.provider, input.providerAccountId);
        const user = await this.database.user.findUnique({ where: { id: input.userId } });
        if (!user) throw new CanonicalAccountError("CANONICAL_USER_NOT_FOUND", "The canonical Hanami user was not found.");

        const existing = await this.database.account.findFirst({
            where: { providerId: input.provider, accountId: input.providerAccountId },
        });
        if (existing) {
            return existing.userId === input.userId
                ? { status: "already-linked", userId: input.userId }
                : { status: "conflict", userId: input.userId, ownerUserId: existing.userId };
        }

        const now = new Date();
        try {
            await this.database.account.create({
                data: {
                    ...input.account,
                    id: crypto.randomUUID(),
                    userId: input.userId,
                    providerId: input.provider,
                    accountId: input.providerAccountId,
                    createdAt: now,
                    updatedAt: now,
                },
            });
            return { status: "linked", userId: input.userId };
        } catch (error) {
            const winner = await this.database.account.findFirst({
                where: { providerId: input.provider, accountId: input.providerAccountId },
            });
            if (!winner) throw error;
            return winner.userId === input.userId
                ? { status: "already-linked", userId: input.userId }
                : { status: "conflict", userId: input.userId, ownerUserId: winner.userId };
        }
    }

    async getCanonicalUser(userId: string): Promise<CanonicalUserRecord | null> {
        return this.database.user.findUnique({ where: { id: userId } });
    }

    async listLoginMethods(userId: string): Promise<LoginMethod[]> {
        const accounts = await this.database.account.findMany({ where: { userId } });
        return accounts
            .filter((account): account is CanonicalAccountRecord & { providerId: LoginProvider } => isLoginProvider(account.providerId))
            .sort((left, right) => providerSort(left.providerId) - providerSort(right.providerId))
            .map((account) => ({ provider: account.providerId, providerUserId: account.accountId, createdAt: account.createdAt }));
    }

    async listLinkedAccountViews(userId: string): Promise<LinkedAccountView[]> {
        const methods = await this.listLoginMethods(userId);
        return methods.map((method) =>
            toLinkedAccountView({
                providerId: method.provider,
                accountId: method.providerUserId,
                displayName: null,
                avatarUrl: null,
            }),
        );
    }

    async countLoginMethods(userId: string): Promise<number> {
        return (await this.listLoginMethods(userId)).length;
    }

    async findUserByProviderAccount(provider: LoginProvider, providerAccountId: string): Promise<CanonicalUserRecord | null> {
        const account = await this.database.account.findFirst({ where: { providerId: provider, accountId: providerAccountId } });
        return account ? this.database.user.findUnique({ where: { id: account.userId } }) : null;
    }

    async mergeUsers(input: MergeUsersInput): Promise<MergeUsersResult> {
        if (input.retainedUserId === input.duplicateUserId)
            throw new CanonicalAccountError("MERGE_PROOF_REQUIRED", "Two distinct users are required.");
        const [retainedProof, duplicateProof] = await Promise.all([
            this.verifyMergeProof(input.retainedProofToken, input.retainedUserId),
            this.verifyMergeProof(input.duplicateProofToken, input.duplicateUserId),
        ]);

        return this.database.$transaction(
            async (transaction) => {
                const [retained, duplicate] = await Promise.all([
                    transaction.user.findUnique({ where: { id: input.retainedUserId } }),
                    transaction.user.findUnique({ where: { id: input.duplicateUserId } }),
                ]);
                if (!retained || !duplicate) throw new CanonicalAccountError("MERGE_PROOF_REQUIRED", "Both canonical users must exist.");

                await requireVerifiedOwnership(transaction, retainedProof);
                await requireVerifiedOwnership(transaction, duplicateProof);

                const [retainedAccounts, duplicateAccounts] = await Promise.all([
                    transaction.account.findMany({ where: { userId: input.retainedUserId } }),
                    transaction.account.findMany({ where: { userId: input.duplicateUserId } }),
                ]);
                const retainedProviders = new Set(retainedAccounts.map((account) => account.providerId));
                if (duplicateAccounts.some((account) => retainedProviders.has(account.providerId))) {
                    throw new CanonicalAccountError(
                        "MERGE_PROVIDER_CONFLICT",
                        "The canonical users have overlapping provider identities that must be resolved first.",
                    );
                }

                for (const account of duplicateAccounts) {
                    await transaction.account.update({ where: { id: account.id }, data: { userId: input.retainedUserId } });
                }
                for (const record of transaction.ownedRecords ?? []) {
                    if (record.uniquePerUser && record.findFirst && record.deleteMany) {
                        const retainedRecord = await record.findFirst({ where: { userId: input.retainedUserId } });
                        if (retainedRecord) {
                            await record.deleteMany({ where: { userId: input.duplicateUserId } });
                            continue;
                        }
                    }
                    await record.updateMany({ where: { userId: input.duplicateUserId }, data: { userId: input.retainedUserId } });
                }
                await transaction.session.deleteMany({ where: { userId: { in: [input.retainedUserId, input.duplicateUserId] } } });
                await transaction.user.delete({ where: { id: input.duplicateUserId } });

                return { status: "merged", retainedUserId: input.retainedUserId };
            },
            { isolationLevel: "Serializable" },
        );
    }

    private async verifyMergeProof(proofToken: string, expectedUserId: string): Promise<VerifiedProviderProof> {
        if (!proofToken || proofToken.length > 4096) {
            throw new CanonicalAccountError("MERGE_PROOF_INVALID", "A valid proof for both provider identities is required.");
        }

        let proof: VerifiedProviderProof | null;
        try {
            proof = await this.proofVerifier.verify(proofToken);
        } catch {
            throw new CanonicalAccountError("MERGE_PROOF_INVALID", "A valid proof for both provider identities is required.");
        }
        if (!proof || proof.userId !== expectedUserId || !isLoginProvider(proof.provider)) {
            throw new CanonicalAccountError("MERGE_PROOF_INVALID", "A valid proof for both provider identities is required.");
        }
        try {
            validateProviderAccountId(proof.provider, proof.providerAccountId);
        } catch {
            throw new CanonicalAccountError("MERGE_PROOF_INVALID", "A valid proof for both provider identities is required.");
        }

        if (!(proof.authenticatedAt instanceof Date)) {
            throw new CanonicalAccountError("MERGE_PROOF_INVALID", "A valid proof for both provider identities is required.");
        }
        const authenticatedAt = proof.authenticatedAt.getTime();
        const age = this.now().getTime() - authenticatedAt;
        if (!Number.isFinite(authenticatedAt) || age < 0) {
            throw new CanonicalAccountError("MERGE_PROOF_INVALID", "A valid proof for both provider identities is required.");
        }
        if (age > this.mergeProofMaxAgeMs) {
            throw new CanonicalAccountError("MERGE_PROOF_STALE", "Both provider identities must be authenticated again before merging.");
        }
        return proof;
    }
}

export function createCanonicalAccountDatabase(prisma: unknown): CanonicalAccountDatabase {
    const source = prisma as PrismaAccountSurface;
    return createDatabaseAdapter(source);
}

export function isLoginProvider(value: unknown): value is LoginProvider {
    return typeof value === "string" && loginProviders.includes(value as LoginProvider);
}

export function toLinkedAccountView(
    account: Pick<LinkedAccountView, "providerId" | "accountId" | "displayName" | "avatarUrl">,
): LinkedAccountView {
    if (account.providerId === "osu") {
        return {
            ...account,
            avatarUrl: account.avatarUrl ?? `https://a.ppy.sh/${encodeURIComponent(account.accountId)}`,
            profileUrl: `https://osu.ppy.sh/users/${encodeURIComponent(account.accountId)}`,
        };
    }
    return { ...account, profileUrl: null };
}

function providerSort(provider: LoginProvider): number {
    return provider === "discord" ? 0 : 1;
}

function validateProviderAccountId(provider: LoginProvider, accountId: string): void {
    const valid = provider === "discord" ? /^\d{17,20}$/.test(accountId) : /^[1-9]\d{0,19}$/.test(accountId);
    if (!valid) throw new CanonicalAccountError("INVALID_PROVIDER_ACCOUNT_ID", `The ${provider} provider account ID is invalid.`);
}

async function requireVerifiedOwnership(database: CanonicalAccountDatabase, proof: VerifiedProviderProof): Promise<void> {
    const account = await database.account.findFirst({
        where: { userId: proof.userId, providerId: proof.provider, accountId: proof.providerAccountId },
    });
    if (!account) throw new CanonicalAccountError("MERGE_PROOF_INVALID", "Provider ownership changed before the merge completed.");
}

interface PrismaAccountSurface extends Omit<CanonicalAccountDatabase, "$transaction" | "ownedRecords"> {
    [key: string]: unknown;
    $transaction(callback: (transaction: unknown) => Promise<unknown>, options: { isolationLevel: "Serializable" }): Promise<unknown>;
}

function createDatabaseAdapter(prisma: PrismaAccountSurface): CanonicalAccountDatabase {
    const ownedRecordDefinitions: readonly [string, boolean][] = [
        ["accountDeletionReauthChallenge", true],
        ["osuProfile", true],
        ["oauthRefreshToken", false],
        ["oauthAccessToken", false],
        ["oauthConsent", false],
    ];
    const ownedRecords = ownedRecordDefinitions.flatMap(([name, uniquePerUser]) => {
        const delegate = prisma[name as string];
        return isRecord(delegate) && typeof delegate.updateMany === "function"
            ? [
                  {
                      updateMany: delegate.updateMany.bind(delegate) as CanonicalOwnedRecordDelegate["updateMany"],
                      ...(typeof delegate.findFirst === "function"
                          ? { findFirst: delegate.findFirst.bind(delegate) as NonNullable<CanonicalOwnedRecordDelegate["findFirst"]> }
                          : {}),
                      ...(typeof delegate.deleteMany === "function"
                          ? { deleteMany: delegate.deleteMany.bind(delegate) as NonNullable<CanonicalOwnedRecordDelegate["deleteMany"]> }
                          : {}),
                      uniquePerUser,
                  },
              ]
            : [];
    });

    return {
        user: prisma.user,
        account: prisma.account,
        session: prisma.session,
        ownedRecords,
        $transaction: async <T>(
            callback: (transaction: CanonicalAccountDatabase) => Promise<T>,
            options: { isolationLevel: "Serializable" },
        ) =>
            prisma.$transaction(
                (transaction) => callback(createDatabaseAdapter(transaction as PrismaAccountSurface)),
                options,
            ) as Promise<T>,
    };
}

function isRecord(value: unknown): value is Record<string, CallableFunction | unknown> {
    return typeof value === "object" && value !== null;
}
