import { describe, expect, it } from "bun:test";

import {
    CanonicalAccountService,
    type CanonicalAccountDatabase,
    type CanonicalAccountRecord,
    type CanonicalUserRecord,
    type MergeProofVerifier,
    type VerifiedProviderProof,
} from "./service";

const createdAt = new Date("2026-09-06T10:00:00.000Z");
const proofTime = new Date("2026-09-06T10:05:00.000Z");

describe("canonical account service", () => {
    it("links a provider when neither provider subject exists", async () => {
        const database = makeDatabase([user("user-1")]);
        const service = new CanonicalAccountService(database);

        await expect(service.linkProvider({ userId: "user-1", provider: "osu", providerAccountId: "24680" })).resolves.toMatchObject({
            status: "linked",
            userId: "user-1",
        });
        expect(database.state.accounts).toContainEqual(expect.objectContaining({ providerId: "osu", accountId: "24680" }));
    });

    it("keeps the validated provider subject authoritative over optional account fields", async () => {
        const database = makeDatabase([user("user-1")]);
        const service = new CanonicalAccountService(database);

        await service.linkProvider({
            userId: "user-1",
            provider: "osu",
            providerAccountId: "24680",
            account: { accountId: "1", providerId: "discord", userId: "other-user" },
        });

        expect(database.state.accounts).toContainEqual(
            expect.objectContaining({ accountId: "24680", providerId: "osu", userId: "user-1" }),
        );
    });

    it("reports already-linked and never links by email", async () => {
        const database = makeDatabase([user("user-1"), user("user-2")], [account("discord", "123456789012345678", "user-1")]);
        const service = new CanonicalAccountService(database);

        await expect(
            service.linkProvider({ userId: "user-1", provider: "discord", providerAccountId: "123456789012345678" }),
        ).resolves.toMatchObject({ status: "already-linked" });
        await expect(
            service.linkProvider({ userId: "user-2", provider: "discord", providerAccountId: "123456789012345678" }),
        ).resolves.toMatchObject({ status: "conflict", ownerUserId: "user-1" });
        expect(database.state.accounts).toHaveLength(1);
    });

    it("merges only after proving both provider identities and invalidates both users", async () => {
        const database = makeDatabase(
            [user("retained"), user("duplicate")],
            [account("discord", "123456789012345678", "retained"), account("osu", "24680", "duplicate")],
        );
        database.state.ownedRecords = [{ id: "record-1", userId: "duplicate" }];
        database.state.sessions = [
            { id: "session-1", userId: "retained" },
            { id: "session-2", userId: "duplicate" },
        ];
        const service = createMergeService(database);

        await expect(
            service.mergeUsers({
                retainedUserId: "retained",
                duplicateUserId: "duplicate",
                retainedProofToken: "retained-proof",
                duplicateProofToken: "duplicate-proof",
            }),
        ).resolves.toEqual({ status: "merged", retainedUserId: "retained" });
        expect(database.state.users.map((candidate) => candidate.id)).toEqual(["retained"]);
        expect(database.state.accounts).toEqual([
            expect.objectContaining({ providerId: "discord", userId: "retained" }),
            expect.objectContaining({ providerId: "osu", userId: "retained" }),
        ]);
        expect(database.state.ownedRecords).toEqual([{ id: "record-1", userId: "retained" }]);
        expect(database.state.sessions).toEqual([]);
        expect(database.state.transactionOptions).toEqual({ isolationLevel: "Serializable" });
    });

    it("rejects a merge when either opaque proof is invalid", async () => {
        const database = makeDatabase(
            [user("retained"), user("duplicate")],
            [account("discord", "123456789012345678", "retained"), account("osu", "24680", "duplicate")],
        );
        const service = createMergeService(database, { "retained-proof": null });

        await expect(
            service.mergeUsers({
                retainedUserId: "retained",
                duplicateUserId: "duplicate",
                retainedProofToken: "retained-proof",
                duplicateProofToken: "duplicate-proof",
            }),
        ).rejects.toMatchObject({ code: "MERGE_PROOF_INVALID" });
        expect(database.state.users).toHaveLength(2);
    });

    it("rejects a stale merge proof before opening the transaction", async () => {
        const database = makeDatabase(
            [user("retained"), user("duplicate")],
            [account("discord", "123456789012345678", "retained"), account("osu", "24680", "duplicate")],
        );
        const service = createMergeService(database, {
            "retained-proof": {
                provider: "discord",
                userId: "retained",
                providerAccountId: "123456789012345678",
                authenticatedAt: new Date(proofTime.getTime() - 6 * 60_000),
            },
        });

        await expect(
            service.mergeUsers({
                retainedUserId: "retained",
                duplicateUserId: "duplicate",
                retainedProofToken: "retained-proof",
                duplicateProofToken: "duplicate-proof",
            }),
        ).rejects.toMatchObject({ code: "MERGE_PROOF_STALE" });
        expect(database.state.transactionOptions).toBeNull();
    });

    it("rechecks provider ownership inside the serializable transaction", async () => {
        const database = makeDatabase([user("retained"), user("duplicate")], [account("osu", "24680", "duplicate")]);
        const service = createMergeService(database);

        await expect(
            service.mergeUsers({
                retainedUserId: "retained",
                duplicateUserId: "duplicate",
                retainedProofToken: "retained-proof",
                duplicateProofToken: "duplicate-proof",
            }),
        ).rejects.toMatchObject({ code: "MERGE_PROOF_INVALID" });
        expect(database.state.transactionOptions).toEqual({ isolationLevel: "Serializable" });
        expect(database.state.users).toHaveLength(2);
    });

    it("rejects merge by default when no proof verifier is installed", async () => {
        const database = makeDatabase(
            [user("retained"), user("duplicate")],
            [account("discord", "123456789012345678", "retained"), account("osu", "24680", "duplicate")],
        );

        await expect(
            new CanonicalAccountService(database).mergeUsers({
                retainedUserId: "retained",
                duplicateUserId: "duplicate",
                retainedProofToken: "retained-proof",
                duplicateProofToken: "duplicate-proof",
            }),
        ).rejects.toMatchObject({ code: "MERGE_PROOF_INVALID" });
    });
});

function createMergeService(
    database: CanonicalAccountDatabase,
    overrides: Record<string, VerifiedProviderProof | null> = {},
): CanonicalAccountService {
    const proofs: Record<string, VerifiedProviderProof | null> = {
        "retained-proof": {
            provider: "discord",
            userId: "retained",
            providerAccountId: "123456789012345678",
            authenticatedAt: new Date(proofTime.getTime() - 60_000),
        },
        "duplicate-proof": {
            provider: "osu",
            userId: "duplicate",
            providerAccountId: "24680",
            authenticatedAt: new Date(proofTime.getTime() - 60_000),
        },
        ...overrides,
    };
    const proofVerifier: MergeProofVerifier = {
        verify: async (token) => proofs[token] ?? null,
    };
    return new CanonicalAccountService(database, { proofVerifier, now: () => proofTime });
}

function user(id: string): CanonicalUserRecord {
    return { id, name: id, email: `${id}@users.hanami.invalid`, emailVerified: false, image: null, createdAt, updatedAt: createdAt };
}

function account(providerId: "discord" | "osu", accountId: string, userId: string): CanonicalAccountRecord {
    return { id: `${providerId}-${accountId}`, providerId, accountId, userId, createdAt, updatedAt: createdAt };
}

function makeDatabase(
    initialUsers: CanonicalUserRecord[],
    initialAccounts: CanonicalAccountRecord[] = [],
): CanonicalAccountDatabase & {
    state: {
        users: CanonicalUserRecord[];
        accounts: CanonicalAccountRecord[];
        sessions: Array<{ id: string; userId: string }>;
        ownedRecords: Array<{ id: string; userId: string }>;
        transactionOptions: { isolationLevel: "Serializable" } | null;
    };
} {
    const state: {
        users: CanonicalUserRecord[];
        accounts: CanonicalAccountRecord[];
        sessions: Array<{ id: string; userId: string }>;
        ownedRecords: Array<{ id: string; userId: string }>;
        transactionOptions: { isolationLevel: "Serializable" } | null;
    } = { users: [...initialUsers], accounts: [...initialAccounts], sessions: [], ownedRecords: [], transactionOptions: null };
    const database = {
        state,
        user: {
            findUnique: async ({ where }: { where: { id: string } }) => state.users.find((candidate) => candidate.id === where.id) ?? null,
            delete: async ({ where }: { where: { id: string } }) => {
                const index = state.users.findIndex((candidate) => candidate.id === where.id);
                if (index >= 0) state.users.splice(index, 1);
            },
        },
        account: {
            findFirst: async ({ where }: { where: Partial<CanonicalAccountRecord> }) =>
                state.accounts.find(
                    (candidate) =>
                        (where.userId === undefined || candidate.userId === where.userId) &&
                        (where.providerId === undefined || candidate.providerId === where.providerId) &&
                        (where.accountId === undefined || candidate.accountId === where.accountId),
                ) ?? null,
            findMany: async ({ where }: { where: { userId: string } }) =>
                state.accounts.filter((candidate) => candidate.userId === where.userId),
            create: async ({ data }: { data: CanonicalAccountRecord }) => {
                state.accounts.push(data);
                return data;
            },
            update: async ({ where, data }: { where: { id: string }; data: { userId: string } }) => {
                const record = state.accounts.find((candidate) => candidate.id === where.id);
                if (!record) throw new Error("Account not found");
                record.userId = data.userId;
                return record;
            },
        },
        session: {
            deleteMany: async ({ where }: { where: { userId: { in: string[] } } }) => {
                state.sessions = state.sessions.filter((session) => !where.userId.in.includes(session.userId));
            },
        },
        ownedRecords: [
            {
                updateMany: async ({ where, data }: { where: { userId: string }; data: { userId: string } }) => {
                    for (const record of state.ownedRecords) if (record.userId === where.userId) record.userId = data.userId;
                },
            },
        ],
        $transaction: async <T>(
            callback: (transaction: CanonicalAccountDatabase) => Promise<T>,
            options: { isolationLevel: "Serializable" },
        ) => {
            state.transactionOptions = options;
            return callback(database as CanonicalAccountDatabase);
        },
    } as unknown as CanonicalAccountDatabase & { state: typeof state };
    return database;
}
