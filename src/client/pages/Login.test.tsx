import { describe, expect, it } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";

import { describeOAuthError } from "@/client/lib/auth-navigation";
import { LoginPanel } from "./Login";

describe("fallback login panel", () => {
    it("shows one Discord action, privacy context, and a public-site exit", () => {
        const markup = renderPanel(null);
        expect(markup.match(/<button/g)).toHaveLength(1);
        expect(markup).toContain("Sign in with Discord");
        expect(markup).toContain('href="/legal/privacy"');
        expect(markup).toContain('href="/"');
    });

    it("turns OAuth cancellation into a usable message without raw callback details", () => {
        const message = describeOAuthError("access_denied");
        const markup = renderPanel(message);
        expect(markup).toContain('role="alert"');
        expect(markup).toContain("Discord authorization was cancelled");
        expect(markup).not.toContain("access_denied");
    });
});

function renderPanel(error: string | null): string {
    return renderToStaticMarkup(
        <MemoryRouter>
            <LoginPanel error={error} isRedirecting={false} onSignIn={() => {}} />
        </MemoryRouter>,
    );
}
