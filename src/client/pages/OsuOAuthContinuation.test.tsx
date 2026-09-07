import { describe, expect, it } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";

import { OsuOAuthContinuationPanel } from "./OsuOAuthContinuation";

describe("osu OAuth continuation", () => {
    it("asks the signed-in user to connect osu! without offering Discord", () => {
        const markup = render({ state: "ready", onConnect: () => {} });

        expect(markup).toContain("Connect osu! to continue");
        expect(markup).toContain("Connect osu!");
        expect(markup).not.toContain("Discord");
    });

    it("requires the existing owner account instead of transferring an osu! identity", () => {
        const markup = render({ state: "conflict", onRestart: () => {} });

        expect(markup).toContain("Use the linked Hanami account");
        expect(markup).toContain("belongs to another Hanami account");
        expect(markup).toContain("Sign in with that osu! account");
    });

    it("renders a clear continuation failure without exposing raw OAuth details", () => {
        const markup = render({ state: "error", error: "This authorization request expired. Start again." });

        expect(markup).toContain('role="alert"');
        expect(markup).toContain("This authorization request expired. Start again.");
        expect(markup).not.toContain("sig=");
    });
});

function render(props: React.ComponentProps<typeof OsuOAuthContinuationPanel>): string {
    return renderToStaticMarkup(
        <MemoryRouter>
            <OsuOAuthContinuationPanel {...props} />
        </MemoryRouter>,
    );
}
