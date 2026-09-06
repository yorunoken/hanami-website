import { describe, expect, it } from "bun:test";

import { injectSeoHead } from "./seo";

const template = `<!doctype html>
<html>
    <head>
        <!-- SEO_HEAD_START -->
        <title>Default title</title>
        <meta name="description" content="Default description" />
        <!-- SEO_HEAD_END -->
    </head>
</html>`;

describe("server-rendered SEO head", () => {
    it("writes route-specific metadata into the initial HTML", () => {
        const html = injectSeoHead(template, "/bot");

        expect(html).toContain("<title>Hanami Bot | osu! Discord bot</title>");
        expect(html).toContain('href="https://hanami.yorunoken.com/bot"');
        expect(html).toContain('content="index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1"');
        expect(html).toContain('id="hanami-structured-data"');
        expect(html).not.toContain("Default title");
    });

    it("marks private and missing pages as noindex without structured data", () => {
        for (const pathname of ["/profile", "/missing-page"]) {
            const html = injectSeoHead(template, pathname);
            expect(html).toContain('content="noindex, nofollow"');
            expect(html).not.toContain('id="hanami-structured-data"');
        }
    });
});
