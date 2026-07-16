import type { BetterAuthPlugin } from "better-auth";
import { createAuthEndpoint, formCsrfMiddleware, getSessionFromCtx } from "better-auth/api";
import { setSessionCookie } from "better-auth/cookies";
import { z } from "zod";

import { getUnifiedAccountFlags, isSecureProduction } from "../config";
import { getWebDatabase } from "../database";
import { createSecureToken, hashToken, isSecureToken } from "../security/tokens";
import { HanamiAccountRepository } from "./account-repository";
import { OAuthTransactionStore } from "./oauth-transactions";
import { PendingRegistrationStore } from "./pending-store";
import { createProviderAuthorizationUrl, exchangeProviderCode, hasProviderConfiguration } from "./provider-oauth";
import type { IdentityProvider, OAuthIntent, PendingRegistration, ProviderProfileSnapshot } from "./types";

const startBodySchema = z.object({
    provider: z.enum(["discord", "osu"]),
    intent: z.enum(["login", "register", "complete"]),
    returnTo: z.string().max(512).optional(),
});

const callbackQuerySchema = z.object({
    code: z.string().min(1).max(4096).optional(),
    state: z.string().optional(),
    error: z.string().max(128).optional(),
});

const BINDING_COOKIE = "hanami_registration_binding";

export function hanamiAccountsPlugin(): BetterAuthPlugin {
    const pool = getWebDatabase();
    const pendingStore = new PendingRegistrationStore(pool);
    const transactionStore = new OAuthTransactionStore(pool);
    const accounts = new HanamiAccountRepository(pool);

    return {
        id: "hanami-unified-accounts",
        endpoints: {
            startHanamiOAuth: createAuthEndpoint(
                "/hanami/start",
                {
                    method: "POST",
                    body: startBodySchema,
                    requireHeaders: true,
                    use: [formCsrfMiddleware],
                },
                async (ctx) => {
                    ctx.setHeader("Cache-Control", "no-store");
                    const flags = getUnifiedAccountFlags();
                    if (!flags.unifiedAccounts) throw new Error("unified_accounts_disabled");
                    if (ctx.body.intent === "register" && !flags.dualProviderRegistration) {
                        throw new Error("dual_provider_registration_disabled");
                    }
                    if (!hasProviderConfiguration(ctx.body.provider)) throw new Error("provider_not_configured");

                    const binding = readBindingCookie(ctx.headers) || createSecureToken();
                    if (!readBindingCookie(ctx.headers)) ctx.setHeader("Set-Cookie", serializeBindingCookie(binding));
                    const bindingHash = await hashToken(binding);
                    const returnTo = validateReturnTo(ctx.body.returnTo, ctx.body.intent);

                    let pendingRegistrationId: string | null = null;
                    let userId: string | null = null;
                    let sessionId: string | null = null;
                    if (ctx.body.intent === "register") {
                        const pending = await pendingStore.getOrCreate(bindingHash);
                        pendingRegistrationId = pending.id;
                    } else if (ctx.body.intent === "complete") {
                        if (ctx.body.provider !== "osu") throw new Error("completion_requires_osu");
                        const current = await getSessionFromCtx(ctx);
                        if (!current) throw new Error("completion_session_required");
                        const identity = await accounts.getIdentityByUserId(current.user.id);
                        if (!identity || identity.status === "conflict") return { url: "/account?error=identity_conflict" };
                        if (identity.status === "active") return { url: "/account" };
                        if (identity.status !== "legacy_incomplete") throw new Error("completion_not_allowed");
                        userId = current.user.id;
                        sessionId = current.session.id;
                    }

                    const { state, transaction } = await transactionStore.create({
                        pendingRegistrationId,
                        browserBindingHash: bindingHash,
                        userId,
                        sessionId,
                        provider: ctx.body.provider,
                        intent: ctx.body.intent,
                        returnTo,
                    });
                    const url = await createProviderAuthorizationUrl(ctx.body.provider, state, transaction.codeVerifier);
                    return { url };
                },
            ),
            finishHanamiOAuth: createAuthEndpoint(
                "/hanami/callback/:providerId",
                { method: "GET", query: callbackQuerySchema, requireHeaders: true },
                async (ctx) => {
                    ctx.setHeader("Cache-Control", "no-store");
                    const provider = parseProvider(ctx.params?.providerId);
                    if (!provider || ctx.query.error || !ctx.query.code || !isSecureToken(ctx.query.state)) {
                        throw ctx.redirect("/login?error=oauth_callback_invalid");
                    }
                    const binding = readBindingCookie(ctx.headers);
                    if (!binding) throw ctx.redirect("/login?error=browser_binding_mismatch");
                    const bindingHash = await hashToken(binding);
                    const transaction = await transactionStore.consume(ctx.query.state, bindingHash, provider);
                    if (!transaction) throw ctx.redirect("/login?error=oauth_state_invalid");

                    let profile: ProviderProfileSnapshot;
                    try {
                        profile = await exchangeProviderCode(provider, ctx.query.code, transaction.codeVerifier);
                    } catch (error) {
                        ctx.context.logger.error("Provider callback verification failed", {
                            provider,
                            correlation: transaction.id,
                            code: error instanceof Error ? error.message : "provider_callback_failed",
                        });
                        throw ctx.redirect("/login?error=provider_verification_failed");
                    }

                    if (transaction.intent === "login") {
                        return handleLoginCallback(ctx, accounts, pendingStore, bindingHash, provider, profile, transaction.returnTo);
                    }
                    if (transaction.intent === "complete") {
                        return handleLegacyCompletion(ctx, accounts, transaction.userId, transaction.sessionId, profile, transaction.id);
                    }
                    if (!transaction.pendingRegistrationId) throw ctx.redirect("/register?error=registration_expired");
                    return handleRegistrationCallback(
                        ctx,
                        accounts,
                        pendingStore,
                        bindingHash,
                        transaction.pendingRegistrationId,
                        provider,
                        profile,
                    );
                },
            ),
        },
        rateLimit: [
            { pathMatcher: (path) => path === "/hanami/start", window: 60, max: 10 },
            { pathMatcher: (path) => path.startsWith("/hanami/callback/"), window: 60, max: 20 },
        ],
    } satisfies BetterAuthPlugin;
}

async function handleLoginCallback(
    ctx: AuthEndpointContext,
    accounts: HanamiAccountRepository,
    pendingStore: PendingRegistrationStore,
    bindingHash: string,
    provider: IdentityProvider,
    profile: ProviderProfileSnapshot,
    returnTo: string,
): Promise<never> {
    const owner = await accounts.findProviderOwner(provider, profile.accountId);
    if (!owner) {
        const pending = await pendingStore.getOrCreate(bindingHash);
        await pendingStore.attachVerifiedProvider(pending.id, bindingHash, provider, profile);
        throw ctx.redirect(`/register?verified=${provider}`);
    }
    if (owner.accountStatus === "conflict") throw ctx.redirect("/login?error=identity_conflict");
    await accounts.refreshProviderProfile(owner.userId, provider, profile);
    const destination = owner.accountStatus === "active" ? returnTo : "/account/complete";
    return issueFreshSession(ctx, owner.userId, destination);
}

async function handleRegistrationCallback(
    ctx: AuthEndpointContext,
    accounts: HanamiAccountRepository,
    pendingStore: PendingRegistrationStore,
    bindingHash: string,
    pendingId: string,
    provider: IdentityProvider,
    profile: ProviderProfileSnapshot,
): Promise<never> {
    const pending = await pendingStore.getById(pendingId);
    if (!pending || pending.browserBindingHash !== bindingHash || pending.status !== "pending_registration") {
        throw ctx.redirect("/register?error=registration_expired");
    }

    const owner = await accounts.findProviderOwner(provider, profile.accountId);
    const otherProvider: IdentityProvider = provider === "discord" ? "osu" : "discord";
    const otherId = provider === "discord" ? pending.osuAccountId : pending.discordAccountId;
    if (owner) {
        if (!otherId) {
            if (owner.accountStatus === "conflict") throw ctx.redirect("/register?error=identity_conflict");
            return issueFreshSession(ctx, owner.userId, owner.accountStatus === "active" ? "/account" : "/account/complete");
        }
        const otherOwner = await accounts.findProviderOwner(otherProvider, otherId);
        if (otherOwner?.userId === owner.userId && owner.accountStatus === "active") {
            return issueFreshSession(ctx, owner.userId, "/account");
        }
        await pendingStore.markConflict(pending.id, pending.correlationId);
        throw ctx.redirect("/register?error=identity_conflict");
    }

    const updated = await pendingStore.attachVerifiedProvider(pending.id, bindingHash, provider, profile);
    if (!isPendingComplete(updated)) throw ctx.redirect(`/register?verified=${provider}`);

    const result = await accounts.completeRegistration(updated.id, bindingHash);
    if (result.kind === "conflict") throw ctx.redirect("/register?error=identity_conflict");
    return issueFreshSession(ctx, result.userId, "/account");
}

async function handleLegacyCompletion(
    ctx: AuthEndpointContext,
    accounts: HanamiAccountRepository,
    userId: string | null,
    sessionId: string | null,
    profile: ProviderProfileSnapshot,
    correlationId: string,
): Promise<never> {
    if (!userId || !sessionId) throw ctx.redirect("/account/complete?error=completion_session_invalid");
    const owner = await accounts.findProviderOwner("osu", profile.accountId);
    if (owner && owner.userId !== userId) throw ctx.redirect("/account/complete?error=identity_conflict");
    const result = await accounts.completeLegacyAccount(userId, sessionId, profile, correlationId);
    if (result.kind === "conflict") throw ctx.redirect("/account/complete?error=identity_conflict");
    return issueFreshSession(ctx, userId, "/account", true);
}

async function issueFreshSession(ctx: AuthEndpointContext, userId: string, destination: string, revokeExisting = false): Promise<never> {
    const current = revokeExisting ? await getSessionFromCtx(ctx) : null;
    if (current) await ctx.context.internalAdapter.deleteSession(current.session.token);
    const user = await ctx.context.internalAdapter.findUserById(userId);
    if (!user) throw new Error("account_user_missing");
    const session = await ctx.context.internalAdapter.createSession(userId);
    await setSessionCookie(ctx, { session, user });
    throw ctx.redirect(destination);
}

function isPendingComplete(pending: PendingRegistration): boolean {
    return Boolean(pending.discordAccountId && pending.osuAccountId && pending.discordProfile && pending.osuProfile);
}

function parseProvider(value: string | undefined): IdentityProvider | null {
    return value === "discord" || value === "osu" ? value : null;
}

function validateReturnTo(value: string | undefined, intent: OAuthIntent): string {
    const fallback = intent === "complete" ? "/account/complete" : "/account";
    if (!value || !value.startsWith("/") || value.startsWith("//") || value.includes("\\")) return fallback;
    let url: URL;
    try {
        url = new URL(value, "https://accounts.hanami.invalid");
    } catch {
        return fallback;
    }
    const allowedPaths = new Set(["/", "/account", "/account/complete", "/login", "/register", "/api/auth/oauth2/authorize"]);
    return allowedPaths.has(url.pathname) ? `${url.pathname}${url.search}` : fallback;
}

function readBindingCookie(headers: Headers): string | null {
    const cookie = headers.get("cookie");
    if (!cookie) return null;
    for (const part of cookie.split(";")) {
        const [name, ...valueParts] = part.trim().split("=");
        if (name === BINDING_COOKIE) {
            const value = valueParts.join("=");
            return isSecureToken(value) ? value : null;
        }
    }
    return null;
}

function serializeBindingCookie(value: string): string {
    const secure = isSecureProduction() ? "; Secure" : "";
    return `${BINDING_COOKIE}=${value}; Path=/; HttpOnly; SameSite=Lax; Max-Age=1200${secure}`;
}

type AuthEndpointContext = Parameters<Parameters<typeof createAuthEndpoint>[2]>[0];

