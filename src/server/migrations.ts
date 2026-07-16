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

const companionOAuthMigration = {
    id: "20260716_companion_oauth",
    statements: [
        `CREATE TABLE IF NOT EXISTS companionAuthorizationRequest (
                id VARCHAR(36) NOT NULL,
                userId VARCHAR(36) NOT NULL,
                sessionId VARCHAR(36) NOT NULL,
                clientId VARCHAR(64) NOT NULL,
                redirectUri VARCHAR(255) NOT NULL,
                state VARCHAR(512) NOT NULL,
                codeChallenge CHAR(43) NOT NULL,
                codeChallengeMethod VARCHAR(8) NOT NULL,
                deviceName VARCHAR(100) NOT NULL,
                platform VARCHAR(20) NOT NULL,
                csrfTokenHash CHAR(64) NOT NULL,
                createdAt TIMESTAMP(3) NOT NULL,
                expiresAt TIMESTAMP(3) NOT NULL,
                consumedAt TIMESTAMP(3) NULL,
                PRIMARY KEY (id),
                UNIQUE KEY companionAuthorizationRequest_csrf_unique (csrfTokenHash),
                KEY companionAuthorizationRequest_binding_idx (userId, sessionId, consumedAt),
                KEY companionAuthorizationRequest_expiry_idx (expiresAt),
                CONSTRAINT companionAuthorizationRequest_user_fk
                    FOREIGN KEY (userId) REFERENCES user (id) ON DELETE CASCADE,
                CONSTRAINT companionAuthorizationRequest_session_fk
                    FOREIGN KEY (sessionId) REFERENCES session (id) ON DELETE CASCADE
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
        `CREATE TABLE IF NOT EXISTS companionAuthorizationCode (
                id VARCHAR(36) NOT NULL,
                codeHash CHAR(64) NOT NULL,
                userId VARCHAR(36) NOT NULL,
                clientId VARCHAR(64) NOT NULL,
                redirectUri VARCHAR(255) NOT NULL,
                codeChallenge CHAR(43) NOT NULL,
                codeChallengeMethod VARCHAR(8) NOT NULL,
                deviceName VARCHAR(100) NOT NULL,
                platform VARCHAR(20) NOT NULL,
                createdAt TIMESTAMP(3) NOT NULL,
                expiresAt TIMESTAMP(3) NOT NULL,
                usedAt TIMESTAMP(3) NULL,
                PRIMARY KEY (id),
                UNIQUE KEY companionAuthorizationCode_hash_unique (codeHash),
                KEY companionAuthorizationCode_user_idx (userId, createdAt),
                KEY companionAuthorizationCode_expiry_idx (expiresAt, usedAt),
                CONSTRAINT companionAuthorizationCode_user_fk
                    FOREIGN KEY (userId) REFERENCES user (id) ON DELETE CASCADE
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
        `CREATE TABLE IF NOT EXISTS companionDevice (
                id VARCHAR(36) NOT NULL,
                userId VARCHAR(36) NOT NULL,
                displayName VARCHAR(100) NOT NULL,
                platform VARCHAR(20) NOT NULL,
                createdAt TIMESTAMP(3) NOT NULL,
                lastUsedAt TIMESTAMP(3) NOT NULL,
                revokedAt TIMESTAMP(3) NULL,
                PRIMARY KEY (id),
                KEY companionDevice_user_idx (userId, createdAt),
                KEY companionDevice_user_active_idx (userId, revokedAt),
                CONSTRAINT companionDevice_user_fk
                    FOREIGN KEY (userId) REFERENCES user (id) ON DELETE CASCADE
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
        `CREATE TABLE IF NOT EXISTS companionTokenFamily (
                id VARCHAR(36) NOT NULL,
                deviceId VARCHAR(36) NOT NULL,
                userId VARCHAR(36) NOT NULL,
                clientId VARCHAR(64) NOT NULL,
                createdAt TIMESTAMP(3) NOT NULL,
                lastUsedAt TIMESTAMP(3) NOT NULL,
                revokedAt TIMESTAMP(3) NULL,
                PRIMARY KEY (id),
                UNIQUE KEY companionTokenFamily_device_unique (deviceId),
                KEY companionTokenFamily_user_idx (userId, revokedAt),
                CONSTRAINT companionTokenFamily_device_fk
                    FOREIGN KEY (deviceId) REFERENCES companionDevice (id) ON DELETE CASCADE,
                CONSTRAINT companionTokenFamily_user_fk
                    FOREIGN KEY (userId) REFERENCES user (id) ON DELETE CASCADE
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
        `CREATE TABLE IF NOT EXISTS companionAccessToken (
                id VARCHAR(36) NOT NULL,
                tokenHash CHAR(64) NOT NULL,
                familyId VARCHAR(36) NOT NULL,
                deviceId VARCHAR(36) NOT NULL,
                userId VARCHAR(36) NOT NULL,
                createdAt TIMESTAMP(3) NOT NULL,
                expiresAt TIMESTAMP(3) NOT NULL,
                lastUsedAt TIMESTAMP(3) NULL,
                revokedAt TIMESTAMP(3) NULL,
                PRIMARY KEY (id),
                UNIQUE KEY companionAccessToken_hash_unique (tokenHash),
                KEY companionAccessToken_family_idx (familyId, revokedAt),
                KEY companionAccessToken_expiry_idx (expiresAt),
                KEY companionAccessToken_user_idx (userId, deviceId),
                CONSTRAINT companionAccessToken_family_fk
                    FOREIGN KEY (familyId) REFERENCES companionTokenFamily (id) ON DELETE CASCADE,
                CONSTRAINT companionAccessToken_device_fk
                    FOREIGN KEY (deviceId) REFERENCES companionDevice (id) ON DELETE CASCADE,
                CONSTRAINT companionAccessToken_user_fk
                    FOREIGN KEY (userId) REFERENCES user (id) ON DELETE CASCADE
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
        `CREATE TABLE IF NOT EXISTS companionRefreshToken (
                id VARCHAR(36) NOT NULL,
                tokenHash CHAR(64) NOT NULL,
                familyId VARCHAR(36) NOT NULL,
                parentTokenId VARCHAR(36) NULL,
                replacedByTokenId VARCHAR(36) NULL,
                createdAt TIMESTAMP(3) NOT NULL,
                expiresAt TIMESTAMP(3) NOT NULL,
                usedAt TIMESTAMP(3) NULL,
                revokedAt TIMESTAMP(3) NULL,
                PRIMARY KEY (id),
                UNIQUE KEY companionRefreshToken_hash_unique (tokenHash),
                KEY companionRefreshToken_family_idx (familyId, revokedAt),
                KEY companionRefreshToken_expiry_idx (expiresAt, usedAt),
                KEY companionRefreshToken_parent_idx (parentTokenId),
                CONSTRAINT companionRefreshToken_family_fk
                    FOREIGN KEY (familyId) REFERENCES companionTokenFamily (id) ON DELETE CASCADE
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
    ],
} as const;

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
    companionOAuthMigration,
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
