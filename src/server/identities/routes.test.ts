import { afterEach, describe, expect, it, mock, spyOn } from "bun:test";

import { auth } from "../auth";
import { serverIdentity } from "../identity";
import { botIdentityCompatibility, userIdentities } from "./runtime";
import { identityRoutes } from "./routes";
import type { UserIdentity } from "./model";

const now = new Date();
const discordIdentity = makeIdentity("discord", "123456789012345678");
const osuIdentity = makeIdentity("osu", "24680");

afterEach(() => {
    mock.restore();
});

describe("canonical identity API", () => {
    it("returns token-free provider identity data", async () => {
        mockCurrent();
        spyOn(userIdentities, "getUserIdentities").mockResolvedValue([discordIdentity, osuIdentity]);
        spyOn(botIdentityCompatibility, "flushPendingForUser").mockResolvedValue({ pending: false });
        spyOn(botIdentityCompatibility, "hasPendingForUser").mockResolvedValue(false);

        const response = await identityRoutes.handle(new Request("http://localhost/identities"));
        expect(response.status).toBe(200);
        const body = JSON.stringify(await response.json());
        expect(body).toContain('"providerUserId":"24680"');
        expect(body).not.toContain("accessToken");
        expect(body).not.toContain("refreshToken");
        expect(body).not.toContain("clientSecret");
    });

    it("starts explicit Discord and osu! linking through Better Auth", async () => {
        mockCurrent();
        spyOn(userIdentities, "getUserIdentities").mockResolvedValue([]);
        const discordLink = spyOn(auth.api, "linkSocialAccount").mockResolvedValue({
            url: "https://discord.com/oauth2/authorize?state=redacted",
            redirect: false,
        });
        const osuLink = spyOn(auth.api, "oAuth2LinkAccount").mockResolvedValue({
            url: "https://osu.ppy.sh/oauth/authorize?state=redacted&code_challenge=redacted",
            redirect: true,
        });

        const discordResponse = await postLink("discord");
        const osuResponse = await postLink("osu");
        expect(discordResponse.status).toBe(200);
        expect(osuResponse.status).toBe(200);
        expect(discordLink).toHaveBeenCalledTimes(1);
        expect(osuLink).toHaveBeenCalledTimes(1);
    });

    it("treats a repeated link as idempotent", async () => {
        mockCurrent();
        spyOn(userIdentities, "getUserIdentities").mockResolvedValue([discordIdentity]);
        const link = spyOn(auth.api, "linkSocialAccount");

        const response = await postLink("discord");
        expect(response.status).toBe(200);
        expect(await response.json()).toMatchObject({ alreadyLinked: true, url: null });
        expect(link).not.toHaveBeenCalled();
    });

    it("requires trusted origin and a fresh session for linking", async () => {
        mockCurrent();
        spyOn(userIdentities, "getUserIdentities").mockResolvedValue([]);

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
        spyOn(userIdentities, "getUserIdentities").mockResolvedValue([osuIdentity]);
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

function makeIdentity(provider: "discord" | "osu", providerUserId: string): UserIdentity {
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
    };
}
