import type { Pool } from "mysql2/promise";

export function readDisposableDatabaseUrl(key: string, productionUrl: string | undefined): string | null {
    const value = process.env[key];
    if (!value || value === productionUrl) return null;
    try {
        const databaseName = new URL(value).pathname.slice(1);
        return /(test|testing|ci|tmp|temporary)/i.test(databaseName) ? value : null;
    } catch {
        return null;
    }
}

/**
 * Creates only Better Auth's base tables in an explicitly disposable database.
 * Application migrations remain responsible for every Hanami-owned table.
 */
export async function prepareDisposableBetterAuthSchema(pool: Pool): Promise<void> {
    await pool.query(`CREATE TABLE IF NOT EXISTS user (
        id VARCHAR(36) NOT NULL,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) NOT NULL,
        emailVerified BOOLEAN NOT NULL DEFAULT FALSE,
        image TEXT NULL,
        createdAt DATETIME(3) NOT NULL,
        updatedAt DATETIME(3) NOT NULL,
        PRIMARY KEY (id),
        UNIQUE KEY user_email_unique (email)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);

    await pool.query(`CREATE TABLE IF NOT EXISTS session (
        id VARCHAR(36) NOT NULL,
        expiresAt DATETIME(3) NOT NULL,
        token VARCHAR(255) NOT NULL,
        createdAt DATETIME(3) NOT NULL,
        updatedAt DATETIME(3) NOT NULL,
        ipAddress TEXT NULL,
        userAgent TEXT NULL,
        userId VARCHAR(36) NOT NULL,
        PRIMARY KEY (id),
        UNIQUE KEY session_token_unique (token),
        KEY session_user_idx (userId),
        CONSTRAINT session_user_fk
            FOREIGN KEY (userId) REFERENCES user (id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);

    await pool.query(`CREATE TABLE IF NOT EXISTS account (
        id VARCHAR(36) NOT NULL,
        accountId VARCHAR(255) NOT NULL,
        providerId VARCHAR(255) NOT NULL,
        userId VARCHAR(36) NOT NULL,
        accessToken TEXT NULL,
        refreshToken TEXT NULL,
        idToken TEXT NULL,
        accessTokenExpiresAt DATETIME(3) NULL,
        refreshTokenExpiresAt DATETIME(3) NULL,
        scope TEXT NULL,
        password TEXT NULL,
        createdAt DATETIME(3) NOT NULL,
        updatedAt DATETIME(3) NOT NULL,
        PRIMARY KEY (id),
        KEY account_user_idx (userId),
        CONSTRAINT account_user_fk
            FOREIGN KEY (userId) REFERENCES user (id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);
    await pool.query("ALTER TABLE account MODIFY providerId VARCHAR(255) NOT NULL");

    await pool.query(`CREATE TABLE IF NOT EXISTS verification (
        id VARCHAR(36) NOT NULL,
        identifier VARCHAR(255) NOT NULL,
        value TEXT NOT NULL,
        expiresAt DATETIME(3) NOT NULL,
        createdAt DATETIME(3) NULL,
        updatedAt DATETIME(3) NULL,
        PRIMARY KEY (id),
        KEY verification_identifier_idx (identifier)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);
}
