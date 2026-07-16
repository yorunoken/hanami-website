import type { Pool, PoolConnection, RowDataPacket } from "mysql2/promise";

const MIGRATION_LOCK = "hanami-web-unified-account-schema";

interface CountRow extends RowDataPacket {
    count: number | string;
}

interface LockRow extends RowDataPacket {
    acquired: number | string | null;
}

const migrations = [
    {
        id: "20260717_unified_account_state",
        statements: [
            `CREATE TABLE IF NOT EXISTS pending_hanami_registration (
                id VARCHAR(36) NOT NULL,
                browser_binding_hash CHAR(64) NOT NULL,
                discord_account_id VARCHAR(255) NULL,
                osu_account_id VARCHAR(255) NULL,
                discord_profile_snapshot JSON NULL,
                osu_profile_snapshot JSON NULL,
                created_at TIMESTAMP(3) NOT NULL,
                expires_at TIMESTAMP(3) NOT NULL,
                consumed_at TIMESTAMP(3) NULL,
                attempt_count INT NOT NULL DEFAULT 0,
                status VARCHAR(32) NOT NULL,
                correlation_id VARCHAR(36) NOT NULL,
                PRIMARY KEY (id),
                UNIQUE KEY pending_hanami_registration_correlation_unique (correlation_id),
                KEY pending_hanami_registration_browser_idx (browser_binding_hash, status, expires_at),
                KEY pending_hanami_registration_expiry_idx (status, expires_at)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
            `CREATE TABLE IF NOT EXISTS hanami_oauth_transaction (
                id VARCHAR(36) NOT NULL,
                state_hash CHAR(64) NOT NULL,
                pending_registration_id VARCHAR(36) NULL,
                browser_binding_hash CHAR(64) NOT NULL,
                user_id VARCHAR(255) NULL,
                session_id VARCHAR(255) NULL,
                provider_id VARCHAR(32) NOT NULL,
                intent VARCHAR(32) NOT NULL,
                code_verifier VARCHAR(128) NOT NULL,
                return_to VARCHAR(255) NOT NULL,
                created_at TIMESTAMP(3) NOT NULL,
                expires_at TIMESTAMP(3) NOT NULL,
                consumed_at TIMESTAMP(3) NULL,
                PRIMARY KEY (id),
                UNIQUE KEY hanami_oauth_transaction_state_unique (state_hash),
                KEY hanami_oauth_transaction_expiry_idx (expires_at, consumed_at),
                KEY hanami_oauth_transaction_pending_idx (pending_registration_id, consumed_at),
                CONSTRAINT hanami_oauth_transaction_pending_fk
                    FOREIGN KEY (pending_registration_id) REFERENCES pending_hanami_registration (id) ON DELETE CASCADE
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
            `CREATE TABLE IF NOT EXISTS identity_audit_event (
                id VARCHAR(36) NOT NULL,
                event_type VARCHAR(64) NOT NULL,
                canonical_user_id VARCHAR(255) NULL,
                provider_name VARCHAR(32) NULL,
                external_identifier_hash CHAR(64) NULL,
                correlation_id VARCHAR(36) NOT NULL,
                source_service VARCHAR(32) NOT NULL,
                outcome VARCHAR(32) NOT NULL,
                created_at TIMESTAMP(3) NOT NULL,
                PRIMARY KEY (id),
                KEY identity_audit_event_user_idx (canonical_user_id, created_at),
                KEY identity_audit_event_correlation_idx (correlation_id, created_at),
                KEY identity_audit_event_type_idx (event_type, created_at)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
            `CREATE TABLE IF NOT EXISTS hanami_provider_profile (
                id VARCHAR(36) NOT NULL,
                user_id VARCHAR(255) NOT NULL,
                provider_id VARCHAR(32) NOT NULL,
                account_id VARCHAR(255) NOT NULL,
                display_name VARCHAR(255) NOT NULL,
                image_url TEXT NULL,
                updated_at TIMESTAMP(3) NOT NULL,
                PRIMARY KEY (id),
                UNIQUE KEY hanami_provider_profile_user_provider_unique (user_id, provider_id),
                UNIQUE KEY hanami_provider_profile_provider_account_unique (provider_id, account_id),
                CONSTRAINT hanami_provider_profile_user_fk FOREIGN KEY (user_id) REFERENCES user (id) ON DELETE CASCADE
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
            `CREATE TABLE IF NOT EXISTS identity_migration_journal (
                migration_version INT NOT NULL,
                operation_id VARCHAR(64) NOT NULL,
                canonical_user_id VARCHAR(255) NOT NULL,
                discord_identity_hash CHAR(64) NOT NULL,
                osu_identity_hash CHAR(64) NOT NULL,
                web_status VARCHAR(32) NOT NULL,
                bot_status VARCHAR(32) NOT NULL,
                guessr_status VARCHAR(32) NOT NULL,
                attempt_count INT NOT NULL DEFAULT 0,
                last_error_code VARCHAR(64) NULL,
                created_at TIMESTAMP(3) NOT NULL,
                updated_at TIMESTAMP(3) NOT NULL,
                completed_at TIMESTAMP(3) NULL,
                PRIMARY KEY (operation_id),
                UNIQUE KEY identity_migration_journal_user_unique (migration_version, canonical_user_id),
                KEY identity_migration_journal_status_idx (migration_version, web_status, bot_status, guessr_status)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
            `CREATE TABLE IF NOT EXISTS identity_migration_state (
                id TINYINT NOT NULL,
                identity_schema_version INT NOT NULL,
                migration_phase VARCHAR(32) NOT NULL,
                legacy_linking_enabled BOOLEAN NOT NULL,
                migration_started_at TIMESTAMP(3) NULL,
                migration_completed_at TIMESTAMP(3) NULL,
                updated_at TIMESTAMP(3) NOT NULL,
                PRIMARY KEY (id)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
            `INSERT INTO identity_migration_state (
                id, identity_schema_version, migration_phase, legacy_linking_enabled, updated_at
            ) VALUES (1, 1, 'preflight', TRUE, CURRENT_TIMESTAMP(3))
            ON DUPLICATE KEY UPDATE identity_schema_version = GREATEST(identity_schema_version, VALUES(identity_schema_version))`,
        ],
        run: addUnifiedUserColumns,
    },
] as const;

export async function runWebMigrations(pool: Pool): Promise<void> {
    const connection = await pool.getConnection();
    let acquired = false;

    try {
        const [rows] = await connection.execute<LockRow[]>("SELECT GET_LOCK(?, 30) AS acquired", [MIGRATION_LOCK]);
        acquired = Number(rows[0]?.acquired) === 1;
        if (!acquired) throw new Error("Could not acquire the Web schema migration lock");

        await connection.query(`CREATE TABLE IF NOT EXISTS web_schema_migration (
            id VARCHAR(191) NOT NULL,
            applied_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
            PRIMARY KEY (id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);

        for (const migration of migrations) {
            const [applied] = await connection.execute<RowDataPacket[]>("SELECT id FROM web_schema_migration WHERE id = ? LIMIT 1", [migration.id]);
            if (applied[0]) continue;

            for (const statement of migration.statements) await connection.query(statement);
            if ("run" in migration) await migration.run(connection);
            await connection.execute("INSERT INTO web_schema_migration (id) VALUES (?)", [migration.id]);
        }
    } finally {
        if (acquired) await connection.execute("SELECT RELEASE_LOCK(?)", [MIGRATION_LOCK]).catch(() => undefined);
        connection.release();
    }
}

async function addUnifiedUserColumns(connection: PoolConnection): Promise<void> {
    await addColumnIfMissing(
        connection,
        "user",
        "accountStatus",
        "ALTER TABLE `user` ADD COLUMN accountStatus VARCHAR(32) NOT NULL DEFAULT 'legacy_incomplete'",
    );
    await addColumnIfMissing(connection, "user", "identityVersion", "ALTER TABLE `user` ADD COLUMN identityVersion INT NOT NULL DEFAULT 1");
    await addColumnIfMissing(
        connection,
        "user",
        "identityUpdatedAt",
        "ALTER TABLE `user` ADD COLUMN identityUpdatedAt TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3)",
    );
    await addColumnIfMissing(
        connection,
        "user",
        "contactEmailAvailable",
        "ALTER TABLE `user` ADD COLUMN contactEmailAvailable BOOLEAN NOT NULL DEFAULT FALSE",
    );
}

async function addColumnIfMissing(connection: PoolConnection, table: string, column: string, statement: string): Promise<void> {
    const [rows] = await connection.execute<CountRow[]>(
        `SELECT COUNT(*) AS count
           FROM information_schema.columns
          WHERE table_schema = DATABASE() AND table_name = ? AND column_name = ?`,
        [table, column],
    );
    if (Number(rows[0]?.count) === 0) await connection.query(statement);
}

export async function ensureProviderOwnershipConstraints(connection: PoolConnection): Promise<void> {
    await ensureUniqueIndex(
        connection,
        "account",
        "account_provider_account_unique",
        ["providerId", "accountId"],
        "ALTER TABLE account ADD UNIQUE KEY account_provider_account_unique (providerId, accountId)",
    );
    await ensureUniqueIndex(
        connection,
        "account",
        "account_user_provider_unique",
        ["userId", "providerId"],
        "ALTER TABLE account ADD UNIQUE KEY account_user_provider_unique (userId, providerId)",
    );
}

async function ensureUniqueIndex(
    connection: PoolConnection,
    table: string,
    index: string,
    columns: Array<string>,
    statement: string,
): Promise<void> {
    const [present] = await connection.execute<CountRow[]>(
        `SELECT COUNT(*) AS count FROM information_schema.statistics
          WHERE table_schema = DATABASE() AND table_name = ? AND index_name = ?`,
        [table, index],
    );
    if (Number(present[0]?.count) > 0) return;

    const escapedColumns = columns.map((column) => `\`${column}\``).join(", ");
    const [duplicates] = await connection.query<RowDataPacket[]>(
        `SELECT ${escapedColumns} FROM \`${table}\` GROUP BY ${escapedColumns} HAVING COUNT(*) > 1 LIMIT 1`,
    );
    if (duplicates[0]) throw new Error(`Cannot add ${index}: conflicting ownership must be resolved first`);
    await connection.query(statement);
}
