import { describe, expect, it } from "bun:test";

import type { HanamiIdentity, IdentityService } from "../identity";
import { hashToken } from "../security/tokens";
import { createCompanionDeviceRoutes } from "./device-routes";
import { COMPANION_CLIENT_ID, type CompanionAuthorizationInput } from "./protocol";
import { createCompanionOAuthRoutes } from "./routes";
import { createPkceChallenge } from "./security";
import type { AuthorizationRequestRecord, CompanionDeviceMetadata, CompanionStore, NewTokenSet } from "./store";

const now = new Date("2026-07-16T12:00:00.000Z");
const verifier = "a".repeat(43);
const redirectUri = "http://127.0.0.1:43127/callback";
const clientState = "companion-state-1234567890";

describe("Companion authorization code flow", () => {
    it("requires a Hanami web session before showing approval", async () => {
        const store = new MemoryCompanionStore();
        const app = createCompanionOAuthRoutes({
            identity: new StubIdentity(null),
            store,
            now: () => now,
            trustedOrigins: [],
        });

        const response = await app.handle(new Request(await authorizationUrl()));
        expect(response.status).toBe(302);
        expect(response.headers.get("location")).toStartWith("/login?returnTo=");
        expect(store.requests).toHaveLength(0);
    });

    it("requires explicit approval and exchanges a code with S256 PKCE", async () => {
        const context = await makeOAuthApp();
        const approval = await startAuthorization(context.app);

        expect(approval.response.status).toBe(200);
        expect(approval.html).toContain("Connect Hanami Companion?");
        expect(context.store.codes).toHaveLength(0);

        const approved = await submitApproval(context.app, approval.html, "approve");
        expect(approved.status).toBe(302);
        const redirect = new URL(approved.headers.get("location")!);
        expect(redirect.origin + redirect.pathname).toBe(redirectUri);
        expect(redirect.searchParams.get("state")).toBe(clientState);
        const code = redirect.searchParams.get("code")!;
        expect(code).toHaveLength(43);
        expect(context.store.codes[0]?.codeHash).toBe(await hashToken(code));

        const tokenResponse = await exchangeCode(context.app, code, verifier, redirectUri);
        expect(tokenResponse.status).toBe(200);
        const tokens = (await tokenResponse.json()) as Record<string, unknown>;
        expect(tokens.token_type).toBe("Bearer");
        expect(tokens.expires_in).toBe(900);
        expect(typeof tokens.access_token).toBe("string");
        expect(typeof tokens.refresh_token).toBe("string");
        expect(JSON.stringify(context.store.codes)).not.toContain(code);
    });

    it("rejects an incorrect verifier without consuming the code", async () => {
        const context = await makeOAuthApp();
        const approval = await startAuthorization(context.app);
        const approved = await submitApproval(context.app, approval.html, "approve");
        const code = new URL(approved.headers.get("location")!).searchParams.get("code")!;

        const rejected = await exchangeCode(context.app, code, "b".repeat(43), redirectUri);
        expect(rejected.status).toBe(400);
        expect(await rejected.json()).toMatchObject({ error: "invalid_grant" });

        const accepted = await exchangeCode(context.app, code, verifier, redirectUri);
        expect(accepted.status).toBe(200);
    });

    it("rejects a reused authorization code and a different redirect URI", async () => {
        const context = await makeOAuthApp();
        const approval = await startAuthorization(context.app);
        const approved = await submitApproval(context.app, approval.html, "approve");
        const code = new URL(approved.headers.get("location")!).searchParams.get("code")!;

        const wrongRedirect = await exchangeCode(context.app, code, verifier, "http://127.0.0.1:43128/callback");
        expect(wrongRedirect.status).toBe(400);
        expect(await wrongRedirect.json()).toMatchObject({ error: "invalid_grant" });

        expect((await exchangeCode(context.app, code, verifier, redirectUri)).status).toBe(200);
        const replay = await exchangeCode(context.app, code, verifier, redirectUri);
        expect(replay.status).toBe(400);
        expect(await replay.json()).toMatchObject({ error: "invalid_grant" });
    });

    it("rotates refresh tokens and revokes the family when an old token is reused", async () => {
        const context = await makeOAuthApp();
        const firstTokens = await authorizeAndExchange(context.app);
        const firstRefresh = firstTokens.refresh_token as string;

        const rotation = await refresh(context.app, firstRefresh);
        expect(rotation.status).toBe(200);
        const secondTokens = (await rotation.json()) as Record<string, unknown>;
        expect(secondTokens.refresh_token).not.toBe(firstRefresh);

        const replay = await refresh(context.app, firstRefresh);
        expect(replay.status).toBe(400);
        expect(await replay.json()).toMatchObject({ error: "invalid_grant" });

        const revokedSuccessor = await refresh(context.app, secondTokens.refresh_token as string);
        expect(revokedSuccessor.status).toBe(400);
        expect(context.store.families[0]?.revoked).toBe(true);
    });

    it("redirects cancellation without issuing a code", async () => {
        const context = await makeOAuthApp();
        const approval = await startAuthorization(context.app);
        const cancelled = await submitApproval(context.app, approval.html, "cancel");

        expect(cancelled.status).toBe(302);
        const redirect = new URL(cancelled.headers.get("location")!);
        expect(redirect.searchParams.get("error")).toBe("access_denied");
        expect(redirect.searchParams.get("state")).toBe(clientState);
        expect(context.store.codes).toHaveLength(0);
    });

    it("requires a trusted-origin approval action and the request-bound CSRF token", async () => {
        const context = await makeOAuthApp();
        const approval = await startAuthorization(context.app);
        const requestId = readHiddenValue(approval.html, "request_id");
        const csrfToken = readHiddenValue(approval.html, "csrf_token");

        const missingOrigin = await context.app.handle(
            new Request("http://localhost/oauth/authorize", {
                method: "POST",
                headers: { "Content-Type": "application/x-www-form-urlencoded" },
                body: new URLSearchParams({ request_id: requestId, csrf_token: csrfToken, decision: "approve" }),
            }),
        );
        expect(missingOrigin.status).toBe(403);

        const wrongToken = await context.app.handle(
            new Request("http://localhost/oauth/authorize", {
                method: "POST",
                headers: { "Content-Type": "application/x-www-form-urlencoded", Origin: "http://localhost" },
                body: new URLSearchParams({ request_id: requestId, csrf_token: "z".repeat(43), decision: "approve" }),
            }),
        );
        expect(wrongToken.status).toBe(400);
        expect(context.store.codes).toHaveLength(0);
    });

    it("revokes a device family by access token without revealing token existence", async () => {
        const context = await makeOAuthApp();
        const tokens = await authorizeAndExchange(context.app);
        const accessToken = tokens.access_token as string;
        const refreshToken = tokens.refresh_token as string;

        for (const token of [accessToken, accessToken, "unknown-token"]) {
            const response = await sendForm(context.app, "/oauth/revoke", {
                client_id: COMPANION_CLIENT_ID,
                token,
            });
            expect(response.status).toBe(200);
        }
        expect((await refresh(context.app, refreshToken)).status).toBe(400);
    });

    it("rejects unsafe loopback redirect variants", async () => {
        const context = await makeOAuthApp();
        const invalidRedirects = [
            "http://localhost:43127/callback",
            "http://127.0.0.1:43127/other",
            "https://127.0.0.1:43127/callback",
            "http://127.0.0.1:43127/callback#fragment",
            "http://user@127.0.0.1:43127/callback",
            "http://127.0.0.1/callback",
            "http://127.0.0.1:99999/callback",
            "http://127.0.0.1:43127/callback?next=https://example.com",
        ];

        for (const candidate of invalidRedirects) {
            const response = await context.app.handle(new Request(await authorizationUrl(candidate)));
            expect(response.status).toBe(400);
            expect(await response.json()).toMatchObject({ error: "invalid_request" });
        }

        const plainPkceUrl = new URL(await authorizationUrl());
        plainPkceUrl.searchParams.set("code_challenge_method", "plain");
        const plainPkceResponse = await context.app.handle(new Request(plainPkceUrl));
        expect(plainPkceResponse.status).toBe(400);
    });
});

describe("Companion device API", () => {
    it("lists safe metadata and revokes the signed-in user's device", async () => {
        const store = new MemoryCompanionStore();
        store.devices.push({
            id: "11111111-1111-4111-8111-111111111111",
            userId: "user-1",
            displayName: "Desktop",
            platform: "linux",
            createdAt: now,
            lastUsedAt: now,
            revokedAt: null,
        });
        const app = createCompanionDeviceRoutes({
            identity: new StubIdentity({ userId: "user-1", sessionId: "session-1" }),
            store,
            now: () => now,
            trustedOrigins: [],
        });

        const listed = await app.handle(new Request("http://localhost/companion/devices"));
        expect(await listed.json()).toEqual({
            devices: [
                {
                    id: "11111111-1111-4111-8111-111111111111",
                    displayName: "Desktop",
                    platform: "linux",
                    createdAt: now.toISOString(),
                    lastUsedAt: now.toISOString(),
                    revoked: false,
                },
            ],
        });

        const revoked = await app.handle(
            new Request("http://localhost/companion/devices/11111111-1111-4111-8111-111111111111", {
                method: "DELETE",
                headers: { Origin: "http://localhost" },
            }),
        );
        expect(revoked.status).toBe(200);
        expect(store.devices[0]?.revokedAt).toEqual(now);
    });

    it("does not allow cross-user device access", async () => {
        const store = new MemoryCompanionStore();
        store.devices.push({
            id: "22222222-2222-4222-8222-222222222222",
            userId: "user-2",
            displayName: "Someone else's device",
            platform: "windows",
            createdAt: now,
            lastUsedAt: now,
            revokedAt: null,
        });
        const app = createCompanionDeviceRoutes({
            identity: new StubIdentity({ userId: "user-1", sessionId: "session-1" }),
            store,
            now: () => now,
            trustedOrigins: [],
        });

        const listed = await app.handle(new Request("http://localhost/companion/devices"));
        expect(await listed.json()).toEqual({ devices: [] });
        const revoked = await app.handle(
            new Request("http://localhost/companion/devices/22222222-2222-4222-8222-222222222222", {
                method: "DELETE",
                headers: { Origin: "http://localhost" },
            }),
        );
        expect(revoked.status).toBe(404);
        expect(store.devices[0]?.revokedAt).toBeNull();
    });
});

async function makeOAuthApp() {
    const store = new MemoryCompanionStore();
    const app = createCompanionOAuthRoutes({
        identity: new StubIdentity({ userId: "user-1", sessionId: "session-1" }),
        store,
        now: () => now,
        trustedOrigins: [],
    });
    return { app, store };
}

async function authorizationUrl(uri = redirectUri): Promise<string> {
    const url = new URL("http://localhost/oauth/authorize");
    url.searchParams.set("response_type", "code");
    url.searchParams.set("client_id", COMPANION_CLIENT_ID);
    url.searchParams.set("redirect_uri", uri);
    url.searchParams.set("state", clientState);
    url.searchParams.set("code_challenge", await createPkceChallenge(verifier));
    url.searchParams.set("code_challenge_method", "S256");
    url.searchParams.set("device_name", "Yoru's desktop");
    url.searchParams.set("platform", "linux");
    return url.toString();
}

async function startAuthorization(app: ReturnType<typeof createCompanionOAuthRoutes>) {
    const response = await app.handle(new Request(await authorizationUrl()));
    return { response, html: await response.text() };
}

function submitApproval(app: ReturnType<typeof createCompanionOAuthRoutes>, html: string, decision: "approve" | "cancel") {
    const requestId = readHiddenValue(html, "request_id");
    const csrfToken = readHiddenValue(html, "csrf_token");
    return app.handle(
        new Request("http://localhost/oauth/authorize", {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded", Origin: "http://localhost" },
            body: new URLSearchParams({ request_id: requestId, csrf_token: csrfToken, decision }),
        }),
    );
}

function exchangeCode(app: ReturnType<typeof createCompanionOAuthRoutes>, code: string, codeVerifier: string, exactRedirectUri: string) {
    return sendForm(app, "/oauth/token", {
        grant_type: "authorization_code",
        client_id: COMPANION_CLIENT_ID,
        code,
        redirect_uri: exactRedirectUri,
        code_verifier: codeVerifier,
    });
}

function refresh(app: ReturnType<typeof createCompanionOAuthRoutes>, refreshToken: string) {
    return sendForm(app, "/oauth/token", {
        grant_type: "refresh_token",
        client_id: COMPANION_CLIENT_ID,
        refresh_token: refreshToken,
    });
}

async function authorizeAndExchange(app: ReturnType<typeof createCompanionOAuthRoutes>) {
    const approval = await startAuthorization(app);
    const approved = await submitApproval(app, approval.html, "approve");
    const code = new URL(approved.headers.get("location")!).searchParams.get("code")!;
    const response = await exchangeCode(app, code, verifier, redirectUri);
    return (await response.json()) as Record<string, unknown>;
}

function sendForm(app: ReturnType<typeof createCompanionOAuthRoutes>, path: string, fields: Record<string, string>) {
    return app.handle(
        new Request(`http://localhost${path}`, {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: new URLSearchParams(fields),
        }),
    );
}

function readHiddenValue(html: string, name: string): string {
    const match = new RegExp(`name="${name}" value="([^"]+)"`).exec(html);
    if (!match?.[1]) throw new Error(`Missing ${name}`);
    return match[1];
}

class StubIdentity implements IdentityService {
    constructor(private readonly identity: HanamiIdentity | null) {}
    async getCurrent(): Promise<HanamiIdentity | null> {
        return this.identity;
    }
    async resolveDiscordId(): Promise<string | null> {
        return null;
    }
}

interface MemoryAuthorizationRequest extends AuthorizationRequestRecord {
    csrfTokenHash: string;
    expiresAt: Date;
    consumedAt: Date | null;
}

interface MemoryAuthorizationCode extends AuthorizationRequestRecord {
    codeHash: string;
    expiresAt: Date;
    usedAt: Date | null;
}

interface MemoryDevice extends CompanionDeviceMetadata {
    userId: string;
}

interface MemoryFamily {
    id: string;
    deviceId: string;
    userId: string;
    clientId: string;
    revoked: boolean;
}

interface MemoryRefreshToken {
    tokenHash: string;
    familyId: string;
    expiresAt: Date;
    used: boolean;
    revoked: boolean;
}

class MemoryCompanionStore implements CompanionStore {
    readonly requests: MemoryAuthorizationRequest[] = [];
    readonly codes: MemoryAuthorizationCode[] = [];
    readonly devices: MemoryDevice[] = [];
    readonly families: MemoryFamily[] = [];
    readonly refreshTokens: MemoryRefreshToken[] = [];
    readonly accessTokens: Array<{ tokenHash: string; familyId: string; revoked: boolean }> = [];

    async createAuthorizationRequest(
        input: CompanionAuthorizationInput & {
            id: string;
            userId: string;
            sessionId: string;
            csrfTokenHash: string;
            expiresAt: Date;
        },
    ): Promise<void> {
        this.requests.push({ ...input, consumedAt: null });
    }

    async consumeAuthorizationRequest(input: {
        id: string;
        userId: string;
        sessionId: string;
        csrfTokenHash: string;
        now: Date;
    }): Promise<AuthorizationRequestRecord | null> {
        const request = this.requests.find((candidate) => candidate.id === input.id);
        if (
            !request ||
            request.userId !== input.userId ||
            request.sessionId !== input.sessionId ||
            request.csrfTokenHash !== input.csrfTokenHash ||
            request.consumedAt ||
            request.expiresAt <= input.now
        ) {
            return null;
        }
        request.consumedAt = input.now;
        return request;
    }

    async createAuthorizationCode(input: AuthorizationRequestRecord & { codeHash: string; expiresAt: Date }): Promise<void> {
        this.codes.push({ ...input, usedAt: null });
    }

    async redeemAuthorizationCode(input: {
        codeHash: string;
        clientId: string;
        redirectUri: string;
        codeChallenge: string;
        deviceId: string;
        familyId: string;
        tokens: NewTokenSet;
        now: Date;
    }): Promise<boolean> {
        const code = this.codes.find((candidate) => candidate.codeHash === input.codeHash);
        if (
            !code ||
            code.usedAt ||
            code.expiresAt <= input.now ||
            code.clientId !== input.clientId ||
            code.redirectUri !== input.redirectUri ||
            code.codeChallenge !== input.codeChallenge
        ) {
            return false;
        }
        code.usedAt = input.now;
        this.devices.push({
            id: input.deviceId,
            userId: code.userId,
            displayName: code.deviceName,
            platform: code.platform,
            createdAt: input.now,
            lastUsedAt: input.now,
            revokedAt: null,
        });
        this.families.push({
            id: input.familyId,
            deviceId: input.deviceId,
            userId: code.userId,
            clientId: code.clientId,
            revoked: false,
        });
        this.recordTokens(input.familyId, input.tokens);
        return true;
    }

    async rotateRefreshToken(input: {
        refreshTokenHash: string;
        clientId: string;
        tokens: NewTokenSet;
        now: Date;
    }): Promise<"rotated" | "invalid" | "reuse_detected"> {
        const token = this.refreshTokens.find((candidate) => candidate.tokenHash === input.refreshTokenHash);
        if (!token) return "invalid";
        const family = this.families.find((candidate) => candidate.id === token.familyId);
        if (!family || family.clientId !== input.clientId || family.revoked || token.revoked || token.expiresAt <= input.now)
            return "invalid";
        if (token.used) {
            this.revokeFamily(family.id);
            return "reuse_detected";
        }
        token.used = true;
        this.recordTokens(family.id, input.tokens);
        const device = this.devices.find((candidate) => candidate.id === family.deviceId);
        if (device) device.lastUsedAt = input.now;
        return "rotated";
    }

    async revokeByTokenHash(input: { tokenHash: string; clientId: string }): Promise<void> {
        const token =
            this.refreshTokens.find((candidate) => candidate.tokenHash === input.tokenHash) ??
            this.accessTokens.find((candidate) => candidate.tokenHash === input.tokenHash);
        if (!token) return;
        const family = this.families.find((candidate) => candidate.id === token.familyId && candidate.clientId === input.clientId);
        if (family) this.revokeFamily(family.id);
    }

    async listDevices(userId: string): Promise<CompanionDeviceMetadata[]> {
        return this.devices.filter((device) => device.userId === userId);
    }

    async revokeDevice(input: { userId: string; deviceId: string; now: Date }): Promise<boolean> {
        const device = this.devices.find((candidate) => candidate.id === input.deviceId && candidate.userId === input.userId);
        if (!device) return false;
        device.revokedAt ??= input.now;
        for (const family of this.families.filter((candidate) => candidate.deviceId === device.id)) this.revokeFamily(family.id);
        return true;
    }

    private recordTokens(familyId: string, tokens: NewTokenSet): void {
        this.accessTokens.push({ tokenHash: tokens.accessTokenHash, familyId, revoked: false });
        this.refreshTokens.push({
            tokenHash: tokens.refreshTokenHash,
            familyId,
            expiresAt: tokens.refreshTokenExpiresAt,
            used: false,
            revoked: false,
        });
    }

    private revokeFamily(familyId: string): void {
        const family = this.families.find((candidate) => candidate.id === familyId);
        if (!family) return;
        family.revoked = true;
        const device = this.devices.find((candidate) => candidate.id === family.deviceId);
        if (device) device.revokedAt ??= now;
        for (const token of this.refreshTokens.filter((candidate) => candidate.familyId === familyId)) token.revoked = true;
        for (const token of this.accessTokens.filter((candidate) => candidate.familyId === familyId)) token.revoked = true;
    }
}
