export function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === "object" && value !== null;
}

export function logSafeFailure(action: string, error: unknown): void {
    console.error(
        `Could not ${action}`,
        error instanceof Error ? { name: error.name, code: readErrorCode(error) } : { type: typeof error },
    );
}

export function hasTrustedOrigin(request: Request, trustedOrigins: readonly string[]): boolean {
    const origin = request.headers.get("origin");
    if (!origin) return false;

    try {
        const requestOrigin = new URL(request.url).origin;
        return origin === requestOrigin || trustedOrigins.includes(origin);
    } catch {
        return false;
    }
}

function readErrorCode(error: Error): string | undefined {
    if (!("code" in error) || typeof error.code !== "string") return undefined;
    return error.code.slice(0, 80);
}
