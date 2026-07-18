import { auth } from "./auth";
import { userIdentities } from "./identities/runtime";

export interface HanamiIdentity {
    userId: string;
    sessionId: string;
    sessionCreatedAt: Date;
}

export interface IdentityService {
    getCurrent(headers: Headers): Promise<HanamiIdentity | null>;
    resolveDiscordId(userId: string): Promise<string | null>;
}

export class ServerIdentityService implements IdentityService {
    constructor(private readonly getSession: (headers: Headers) => ReturnType<typeof auth.api.getSession>) {}

    async getCurrent(headers: Headers): Promise<HanamiIdentity | null> {
        const session = await this.getSession(headers);
        if (!session) return null;

        return {
            userId: session.user.id,
            sessionId: session.session.id,
            sessionCreatedAt: new Date(session.session.createdAt),
        };
    }

    async resolveDiscordId(userId: string): Promise<string | null> {
        const identities = await userIdentities.getUserAuthenticationIdentities(userId);
        return identities.find((identity) => identity.provider === "discord" && identity.canAuthenticate)?.providerUserId ?? null;
    }
}

export const serverIdentity = new ServerIdentityService((headers) => auth.api.getSession({ headers }));
