import { describe, expect, it } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";

import { IdentitySection, type LinkedAccountView, type LoginMethod } from "./profile-sections";

const discordMethod = makeLoginMethod("discord", "123456789012345678");
const osuMethod = makeLoginMethod("osu", "24680");

describe("linked account controls", () => {
    it("keeps both provider cards visible and explains how a Discord-only user can enable unlinking", () => {
        const markup = render([discordMethod]);

        expect(markup).toContain("Hanami user");
        expect(markup).toContain("Link osu!");
        expect(markup).toContain("Link osu! before unlinking Discord.");
        expect(markup).toContain(">Unlink Discord</button>");
        expect(markup).toContain('type="button" disabled=""');
    });

    it("explains the inverse safeguard for an osu!-only user", () => {
        const markup = render([osuMethod]);

        expect(markup).toContain("Hanami user");
        expect(markup).toContain("Link Discord");
        expect(markup).toContain("Link Discord before unlinking osu!.");
        expect(markup).toContain(">Unlink osu!</button>");
        expect(markup).toContain('type="button" disabled=""');
    });

    it("enables both unlink controls after the second provider is linked", () => {
        const markup = render([discordMethod, osuMethod]);

        expect(markup).toContain(">Unlink Discord</button>");
        expect(markup).toContain(">Unlink osu!</button>");
        expect(markup).not.toContain("before unlinking");
        expect(markup).not.toContain('type="button" disabled=""');
    });

    it("never renders reconciliation or repair states", () => {
        const markup = render([discordMethod, osuMethod]);
        expect(markup).not.toContain("Needs repair");
        expect(markup).not.toContain("reconciliation");
    });

    it("renders each linked provider's own avatar and profile details", () => {
        const markup = render(
            [discordMethod, osuMethod],
            [
                makeLinkedAccount(
                    "discord",
                    discordMethod.providerUserId,
                    "Discord Yoru",
                    "https://cdn.discordapp.com/avatars/123/avatar.png",
                ),
                makeLinkedAccount("osu", osuMethod.providerUserId, "osu! Yoru", "https://a.ppy.sh/24680", "https://osu.ppy.sh/users/24680"),
            ],
        );

        expect(markup).toContain('src="https://cdn.discordapp.com/avatars/123/avatar.png"');
        expect(markup).toContain('src="https://a.ppy.sh/24680"');
        expect(markup).toContain("Discord Yoru");
        expect(markup).toContain('href="https://osu.ppy.sh/users/24680"');
        expect(markup).not.toContain("Hanami user avatar");
    });

    it("uses a provider-specific placeholder when a provider snapshot has no avatar", () => {
        const markup = render([discordMethod], [makeLinkedAccount("discord", discordMethod.providerUserId, null, null)]);

        expect(markup).toContain(">DC</span>");
        expect(markup).not.toContain("Hanami user avatar");
    });
});

function render(loginMethods: LoginMethod[], linkedAccounts: LinkedAccountView[] = loginMethods.map(toLinkedAccount)): string {
    return renderToStaticMarkup(
        <MemoryRouter>
            <IdentitySection
                linkedAccounts={linkedAccounts}
                loginMethodCount={loginMethods.length}
                loading={false}
                action={null}
                onLink={() => {}}
                onUnlink={() => {}}
            />
        </MemoryRouter>,
    );
}

function toLinkedAccount(method: LoginMethod): LinkedAccountView {
    return makeLinkedAccount(
        method.provider,
        method.providerUserId,
        "Hanami user",
        null,
        method.provider === "osu" ? `https://osu.ppy.sh/users/${method.providerUserId}` : null,
    );
}

function makeLoginMethod(provider: LoginMethod["provider"], providerUserId: string): LoginMethod {
    return {
        provider,
        providerUserId,
        createdAt: "2026-07-18T00:00:00.000Z",
    };
}

function makeLinkedAccount(
    providerId: LoginMethod["provider"],
    accountId: string,
    displayName: string | null,
    avatarUrl: string | null,
    profileUrl: string | null = null,
): LinkedAccountView {
    return { providerId, accountId, displayName, avatarUrl, profileUrl };
}
