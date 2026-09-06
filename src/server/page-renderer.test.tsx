import { describe, expect, it } from "bun:test";

import { injectRenderedPage } from "./page-renderer";

const template = '<!doctype html><html><head></head><body><div id="root"></div></body></html>';

describe("public page rendering", () => {
    it("puts indexable route content and links in the initial HTML", () => {
        const html = injectRenderedPage(template, "/bot");

        expect(html).toContain("<main>");
        expect(html).toContain("Hanami Bot");
        expect(html).toContain("Look up osu! players and scores in Discord.");
        expect(html).toContain('href="/legal/data-deletion"');
    });

    it("renders the homepage support section and its GitHub Sponsors destination", () => {
        const html = injectRenderedPage(template, "/");

        expect(html).toContain("Support Hanami");
        expect(html).toContain("Sponsor on GitHub");
        expect(html).toContain('href="https://github.com/sponsors/yorunoken"');
    });

    it("renders useful not-found content for a real HTTP 404 response", () => {
        const html = injectRenderedPage(template, "/not-a-real-page");

        expect(html).toContain("This page does not exist.");
        expect(html).toContain('href="/"');
    });
});
