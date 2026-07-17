import { Elysia } from "elysia";

import { trustedOrigins, webDatabase } from "../auth";
import type { IdentityService } from "../identity";
import { serverIdentity } from "../identity";
import { logSafeFailure } from "../security/http";
import { MySqlCompanionStore, type CompanionStore } from "./store";

interface CompanionDeviceRouteDependencies {
    identity: IdentityService;
    store: CompanionStore;
    now(): Date;
    trustedOrigins: readonly string[];
}

const productionDependencies: CompanionDeviceRouteDependencies = {
    identity: serverIdentity,
    store: new MySqlCompanionStore(webDatabase),
    now: () => new Date(),
    trustedOrigins,
};

export function createCompanionDeviceRoutes(dependencies: CompanionDeviceRouteDependencies = productionDependencies) {
    return new Elysia({ prefix: "/companion/devices" })
        .get("/", async ({ request, set }) => {
            set.headers["Cache-Control"] = "no-store";
            const identity = await dependencies.identity.getCurrent(request.headers);
            if (!identity) return fail(set, 401, "Unauthorized");
            if (new URL(request.url).searchParams.size > 0) return fail(set, 400, "Invalid device request");

            try {
                const devices = await dependencies.store.listDevices(identity.userId);
                return {
                    devices: devices.map((device) => ({
                        id: device.id,
                        displayName: device.displayName,
                        platform: device.platform,
                        createdAt: device.createdAt.toISOString(),
                        lastUsedAt: device.lastUsedAt.toISOString(),
                        revoked: device.revokedAt !== null,
                    })),
                };
            } catch (error) {
                logSafeFailure("list Companion devices", error);
                return fail(set, 500, "Could not read Companion devices");
            }
        })
        .delete("/:deviceId", async ({ request, params, set }) => {
            set.headers["Cache-Control"] = "no-store";
            const identity = await dependencies.identity.getCurrent(request.headers);
            if (!identity) return fail(set, 401, "Unauthorized");
            if (new URL(request.url).searchParams.size > 0) return fail(set, 400, "Invalid device request");
            if (!hasValidOrigin(request, dependencies.trustedOrigins)) return fail(set, 403, "This action could not be verified");
            if (!isUuid(params.deviceId)) return fail(set, 404, "Device not found");

            try {
                const revoked = await dependencies.store.revokeDevice({
                    userId: identity.userId,
                    deviceId: params.deviceId,
                    now: dependencies.now(),
                });
                if (!revoked) return fail(set, 404, "Device not found");
                return { revoked: true };
            } catch (error) {
                logSafeFailure("revoke Companion device", error);
                return fail(set, 500, "Could not revoke Companion device");
            }
        });
}

function hasValidOrigin(request: Request, allowedOrigins: readonly string[]): boolean {
    const origin = request.headers.get("origin");
    if (!origin) return false;
    return origin === new URL(request.url).origin || allowedOrigins.includes(origin);
}

function isUuid(value: string): boolean {
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function fail(set: { status?: number | string }, status: number, error: string) {
    set.status = status;
    return { error };
}

export const companionDeviceRoutes = createCompanionDeviceRoutes();
