export const accountStatuses = ["pending_registration", "legacy_incomplete", "active", "conflict"] as const;
export type HanamiAccountStatus = (typeof accountStatuses)[number];

export const identityProviders = ["discord", "osu"] as const;
export type IdentityProvider = (typeof identityProviders)[number];
export type OAuthIntent = "login" | "register" | "complete";

export interface ProviderProfileSnapshot {
    accountId: string;
    name: string;
    image: string | null;
    email: string | null;
    emailVerified: boolean;
}

export interface PendingRegistration {
    id: string;
    browserBindingHash: string;
    discordAccountId: string | null;
    osuAccountId: string | null;
    discordProfile: ProviderProfileSnapshot | null;
    osuProfile: ProviderProfileSnapshot | null;
    createdAt: Date;
    expiresAt: Date;
    consumedAt: Date | null;
    attemptCount: number;
    status: "pending_registration" | "conflict" | "expired" | "consumed" | "cancelled";
    correlationId: string;
}

export interface AccountIdentity {
    userId: string;
    status: HanamiAccountStatus;
    identityVersion: number;
    identityUpdatedAt: Date;
    discord: ProviderProfileSnapshot | null;
    osu: ProviderProfileSnapshot | null;
}

export type BotIdentityResponse =
    | {
          status: "active";
          hanamiUserId: string;
          discordId: string;
          osuId: string;
          identityVersion: number;
          updatedAt: string;
      }
    | {
          status: "incomplete" | "not_found" | "conflict";
          identityVersion: number;
      };

