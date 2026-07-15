import { describe, expect, it } from "bun:test";

import { injectRenderedPage } from "./page-renderer";

const template = '<!doctype html><html><head></head><body><div id="root"></div></body></html>';

describe("public page rendering", () => {
    it("puts indexable route content and links in the initial HTML", () => {
        const html = injectRenderedPage(template, "/bot");

        expect(html).toContain("<main>");
        expect(html).toContain("Hanami Bot");
        expect(html).toContain("osu! information where the conversation is already happening.");
        expect(html).toContain('href="/legal/data-deletion"');
    });

    it("renders useful not-found content for a real HTTP 404 response", () => {
        const html = injectRenderedPage(template, "/not-a-real-page");

        expect(html).toContain("This route does not exist.");
        expect(html).toContain('href="/"');
    });
});
