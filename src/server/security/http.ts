export function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === "object" && value !== null;
}

export function logSafeFailure(action: string, error: unknown): void {
    console.error(`Could not ${action}`, getSafeErrorDetails(error));
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

export interface SafeErrorDetails {
    name?: string;
    type?: string;
    status?: string | number;
    statusCode?: number;
    code?: string;
    message?: string;
}

export function getSafeErrorDetails(error: unknown): SafeErrorDetails {
    if (!isRecord(error)) return { type: typeof error };

    const body = isRecord(error.body) ? error.body : null;
    return compact({
        name: readText(error.name, 80),
        status: readStatus(error.status),
        statusCode: typeof error.statusCode === "number" ? error.statusCode : undefined,
        code: readText(body?.code, 80) ?? readText(error.code, 80),
        message: generalizeMessage(readText(body?.message, 200) ?? readText(error.message, 200)),
    });
}

function readText(value: unknown, maxLength: number): string | undefined {
    return typeof value === "string" && value.length > 0 ? value.slice(0, maxLength) : undefined;
}

function readStatus(value: unknown): string | number | undefined {
    if (typeof value === "number") return value;
    return readText(value, 40);
}

function generalizeMessage(value: string | undefined): string | undefined {
    if (!value) return undefined;
    if (/(token|cookie|secret|authorization code|code verifier|client secret)/i.test(value)) {
        return "Authentication provider operation failed.";
    }
    return value;
}

function compact(details: SafeErrorDetails): SafeErrorDetails {
    return Object.fromEntries(Object.entries(details).filter(([, value]) => value !== undefined)) as SafeErrorDetails;
}
