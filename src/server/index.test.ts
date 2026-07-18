import { describe, expect, it } from "bun:test";

import app from "./index";

describe("Legacy legal URLs", () => {
    it("redirects old privacy URLs to the legal center", async () => {
        const response = await app.handle(new Request("http://localhost/privacy?source=footer"));
        expect(response.status).toBe(308);
        expect(response.headers.get("location")).toBe("http://localhost/legal/privacy?source=footer");
    });

    it("redirects old terms URLs to the legal center", async () => {
        const response = await app.handle(new Request("http://localhost/terms-of-service"));
        expect(response.status).toBe(308);
        expect(response.headers.get("location")).toBe("http://localhost/legal/terms");
    });
});

describe("Canonical route redirects", () => {
    it("redirects index.html and trailing-slash duplicates", async () => {
        const indexResponse = await app.handle(new Request("http://localhost/index.html?source=old"));
        expect(indexResponse.status).toBe(308);
        expect(indexResponse.headers.get("location")).toBe("http://localhost/?source=old");

        const trailingSlashResponse = await app.handle(new Request("http://localhost/bot/?source=old"));
        expect(trailingSlashResponse.status).toBe(308);
        expect(trailingSlashResponse.headers.get("location")).toBe("http://localhost/bot?source=old");
    });
});

describe("Unknown API routes", () => {
    it("returns a non-indexable JSON 404 instead of the application shell", async () => {
        const response = await app.handle(new Request("http://localhost/api/does-not-exist"));

        expect(response.status).toBe(404);
        expect(response.headers.get("content-type")).toContain("application/json");
        expect(response.headers.get("x-robots-tag")).toBe("noindex, nofollow");
        expect(await response.json()).toEqual({ error: "Not Found" });
    });
});
