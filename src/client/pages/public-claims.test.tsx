import { describe, expect, it } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";

import Companion from "./Companion";
import MapAnalyzer from "./MapAnalyzer";

describe("published product claims", () => {
    it("keeps Map Analyzer 0.2.9 claims within the published crate", () => {
        const html = render(MapAnalyzer);

        expect(html).toContain("does not publish a standalone command-line program");
        expect(html).toContain("cargo add osu-map-analyzer@0.2.9");
        expect(html).toContain("Stream analysis");
        expect(html).toContain("Jump analysis");
        expect(html).not.toContain("cargo install osu-map-analyzer");
        expect(html).not.toContain("JSONL");
        expect(html).not.toContain("rosu-pp");
    });

    it("labels Companion capabilities as public-source development work", () => {
        const html = render(Companion);

        expect(html).toContain("These capabilities are implemented in the public repository");
        expect(html).toContain("No packaged release is published yet");
        expect(html).toContain("View the source");
    });
});

function render(Component: () => React.JSX.Element): string {
    return renderToStaticMarkup(
        <MemoryRouter>
            <Component />
        </MemoryRouter>,
    );
}
