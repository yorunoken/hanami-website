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
        expect(legalMetadata.effectiveDate).toBe("July 18, 2026");

        for (const Component of [LegalIndex, PrivacyPolicy, TermsOfService, CookiePolicy, DataDeletion]) {
            const html = render(Component);
            expect(html).not.toContain("REQUIRES OWNER CONFIRMATION");
            expect(html).not.toContain("Draft notice");
        }
    });

    it("distinguishes the operator location from the infrastructure location", () => {
        const html = render(PrivacyPolicy);
        expect(html).toContain("operator is based in Türkiye");
        expect(html).toContain("production infrastructure is hosted in Germany");
    });

    it("documents verified storage and avoids unsupported operational guarantees", () => {
        const cookies = render(CookiePolicy);
        const privacy = render(PrivacyPolicy);
        const deletion = render(DataDeletion);

        expect(cookies).toContain("hanami.account-deletion.challenge");
        expect(cookies).toContain("loads after the production page starts");
        expect(privacy).toContain("Cloudflare’s privacy policy");
        expect(privacy).toContain("No repository-backed retention period was found");
        expect(privacy).toContain("does not replace the application methods required by law");
        expect(privacy).not.toContain("normal backup rotation");
        expect(deletion).not.toContain("backup copies may");
    });

    it("describes reports and distributed projects as implemented", () => {
        const privacy = render(PrivacyPolicy);
        const terms = render(TermsOfService);

        expect(privacy).toContain("free-text description");
        expect(privacy).toContain("no network client dependency or command-line binary");
        expect(terms).toContain("separately distributed Rust library");
        expect(terms).not.toContain("optional description");
    });
});

function render(Component: () => React.JSX.Element): string {
    return renderToStaticMarkup(
        <MemoryRouter>
            <Component />
        </MemoryRouter>,
    );
}
