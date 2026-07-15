import { describe, expect, it } from "bun:test";

import { getPageSeo, isKnownClientRoute } from "./seo";

describe("route SEO", () => {
    it("makes public pages indexable with canonical metadata and structured data", () => {
        const seo = getPageSeo("/osuguessr");

        expect(seo.metadata.indexable).toBe(true);
        expect(seo.canonicalUrl).toBe("https://hanami.yorunoken.com/osuguessr");
        expect(seo.socialImageUrl).toBe("https://hanami.yorunoken.com/products/osuguessr-hero.webp");
        expect(seo.robots).toContain("index, follow");
        expect(JSON.stringify(seo.structuredData)).toContain("BreadcrumbList");
    });

    it("keeps account and authentication pages out of search results", () => {
        for (const pathname of ["/profile", "/profile/privacy", "/login", "/link-error"]) {
            const seo = getPageSeo(pathname);
            expect(seo.metadata.indexable).toBe(false);
            expect(seo.robots).toBe("noindex, nofollow");
            expect(seo.structuredData).toBeNull();
        }
    });

    it("treats unknown client paths as non-indexable", () => {
        expect(isKnownClientRoute("/does-not-exist")).toBe(false);
        expect(getPageSeo("/does-not-exist").robots).toBe("noindex, nofollow");
    });
});
