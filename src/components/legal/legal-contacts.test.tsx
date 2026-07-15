import { describe, expect, it } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";

import CookiePolicy from "./cookie-policy";
import DataDeletion from "./data-deletion";
import LegalIndex from "./legal-index";
import PrivacyPolicy from "./privacy-policy";
import TermsOfService from "./tos";
import { legalMetadata } from "@/data/legal";

describe("legal contacts and request links", () => {
    it("uses the confirmed privacy contact on privacy, deletion, and cookie pages", () => {
        for (const Component of [PrivacyPolicy, DataDeletion, CookiePolicy]) {
            const html = render(Component);
            expect(html).toContain('href="mailto:privacy@yorunoken.com"');
        }
    });

    it("keeps legal and privacy contact purposes separate in the Terms", () => {
        const html = render(TermsOfService);
        expect(html).toContain('href="mailto:legal@yorunoken.com"');
        expect(html).toContain('href="mailto:privacy@yorunoken.com"');
    });

    it("links the legal center to authenticated account deletion", () => {
        const html = render(LegalIndex);
        expect(html).toContain('href="/profile/privacy"');
        expect(html).toContain("privacy@yorunoken.com");
        expect(html).toContain("legal@yorunoken.com");
    });

    it("publishes effective documents without unresolved owner markers", () => {
        expect(legalMetadata.effectiveDate).toBe("July 16, 2026");

        for (const Component of [LegalIndex, PrivacyPolicy, TermsOfService, CookiePolicy, DataDeletion]) {
            const html = render(Component);
            expect(html).not.toContain("REQUIRES OWNER CONFIRMATION");
            expect(html).not.toContain("Draft notice");
        }
    });
});

function render(Component: () => React.JSX.Element): string {
    return renderToStaticMarkup(
        <MemoryRouter>
            <Component />
        </MemoryRouter>,
    );
}
