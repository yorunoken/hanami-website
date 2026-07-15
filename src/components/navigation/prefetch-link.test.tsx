import { describe, expect, it } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";

import { PrefetchLink } from "@/components/navigation/prefetch-link";
import { routes } from "@/client/routes/paths";

describe("PrefetchLink", () => {
    it("keeps internal links as normal anchors with supplied attributes", () => {
        const markup = renderToStaticMarkup(
            <MemoryRouter>
                <PrefetchLink className="test-link" aria-label="Bot route" to={routes.bot}>
                    Bot
                </PrefetchLink>
            </MemoryRouter>,
        );

        expect(markup).toContain('<a class="test-link" aria-label="Bot route" href="/bot"');
        expect(markup).toContain("Bot</a>");
    });
});
