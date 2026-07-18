import { describe, expect, it } from "bun:test";

import { providerFromAuthPath } from "./auth-hooks";

describe("identity authentication hooks", () => {
    it("recognizes only successful Discord and generic osu! callback paths", () => {
        expect(providerFromAuthPath("/callback/discord")).toBe("discord");
        expect(providerFromAuthPath("/oauth2/callback/osu")).toBe("osu");
        expect(providerFromAuthPath("/api/auth/oauth2/callback/osu")).toBe("osu");
        expect(providerFromAuthPath("/account/update")).toBeNull();
        expect(providerFromAuthPath("/callback/untrusted")).toBeNull();
    });
});
