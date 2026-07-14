import { describe, expect, it } from "bun:test";

import { createRouteModule } from "./create-route-module";

describe("createRouteModule", () => {
    it("deduplicates concurrent preloads and caches successful imports", async () => {
        let imports = 0;
        const module = createRouteModule(async () => {
            imports += 1;
            return { default: () => null };
        });

        const first = module.preload();
        const second = module.preload();

        expect(first).toBe(second);
        await Promise.all([first, second]);
        await module.preload();
        expect(imports).toBe(1);
    });

    it("clears a rejected promise so navigation can retry", async () => {
        let imports = 0;
        const module = createRouteModule(async () => {
            imports += 1;
            if (imports === 1) throw new Error("temporary failure");
            return { default: () => null };
        });

        await expect(module.preload()).rejects.toThrow("temporary failure");
        await expect(module.preload()).resolves.toHaveProperty("default");
        expect(imports).toBe(2);
    });
});
