import { describe, expect, it } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";

import { IdentitySection } from "./profile-sections";

describe("profile identity controls", () => {
    it("shows both canonical providers and explicit disconnect controls", () => {
        const markup = renderToStaticMarkup(
            <IdentitySection
                currentUser={{ name: "Yoru", image: null }}
                loginMethods={[
                    { provider: "discord", providerUserId: "123456789012345678" },
                    {
                        provider: "osu",
                        providerUserId: "24680",
                        displayName: "Yoru",
                        avatarUrl: "https://a.ppy.sh/24680",
                    },
                ]}
                loading={false}
                action={null}
                onLink={() => {}}
                onUnlink={() => {}}
            />,
        );

        expect(markup).toContain("Discord identity");
        expect(markup).toContain("osu! identity");
        expect(markup).toContain("Disconnect Discord");
        expect(markup).toContain("Disconnect osu!");
        expect(markup).toContain("Yoru");
        expect(markup).toContain("https://a.ppy.sh/24680");
        expect(markup).not.toContain("Linked player");
    });

    it("offers explicit link buttons without implying the providers are already combined", () => {
        const markup = renderToStaticMarkup(
            <IdentitySection
                currentUser={{ name: "Yoru", image: null }}
                loginMethods={[]}
                loading={false}
                action={null}
                onLink={() => {}}
                onUnlink={() => {}}
            />,
        );

        expect(markup).toContain("Connect Discord");
        expect(markup).toContain("Connect osu!");
        expect(markup.match(/data-provider-logo="discord"/g)).toHaveLength(2);
        expect(markup.match(/data-provider-logo="osu"/g)).toHaveLength(2);
        expect(markup.match(/mt-auto pt-8/g)).toHaveLength(2);
    });

    it("keeps a disconnected provider card concise", () => {
        const markup = renderToStaticMarkup(
            <IdentitySection
                currentUser={{ name: "Yoru", image: null }}
                loginMethods={[{ provider: "osu", providerUserId: "24680", displayName: "Yoru" }]}
                loading={false}
                action={null}
                onLink={() => {}}
                onUnlink={() => {}}
            />,
        );

        expect(markup).toContain("Not connected");
        expect(markup).toContain("Connect Discord");
        expect(markup).not.toContain("Connect a Discord account to use Hanami Bot");
    });
});
