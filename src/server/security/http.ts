export function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === "object" && value !== null;
}

export function logSafeFailure(action: string, error: unknown): void {
    console.error(
        `Could not ${action}`,
        error instanceof Error ? { name: error.name, code: readErrorCode(error) } : { type: typeof error },
    );
}

function readErrorCode(error: Error): string | undefined {
    if (!("code" in error) || typeof error.code !== "string") return undefined;
    return error.code.slice(0, 80);
}
