import { describe, expect, it } from "bun:test";

import { validateProductionOAuthConfiguration } from "./auth-configuration";

describe("production OAuth configuration", () => {
    it("fails startup with every missing provider credential named", () => {
        expect(() => validateProductionOAuthConfiguration({ NODE_ENV: "production" })).toThrow(
            "Missing production OAuth configuration: DISCORD_CLIENT_ID, DISCORD_CLIENT_SECRET, OSU_AUTH_CLIENT_ID, OSU_AUTH_CLIENT_SECRET",
        );
    });

    it("accepts complete production provider configuration and does not gate non-production builds", () => {
        expect(() =>
            validateProductionOAuthConfiguration({
                NODE_ENV: "production",
                DISCORD_CLIENT_ID: "discord-client",
                DISCORD_CLIENT_SECRET: "discord-secret",
                OSU_AUTH_CLIENT_ID: "osu-client",
                OSU_AUTH_CLIENT_SECRET: "osu-secret",
            }),
        ).not.toThrow();
        expect(() => validateProductionOAuthConfiguration({ NODE_ENV: "development" })).not.toThrow();
    });
});
