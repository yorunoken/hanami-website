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

    it("organizes the legal center around user tasks and all Hanami services", () => {
        const html = render(LegalIndex);

        expect(html).toContain("Understand how data is used");
        expect(html).toContain("Read the service rules");
        expect(html).toContain("Manage cookies and browser storage");
        expect(html).toContain("Delete data or make a privacy request");
        expect(html).toContain("Hanami Web");
        expect(html).toContain("Hanami Bot");
        expect(html).toContain("osu!guessr");
        expect(html).toContain("Hanami Companion");
        expect(html).toContain("Map Analyzer");
    });

    it("gives each legal document an at-a-glance summary and related actions", () => {
        for (const Component of [PrivacyPolicy, TermsOfService, CookiePolicy, DataDeletion]) {
            const html = render(Component);
            expect(html).toContain("At a glance");
            expect(html).toContain("Related documents");
            expect(html).toContain("Account controls");
            expect(html).toContain("<details");
            expect(html).toContain('href="/legal"');
        }
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
        expect(privacy).toContain("The code does not specify a retention period");
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

    it("does not publish removed Companion authentication claims", () => {
        const privacy = render(PrivacyPolicy);
        const terms = render(TermsOfService);

        for (const html of [privacy, terms]) {
            expect(html).not.toContain("Hanami authentication");
            expect(html).not.toContain("Authorization Code");
            expect(html).not.toContain("PKCE");
            expect(html).not.toContain("Companion device");
            expect(html).not.toContain("Companion token");
            expect(html).not.toContain("play upload");
        }
    });

    it("describes the current provider-neutral Hanami account model", () => {
        const privacy = render(PrivacyPolicy);
        const deletion = render(DataDeletion);

        expect(privacy).toContain("Discord or osu! identity");
        expect(privacy).toContain("all connected provider records");
        expect(deletion).toContain("Disconnect a sign-in method");
        expect(privacy).not.toContain("Disconnecting osu! only clears");
        expect(privacy).not.toContain("stored against the Discord ID in the bot database");
    });
});

function render(Component: () => React.JSX.Element): string {
    return renderToStaticMarkup(
        <MemoryRouter>
            <Component />
        </MemoryRouter>,
    );
}
