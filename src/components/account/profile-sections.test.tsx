import { describe, expect, it } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";

import { IdentitySection, type LinkedIdentity } from "./profile-sections";

const discordIdentity = makeIdentity("discord", "123456789012345678");
const osuIdentity = makeIdentity("osu", "24680");

describe("linked account controls", () => {
    it("keeps both provider cards visible and explains how a Discord-only user can enable unlinking", () => {
        const markup = render([discordIdentity]);

        expect(markup).toContain("Linked Discord user");
        expect(markup).toContain("Link osu!");
        expect(markup).toContain("Link osu! before unlinking Discord.");
        expect(markup).toContain(">Unlink Discord</button>");
        expect(markup).toContain('type="button" disabled=""');
    });

    it("explains the inverse safeguard for an osu!-only user", () => {
        const markup = render([osuIdentity]);

        expect(markup).toContain("Linked osu! player");
        expect(markup).toContain("Link Discord");
        expect(markup).toContain("Link Discord before unlinking osu!.");
        expect(markup).toContain(">Unlink osu!</button>");
        expect(markup).toContain('type="button" disabled=""');
    });

    it("enables both unlink controls after the second provider is linked", () => {
        const markup = render([discordIdentity, osuIdentity]);

        expect(markup).toContain(">Unlink Discord</button>");
        expect(markup).toContain(">Unlink osu!</button>");
        expect(markup).not.toContain("before unlinking");
        expect(markup).not.toContain('type="button" disabled=""');
    });

    it("shows a mismatched projection as requiring repair instead of a login method", () => {
        const repairIdentity: LinkedIdentity = {
            ...osuIdentity,
            canAuthenticate: false,
            status: "repair_required",
        };
        const markup = render([discordIdentity, repairIdentity]);

        expect(markup).toContain("Needs repair");
        expect(markup).toContain("not currently available for sign-in");
        expect(markup).not.toContain(">Unlink osu!</button>");
        expect(markup).not.toContain(">Link osu!</button>");
        expect(markup).toContain("Link osu! before unlinking Discord.");
    });
});

function render(identities: LinkedIdentity[]): string {
    return renderToStaticMarkup(
        <MemoryRouter>
            <IdentitySection identities={identities} loading={false} action={null} onLink={() => {}} onUnlink={() => {}} />
        </MemoryRouter>,
    );
}

function makeIdentity(provider: LinkedIdentity["provider"], providerUserId: string): LinkedIdentity {
    return {
        provider,
        providerUserId,
        username: null,
        displayName: null,
        avatarUrl: null,
        linkedAt: "2026-07-18T00:00:00.000Z",
        updatedAt: "2026-07-18T00:00:00.000Z",
        canAuthenticate: true,
        status: "linked",
    };
}
