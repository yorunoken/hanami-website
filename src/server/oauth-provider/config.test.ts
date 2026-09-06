import { describe, expect, test } from "bun:test";

import { getOsuGuessrClientConfig, reconcileOsuGuessrClient } from "./config";

const redirectUris = ["https://osu-guessr.example.com/auth/hanami/callback", "https://osu-guessr.example.com/auth/hanami/callback/desktop"];

describe("osu!guessr OAuth client configuration", () => {
    test("preserves the exact configured HTTPS redirect URI strings", () => {
        const config = getOsuGuessrClientConfig({
            OSU_GUESSR_CLIENT_ID: "guessr-client",
            OSU_GUESSR_REDIRECT_URIS: redirectUris.join(","),
        } as NodeJS.ProcessEnv);

        expect(config).toMatchObject({
            clientId: "guessr-client",
            redirectUris,
            tokenEndpointAuthMethod: "none",
            responseTypes: ["code"],
            grantTypes: ["authorization_code", "refresh_token"],
            requirePKCE: true,
            subjectType: "public",
            scopes: ["openid", "osu", "offline_access"],
        });
    });

    test("returns null when the client id or redirect URI configuration is missing", () => {
        expect(getOsuGuessrClientConfig({} as NodeJS.ProcessEnv)).toBeNull();
        expect(getOsuGuessrClientConfig({ OSU_GUESSR_CLIENT_ID: "guessr-client" } as NodeJS.ProcessEnv)).toBeNull();
        expect(
            getOsuGuessrClientConfig({
                OSU_GUESSR_CLIENT_ID: "guessr-client",
                OSU_GUESSR_REDIRECT_URIS: "http://localhost/callback",
            } as NodeJS.ProcessEnv),
        ).toBeNull();
    });

    test("reconciles the configured client idempotently", async () => {
        const calls: unknown[] = [];
        const prisma = {
            oauthClient: {
                upsert: async (args: unknown) => {
                    calls.push(args);
                    return { clientId: "guessr-client" };
                },
            },
        };

        await reconcileOsuGuessrClient(prisma, {
            OSU_GUESSR_CLIENT_ID: "guessr-client",
            OSU_GUESSR_REDIRECT_URIS: redirectUris.join(","),
        } as NodeJS.ProcessEnv);
        await reconcileOsuGuessrClient(prisma, {
            OSU_GUESSR_CLIENT_ID: "guessr-client",
            OSU_GUESSR_REDIRECT_URIS: redirectUris.join(","),
        } as NodeJS.ProcessEnv);

        expect(calls).toHaveLength(2);
        expect(calls[0]).toMatchObject({
            where: { clientId: "guessr-client" },
            update: { redirectUris },
            create: { clientId: "guessr-client", redirectUris },
        });
        expect(calls[1]).toMatchObject({
            where: { clientId: "guessr-client" },
            update: { redirectUris },
            create: { clientId: "guessr-client", redirectUris },
        });
    });
});
