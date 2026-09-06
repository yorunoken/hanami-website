import { describe, expect, it } from "bun:test";

import { parseBinary } from "./osu-link";

describe("stored Bot settings", () => {
    it("keeps each binary field's own default when the database value is null", () => {
        expect(parseBinary(null, 1)).toBe(1);
        expect(parseBinary(null, 0)).toBe(0);
        expect(parseBinary(0, 1)).toBe(0);
        expect(parseBinary(1, 0)).toBe(1);
    });
});
