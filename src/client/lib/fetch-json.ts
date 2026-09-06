import { isRecord } from "@/lib/record";

class ApiError extends Error {
    constructor(
        message: string,
        public readonly status: number,
    ) {
        super(message);
        this.name = "ApiError";
    }
}

export async function fetchJson<T>(url: string, signal?: AbortSignal, init?: RequestInit): Promise<T> {
    const response = await fetch(url, { ...init, signal });
    const data: unknown = await response.json().catch(() => null);
    const error = isRecord(data) && typeof data.error === "string" ? data.error : null;
    if (!response.ok || error) throw new ApiError(error || `Request failed with status ${response.status}`, response.status);
    return data as T;
}
