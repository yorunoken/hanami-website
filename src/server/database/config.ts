export interface MariaDbConnectionConfig {
    host: string;
    port: number;
    user: string;
    password: string;
    database: string;
}

export type DatabaseRole = "web" | "bot" | "test";

export function parseMariaDbConnection(url: string, role: DatabaseRole): MariaDbConnectionConfig {
    const variableName = `${role.toUpperCase()}_DATABASE_URL`;
    let parsed: URL;

    try {
        parsed = new URL(url);
    } catch {
        throw new Error(`${variableName} must be a valid MySQL URL`);
    }

    if (parsed.protocol !== "mysql:") {
        throw new Error(`${variableName} must use the mysql:// protocol`);
    }

    const database = decodeConnectionPart(parsed.pathname.slice(1), variableName);
    if (!parsed.hostname) throw new Error(`${variableName} must include a database host`);
    if (!database) throw new Error(`${variableName} must include a database name`);

    return {
        host: normalizeHost(parsed.hostname),
        port: parsed.port ? Number(parsed.port) : 3306,
        user: decodeConnectionPart(parsed.username, variableName),
        password: decodeConnectionPart(parsed.password, variableName),
        database,
    };
}

export function assertSeparateDatabases(webUrl: string, botUrl: string): void {
    const web = parseMariaDbConnection(webUrl, "web");
    const bot = parseMariaDbConnection(botUrl, "bot");

    if (web.host === bot.host && web.port === bot.port && web.database === bot.database) {
        throw new Error("WEB_DATABASE_URL and BOT_DATABASE_URL must point to different databases");
    }
}

export function assertDisposableTestDatabase(
    testUrl: string | undefined,
    configuredDatabases: { webUrl?: string; botUrl?: string } = {},
): void {
    if (!testUrl) throw new Error("TEST_DATABASE_URL is required");

    const test = parseMariaDbConnection(testUrl, "test");
    if (!/(^|[-_])(test|testing|disposable)([-_]|$)/i.test(test.database)) {
        throw new Error("TEST_DATABASE_URL must use a database name explicitly marked test-only or disposable");
    }

    if (configuredDatabases.webUrl) assertSeparateDatabases(configuredDatabases.webUrl, testUrl);
    if (configuredDatabases.botUrl) assertSeparateDatabases(testUrl, configuredDatabases.botUrl);
}

function normalizeHost(hostname: string): string {
    const host = hostname.toLowerCase();
    return host.startsWith("[") && host.endsWith("]") ? host.slice(1, -1) : host;
}

function decodeConnectionPart(value: string, variableName: string): string {
    try {
        return decodeURIComponent(value);
    } catch {
        throw new Error(`${variableName} contains invalid URL encoding`);
    }
}
