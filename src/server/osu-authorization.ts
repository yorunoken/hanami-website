import { createOAuthState, type OAuthStateBinding, type OAuthStateStore } from "./oauth-state";

export interface OsuAuthorizationConfiguration {
    clientId: string;
    callbackUrl: string;
}

export function getOsuAuthorizationConfiguration(): OsuAuthorizationConfiguration | null {
    const clientId = process.env.OSU_CLIENT_ID;
    const callbackUrl = process.env.OSU_CALLBACK_URL;
    if (!clientId || !callbackUrl) return null;
    return { clientId, callbackUrl };
}

export async function createOsuAuthorizationUrl(
    store: OAuthStateStore,
    binding: OAuthStateBinding,
    configuration: OsuAuthorizationConfiguration,
): Promise<string> {
    const state = await createOAuthState(store, binding);
    const url = new URL("https://osu.ppy.sh/oauth/authorize");
    url.searchParams.set("client_id", configuration.clientId);
    url.searchParams.set("redirect_uri", configuration.callbackUrl);
    url.searchParams.set("response_type", "code");
    url.searchParams.set("scope", "identify");
    url.searchParams.set("state", state);
    return url.toString();
}
