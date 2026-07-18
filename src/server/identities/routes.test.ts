import { afterEach, describe, expect, it, mock, spyOn } from "bun:test";
import { APIError } from "better-auth/api";

import { auth } from "../auth";
import { serverIdentity } from "../identity";
import { botIdentityCompatibility, userIdentities } from "./runtime";
import { identityRoutes } from "./routes";
import type { UserAuthenticationIdentity } from "./model";

const now = new Date();
const discordIdentity = makeIdentity("discord", "123456789012345678");
const osuIdentity = makeIdentity("osu", "24680");

afterEach(() => {
    mock.restore();
});

describe("canonical identity API", () => {
    it("returns token-free provider identity data", async () => {
        mockCurrent();
        spyOn(userIdentities, "getUserAuthenticationIdentities").mockResolvedValue([discordIdentity, osuIdentity]);
        spyOn(botIdentityCompatibility, "flushPendingForUser").mockResolvedValue({ pending: false });
        spyOn(botIdentityCompatibility, "hasPendingForUser").mockResolvedValue(false);

        const response = await identityRoutes.handle(new Request("http://localhost/identities"));
        expect(response.status).toBe(200);
        const result = (await response.json()) as {
            userId: string;
            identities: Array<{ provider: string; providerUserId: string }>;
        };
        expect(result).toMatchObject({
            userId: "user-1",
            identities: [
                { provider: "discord", providerUserId: "123456789012345678" },
                { provider: "osu", providerUserId: "24680" },
            ],
        });
        const body = JSON.stringify(result);
        expect(body).not.toContain("accessToken");
        expect(body).not.toContain("refreshToken");
        expect(body).not.toContain("clientSecret");
    });

    it("starts explicit Discord and osu! linking through Better Auth", async () => {
        mockCurrent();
        spyOn(userIdentities, "getUserAuthenticationIdentities").mockResolvedValue([]);
        const discordLink = spyOn(auth.api, "linkSocialAccount").mockResolvedValue({
            headers: new Headers({
                "Set-Cookie": "better-auth.state=discord-state; Path=/; HttpOnly; SameSite=Lax",
            }),
            response: {
                url: "https://discord.com/oauth2/authorize?state=redacted",
                redirect: false,
            },
        } as never);
        const osuLink = spyOn(auth.api, "oAuth2LinkAccount").mockResolvedValue({
            headers: new Headers({
                "Set-Cookie": "better-auth.oauth2_state=osu-state; Path=/; HttpOnly; SameSite=Lax",
            }),
            response: {
                url: "https://osu.ppy.sh/oauth/authorize?state=redacted&code_challenge=redacted",
                redirect: true,
            },
        } as never);

        const discordResponse = await postLink("discord");
        const osuResponse = await postLink("osu");
        expect(discordResponse.status).toBe(200);
        expect(osuResponse.status).toBe(200);
        expect(discordLink).toHaveBeenCalledTimes(1);
        expect(osuLink).toHaveBeenCalledTimes(1);
        expect(discordLink).toHaveBeenCalledWith(expect.objectContaining({ returnHeaders: true }));
        expect(osuLink).toHaveBeenCalledWith(expect.objectContaining({ returnHeaders: true }));
        expect(discordResponse.headers.get("set-cookie")).toContain("discord-state");
        expect(osuResponse.headers.get("set-cookie")).toContain("osu-state");
    });

    it("treats a repeated link as idempotent", async () => {
        mockCurrent();
        spyOn(userIdentities, "getUserAuthenticationIdentities").mockResolvedValue([discordIdentity]);
        const link = spyOn(auth.api, "linkSocialAccount");

        const response = await postLink("discord");
        expect(response.status).toBe(200);
        expect(await response.json()).toMatchObject({ alreadyLinked: true, url: null });
        expect(link).not.toHaveBeenCalled();
    });

    it("requires trusted origin and a fresh session for linking", async () => {
        mockCurrent();
        spyOn(userIdentities, "getUserAuthenticationIdentities").mockResolvedValue([]);

        const missingOrigin = await identityRoutes.handle(new Request("http://localhost/identities/link/osu", { method: "POST" }));
        expect(missingOrigin.status).toBe(403);

        spyOn(serverIdentity, "getCurrent").mockResolvedValue({
            userId: "user-1",
            sessionId: "session-1",
            sessionCreatedAt: new Date(Date.now() - 16 * 60_000),
        });
        const stale = await postLink("osu");
        expect(stale.status).toBe(403);
    });

    it("prevents unlinking the final sign-in method", async () => {
        mockCurrent();
        spyOn(userIdentities, "getUserProviderAccounts").mockResolvedValue([
            {
                id: "osu-account",
                userId: "user-1",
                provider: "osu",
                providerUserId: "24680",
                createdAt: now,
                updatedAt: now,
            },
        ]);
        spyOn(userIdentities, "getUserAuthenticationIdentities").mockResolvedValue([osuIdentity]);
        spyOn(userIdentities, "getUserAuthenticationAccountCount").mockResolvedValue(1);
        const unlink = spyOn(auth.api, "unlinkAccount");

        const response = await identityRoutes.handle(
            new Request("http://localhost/identities/osu", {
                method: "DELETE",
                headers: { Origin: "http://localhost" },
            }),
        );
        expect(response.status).toBe(409);
        expect(unlink).not.toHaveBeenCalled();
    });

    it("passes the exact Better Auth account subject and returns successful unlinking", async () => {
        mockCurrent();
        const discordAccount = makeAccount("discord", "123456789012345678");
        const osuAccount = makeAccount("osu", "24680");
        spyOn(userIdentities, "getUserProviderAccounts")
            .mockResolvedValueOnce([discordAccount, osuAccount])
            .mockResolvedValueOnce([osuAccount]);
        spyOn(userIdentities, "getUserAuthenticationIdentities").mockResolvedValue([discordIdentity, osuIdentity]);
        spyOn(userIdentities, "getUserAuthenticationAccountCount").mockResolvedValue(2);
        spyOn(userIdentities, "getUserIdentities").mockResolvedValue([osuIdentity]);
        spyOn(botIdentityCompatibility, "flushPendingForUser").mockResolvedValue({ pending: false });
        spyOn(botIdentityCompatibility, "hasPendingForUser").mockResolvedValue(false);
        const unlink = spyOn(auth.api, "unlinkAccount").mockResolvedValue({ status: true });

        const response = await identityRoutes.handle(
            new Request("http://localhost/identities/discord", {
                method: "DELETE",
                headers: { Origin: "http://localhost" },
            }),
        );

        expect(response.status).toBe(200);
        expect(await response.json()).toMatchObject({ unlinked: true, alreadyUnlinked: false });
        expect(unlink).toHaveBeenCalledWith({
            headers: expect.any(Headers),
            body: { providerId: "discord", accountId: "123456789012345678" },
        });
    });

    it("translates Better Auth account-not-found errors without returning a generic gateway failure", async () => {
        mockCurrent();
        spyOn(userIdentities, "getUserProviderAccounts").mockResolvedValue([
            makeAccount("discord", "123456789012345678"),
            makeAccount("osu", "24680"),
        ]);
        spyOn(userIdentities, "getUserAuthenticationIdentities").mockResolvedValue([discordIdentity, osuIdentity]);
        spyOn(userIdentities, "getUserAuthenticationAccountCount").mockResolvedValue(2);
        spyOn(auth.api, "unlinkAccount").mockRejectedValue(
            new APIError("BAD_REQUEST", { code: "ACCOUNT_NOT_FOUND", message: "Account not found" }),
        );

        const response = await identityRoutes.handle(
            new Request("http://localhost/identities/discord", {
                method: "DELETE",
                headers: { Origin: "http://localhost" },
            }),
        );

        expect(response.status).toBe(409);
        expect(await response.json()).toEqual({ error: "Discord account was not found. Refresh the profile and try again." });
    });
});

function mockCurrent(): void {
    spyOn(serverIdentity, "getCurrent").mockResolvedValue({
        userId: "user-1",
        sessionId: "session-1",
        sessionCreatedAt: now,
    });
}

function postLink(provider: "discord" | "osu"): Promise<Response> {
    return identityRoutes.handle(
        new Request(`http://localhost/identities/link/${provider}`, {
            method: "POST",
            headers: { Origin: "http://localhost" },
        }),
    );
}

function makeIdentity(provider: "discord" | "osu", providerUserId: string): UserAuthenticationIdentity {
    return {
        id: `${provider}-identity`,
        userId: "user-1",
        provider,
        providerUserId,
        username: "yoru",
        displayName: "Yoru",
        avatarUrl: `https://example.test/${provider}.png`,
        metadata: null,
        linkedAt: now,
        updatedAt: now,
        canAuthenticate: true,
        status: "linked",
    };
}

function makeAccount(provider: "discord" | "osu", providerUserId: string) {
    return {
        id: `${provider}-account`,
        userId: "user-1",
        provider,
        providerUserId,
        createdAt: now,
        updatedAt: now,
    };
}
