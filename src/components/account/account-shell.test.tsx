import { describe, expect, it } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";

import { AccountPanel, AccountPanelHeader, AccountPageIntro } from "./account-shell";

describe("account page structure", () => {
    it("provides a consistent intro and panel hierarchy", () => {
        const markup = renderToStaticMarkup(
            <>
                <AccountPageIntro eyebrow="Hanami account" title="Yoru" description="Manage your account." />
                <AccountPanel>
                    <AccountPanelHeader title="Sign-in methods" description="Use either provider." />
                    <p>Panel content</p>
                </AccountPanel>
            </>,
        );

        expect(markup).toContain("Hanami account");
        expect(markup).toContain("<h1");
        expect(markup).toContain("Yoru");
        expect(markup).toContain("<h2");
        expect(markup).toContain("Sign-in methods");
        expect(markup).toContain("Panel content");
    });
});
