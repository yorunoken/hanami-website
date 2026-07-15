import type { Pool, PoolConnection, RowDataPacket } from "mysql2/promise";

const migrationLockName = "hanami-web-schema-migrations";

interface MigrationLockRow extends RowDataPacket {
    acquired: number | string | null;
}

interface AppliedMigrationRow extends RowDataPacket {
    id: string;
}

interface IndexRow extends RowDataPacket {
    present: number | string;
}

const migrations = [
    {
        id: "20260715_account_deletion_reauthentication",
        statements: [
            `CREATE TABLE IF NOT EXISTS accountDeletionReauthChallenge (
                id VARCHAR(36) NOT NULL,
                userId VARCHAR(36) NOT NULL,
                tokenHash CHAR(64) NOT NULL,
                createdAt TIMESTAMP(3) NOT NULL,
                expiresAt TIMESTAMP(3) NOT NULL,
                reauthenticatedAt TIMESTAMP(3) NULL,
                consumedAt TIMESTAMP(3) NULL,
                PRIMARY KEY (id),
                UNIQUE KEY accountDeletionReauthChallenge_user_unique (userId),
                KEY accountDeletionReauthChallenge_lookup_idx (userId, tokenHash),
                KEY accountDeletionReauthChallenge_expiry_idx (expiresAt),
                CONSTRAINT accountDeletionReauthChallenge_user_fk
                    FOREIGN KEY (userId) REFERENCES user (id) ON DELETE CASCADE
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
        ],
    },
    {
        id: "20260715_discord_magic_link_and_osu_state",
        statements: [
            `CREATE TABLE IF NOT EXISTS discordLinkTicket (
                id VARCHAR(36) NOT NULL,
                tokenHash CHAR(64) NOT NULL,
                discordUserId VARCHAR(20) NOT NULL,
                username VARCHAR(32) NOT NULL,
                displayName VARCHAR(100) NOT NULL,
                avatarUrl TEXT NOT NULL,
                createdAt TIMESTAMP(3) NOT NULL,
                expiresAt TIMESTAMP(3) NOT NULL,
                consumedAt TIMESTAMP(3) NULL,
                invalidatedAt TIMESTAMP(3) NULL,
                PRIMARY KEY (id),
                UNIQUE KEY discordLinkTicket_tokenHash_unique (tokenHash),
                KEY discordLinkTicket_discord_active_idx (discordUserId, consumedAt, invalidatedAt),
                KEY discordLinkTicket_expiresAt_idx (expiresAt)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
            `CREATE TABLE IF NOT EXISTS osuOAuthState (
                id VARCHAR(36) NOT NULL,
                stateHash CHAR(64) NOT NULL,
                userId VARCHAR(36) NOT NULL,
                sessionId VARCHAR(36) NOT NULL,
                createdAt TIMESTAMP(3) NOT NULL,
                expiresAt TIMESTAMP(3) NOT NULL,
                consumedAt TIMESTAMP(3) NULL,
                PRIMARY KEY (id),
                UNIQUE KEY osuOAuthState_stateHash_unique (stateHash),
                KEY osuOAuthState_binding_idx (userId, sessionId, consumedAt),
                KEY osuOAuthState_expiresAt_idx (expiresAt),
                CONSTRAINT osuOAuthState_user_fk
                    FOREIGN KEY (userId) REFERENCES user (id) ON DELETE CASCADE,
                CONSTRAINT osuOAuthState_session_fk
                    FOREIGN KEY (sessionId) REFERENCES session (id) ON DELETE CASCADE
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
        ],
        run: ensureUniqueProviderAccountIndex,
    },
] as const;

export async function runWebMigrations(pool: Pool): Promise<void> {
    const connection = await pool.getConnection();
    let lockAcquired = false;

    try {
        const [lockRows] = await connection.execute<MigrationLockRow[]>("SELECT GET_LOCK(?, 30) AS acquired", [migrationLockName]);
        lockAcquired = Number(lockRows[0]?.acquired) === 1;
        if (!lockAcquired) throw new Error("Could not acquire the web database migration lock");

        await connection.query(`CREATE TABLE IF NOT EXISTS webSchemaMigration (
            id VARCHAR(191) NOT NULL,
            appliedAt TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
            PRIMARY KEY (id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);

        for (const migration of migrations) {
            const [appliedRows] = await connection.execute<AppliedMigrationRow[]>(
                "SELECT id FROM webSchemaMigration WHERE id = ? LIMIT 1",
                [migration.id],
            );
            if (appliedRows[0]) continue;

            for (const statement of migration.statements) await connection.query(statement);
            if ("run" in migration) await migration.run(connection);
            await connection.execute("INSERT INTO webSchemaMigration (id) VALUES (?)", [migration.id]);
        }
    } finally {
        if (lockAcquired) await connection.execute("SELECT RELEASE_LOCK(?)", [migrationLockName]).catch(() => undefined);
        connection.release();
    }
}

async function ensureUniqueProviderAccountIndex(connection: PoolConnection): Promise<void> {
    const [indexRows] = await connection.execute<IndexRow[]>(
        `SELECT COUNT(*) AS present
           FROM information_schema.statistics
          WHERE table_schema = DATABASE()
            AND table_name = 'account'
            AND index_name = 'account_provider_account_unique'`,
    );
    if (Number(indexRows[0]?.present) > 0) return;

    const [duplicateRows] = await connection.query<RowDataPacket[]>(
        `SELECT providerId, accountId
           FROM account
          GROUP BY providerId, accountId
         HAVING COUNT(*) > 1
          LIMIT 1`,
    );
    if (duplicateRows[0]) throw new Error("Duplicate provider accounts must be resolved before applying this migration");

    await connection.query("ALTER TABLE account ADD UNIQUE KEY account_provider_account_unique (providerId(64), accountId(191))");
}
