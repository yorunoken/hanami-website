export const osuGuessrScopes = ["openid", "osu", "offline_access"] as const;

export interface StaticOAuthClientConfig {
    clientId: string;
    name: string;
    redirectUris: string[];
    scopes: string[];
    tokenEndpointAuthMethod: "none";
    responseTypes: ["code"];
    grantTypes: ["authorization_code", "refresh_token"];
    requirePKCE: true;
    subjectType: "public";
    skipConsent: true;
}

export interface OAuthClientUpsertDatabase {
    oauthClient: {
        upsert: (args: never) => Promise<unknown>;
    };
}

export function getOsuGuessrClientConfig(environment: NodeJS.ProcessEnv = process.env): StaticOAuthClientConfig | null {
    const clientId = environment.OSU_GUESSR_CLIENT_ID?.trim();
    const rawRedirectUris = environment.OSU_GUESSR_REDIRECT_URIS;
    if (!clientId || !rawRedirectUris) return null;

    const redirectUris = rawRedirectUris
        .split(",")
        .map((uri) => uri.trim())
        .filter(Boolean);
    if (redirectUris.length === 0 || redirectUris.some((uri) => !isAllowedRedirectUri(uri))) return null;

    return {
        clientId,
        name: "osu!guessr",
        redirectUris,
        scopes: [...osuGuessrScopes],
        tokenEndpointAuthMethod: "none",
        responseTypes: ["code"],
        grantTypes: ["authorization_code", "refresh_token"],
        requirePKCE: true,
        subjectType: "public",
        skipConsent: true,
    };
}

export async function reconcileOsuGuessrClient(
    database: OAuthClientUpsertDatabase,
    environment: NodeJS.ProcessEnv = process.env,
): Promise<unknown | null> {
    const config = getOsuGuessrClientConfig(environment);
    if (!config) return null;

    const persisted = {
        clientId: config.clientId,
        name: config.name,
        redirectUris: config.redirectUris,
        scopes: config.scopes,
        clientCredentialsScopes: [],
        tokenEndpointAuthMethod: config.tokenEndpointAuthMethod,
        responseTypes: config.responseTypes,
        grantTypes: config.grantTypes,
        requirePKCE: config.requirePKCE,
        subjectType: config.subjectType,
        skipConsent: config.skipConsent,
        disabled: false,
    };

    return database.oauthClient.upsert({
        where: { clientId: config.clientId },
        update: persisted,
        create: { id: crypto.randomUUID(), ...persisted },
    } as never);
}

function isAllowedRedirectUri(value: string): boolean {
    try {
        const uri = new URL(value);
        if (uri.hash) return false;
        if (uri.protocol === "https:") return true;
        return uri.protocol === "http:" && new Set(["localhost", "127.0.0.1", "[::1]"]).has(uri.hostname);
    } catch {
        return false;
    }
}
