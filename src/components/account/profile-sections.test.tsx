import { describe, expect, it } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";

import { IdentitySection, type LoginMethod } from "./profile-sections";

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
});

function render(loginMethods: LoginMethod[]): string {
    return renderToStaticMarkup(
        <MemoryRouter>
            <IdentitySection
                profile={{ name: "Hanami user", image: null }}
                loginMethods={loginMethods}
                loginMethodCount={loginMethods.length}
                loading={false}
                action={null}
                onLink={() => {}}
                onUnlink={() => {}}
            />
        </MemoryRouter>,
    );
}

function makeLoginMethod(provider: LoginMethod["provider"], providerUserId: string): LoginMethod {
    return {
        provider,
        providerUserId,
        createdAt: "2026-07-18T00:00:00.000Z",
    };
}
