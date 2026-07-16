import { createPool, type Pool } from "mysql2/promise";

let pool: Pool | undefined;

export function getWebDatabase(): Pool {
    if (pool) return pool;
    const url = process.env.WEB_DATABASE_URL;
    if (!url) throw new Error("WEB_DATABASE_URL environment variable is required");

    pool = createPool({
        uri: url,
        connectionLimit: 10,
        enableKeepAlive: true,
        maxIdle: 10,
        idleTimeout: 60_000,
    });
    return pool;
}

export async function closeWebDatabase(): Promise<void> {
    const current = pool;
    pool = undefined;
    await current?.end();
}

