import { describe, expect, it } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";

import { PrefetchLink } from "@/components/navigation/prefetch-link";
import { routes } from "./paths";
import { routeModules, routePreloaders } from "./route-modules";

describe("lazy route registry", () => {
  it("points important paths at their shared route module preloaders", () => {
    expect(routePreloaders[routes.bot]).toBe(routeModules.bot.preload);
    expect(routePreloaders[routes.osuguessr]).toBe(
      routeModules.osuguessr.preload,
    );
    expect(routePreloaders[routes.profilePrivacy]).toBe(
      routeModules.accountPrivacy.preload,
    );
    expect(routePreloaders[routes.legalPrivacy]).toBe(
      routeModules.legalPrivacy.preload,
    );
    expect(routePreloaders[routes.legalTerms]).toBe(
      routeModules.legalTerms.preload,
    );
  });

  it("loads every unique lazy page module without module-level side effects", async () => {
    const loaded = await Promise.all(
      Object.values(routeModules).map((module) => module.preload()),
    );
    expect(loaded.every((module) => typeof module.default === "function")).toBe(
      true,
    );
  });

  it("keeps internal links as normal anchors with supplied attributes", () => {
    const markup = renderToStaticMarkup(
      <MemoryRouter>
        <PrefetchLink
          className="test-link"
          aria-label="Bot route"
          to={routes.bot}
        >
          Bot
        </PrefetchLink>
      </MemoryRouter>,
    );

    expect(markup).toContain(
      '<a class="test-link" aria-label="Bot route" href="/bot"',
    );
    expect(markup).toContain("Bot</a>");
  });
});
