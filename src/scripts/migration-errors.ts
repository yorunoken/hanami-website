export class PrismaMigrationCommandError extends Error {
    constructor(
        readonly exitCode: number,
        readonly output: string,
    ) {
        super(`Prisma Web migration command failed with exit code ${exitCode}`);
        this.name = "PrismaMigrationCommandError";
    }
}

const knownRefusalPrefixes = ["Refusing Web migration because", "TEST_DATABASE_URL must use"];

export function formatMigrationError(error: unknown, role: "Web" | "Bot" = "Web"): string {
    if (error instanceof PrismaMigrationCommandError) {
        if (isPrismaConnectionError(error.output)) return connectionErrorMessage(role);

        const output = sanitizeSecrets(error.output).trim();
        return `${error.message}${output ? `: ${output}` : ""}`;
    }

    const message = error instanceof Error ? error.message : String(error);
    if (knownRefusalPrefixes.some((prefix) => message.startsWith(prefix))) return sanitizeSecrets(message);
    if (message.startsWith("Prisma Web migration command failed with exit code")) return sanitizeSecrets(message);
    if (isPrismaConnectionError(message)) return connectionErrorMessage(role);
    return `${role} database migration failed.`;
}

function connectionErrorMessage(role: "Web" | "Bot"): string {
    return `${role} database migration failed because the ${role} database connection could not be established.`;
}

function isPrismaConnectionError(message: string): boolean {
    return /\bP(?:1000|1001|1010|1011)\b|PrismaClientInitializationError|can't reach database|authentication failed|connection refused/i.test(
        message,
    );
}

function sanitizeSecrets(message: string): string {
    return message.replace(/([a-z][a-z\d+.-]*:\/\/[^\s:@/]+):[^\s@/]+@/gi, "$1:***@");
}
