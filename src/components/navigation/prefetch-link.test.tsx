import { describe, expect, it } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";

import { preloadRoute } from "@/client/routes/client-components";
import { routes } from "@/client/routes/paths";
import { PrefetchLink } from "@/components/navigation/prefetch-link";

describe("PrefetchLink", () => {
    it("keeps internal links as normal anchors without leaking prefetch attributes", () => {
        const markup = renderToStaticMarkup(
            <MemoryRouter>
                <PrefetchLink className="test-link" aria-label="Bot route" to={routes.bot} prefetch="intent">
                    Bot
                </PrefetchLink>
            </MemoryRouter>,
        );

        expect(markup).toContain('<a class="test-link" aria-label="Bot route" href="/bot"');
        expect(markup).toContain("Bot</a>");
        expect(markup).not.toContain("prefetch=");
    });

    it("ignores paths that do not have a client route module", async () => {
        expect(await preloadRoute("/not-a-real-route")).toBeUndefined();
    });
});
