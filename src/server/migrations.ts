import type { Pool, RowDataPacket } from "mysql2/promise";

const migrationLockName = "hanami-web-schema-migrations";

interface MigrationLockRow extends RowDataPacket {
    acquired: number | string | null;
}

interface AppliedMigrationRow extends RowDataPacket {
    id: string;
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
            await connection.execute("INSERT INTO webSchemaMigration (id) VALUES (?)", [migration.id]);
        }
    } finally {
        if (lockAcquired) await connection.execute("SELECT RELEASE_LOCK(?)", [migrationLockName]).catch(() => undefined);
        connection.release();
    }
}
