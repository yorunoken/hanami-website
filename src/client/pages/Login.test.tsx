import { describe, expect, it } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";

import { describeOAuthError } from "@/client/lib/auth-navigation";
import { LoginPanel } from "./Login";

describe("fallback login panel", () => {
    it("shows equal Discord and osu! actions and a public-site exit", () => {
        const markup = renderPanel(null);
        expect(markup.match(/<button/g)).toHaveLength(2);
        expect(markup).toContain("Continue with Discord");
        expect(markup).toContain("Continue with osu!");
        expect(markup).toContain('data-provider-logo="discord"');
        expect(markup).toContain('data-provider-logo="osu"');
        expect(markup).toContain('href="/"');
    });

    it("confirms completed account deletion without treating it as an error", () => {
        const markup = renderPanel(null, "Your Hanami account was deleted.");
        expect(markup).toContain('role="status"');
        expect(markup).toContain("Your Hanami account was deleted.");
        expect(markup).not.toContain('role="alert"');
    });

    it("turns OAuth cancellation into a usable message without raw callback details", () => {
        const message = describeOAuthError("access_denied");
        const markup = renderPanel(message);
        expect(markup).toContain('role="alert"');
        expect(markup).toContain("Discord authorization was cancelled");
        expect(markup).not.toContain("access_denied");
    });

    it("renders only the osu! retry action for a signed osu authorization transaction", () => {
        const markup = renderPanel("osu! authorization could not be completed.", undefined, "osu");

        expect(markup.match(/<button/g)).toHaveLength(1);
        expect(markup).toContain("Try osu! again");
        expect(markup).not.toContain("Continue with Discord");
        expect(markup).not.toContain("Continue with osu!");
    });
});

function renderPanel(error: string | null, status?: string, mode: "general" | "osu" = "general"): string {
    return renderToStaticMarkup(
        <MemoryRouter>
            <LoginPanel error={error} status={status} mode={mode} redirectingProvider={null} onSignIn={() => {}} />
        </MemoryRouter>,
    );
}
