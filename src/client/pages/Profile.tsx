import { AlertCircle } from "lucide-react";
import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import { useLocation, useNavigate } from "react-router-dom";

import { ApiError, fetchJson } from "@/client/lib/fetch-json";
import { readOAuthError } from "@/client/lib/auth-navigation";
import { AccountLayout, AccountPage, profileHeadingClass, profileLayoutClass } from "@/components/account/account-shell";
import { useAuthenticatedSession } from "@/components/account/authenticated-route";
import {
    AccountPrivacyAside,
    BotPreferencesSection,
    IdentitySection,
    type BotSettings,
    type LoginMethod,
    type LoginMethodsResponse,
    type ProfileAction,
} from "@/components/account/profile-sections";
import { Eyebrow } from "@/components/marketing";
import { formMessageClass } from "@/components/ui/action-styles";
import { cn } from "@/lib/utils";

interface BotPreferencesResponse {
    available: boolean;
    settings: BotSettings | null;
}

interface LinkResponse {
    alreadyLinked: boolean;
    url: string | null;
}

interface UnlinkResponse {
    unlinked: boolean;
}

export default function Profile() {
    const session = useAuthenticatedSession();
    const location = useLocation();
    const navigate = useNavigate();
    const automaticLinkStarted = useRef(false);
    const [loginMethodState, setLoginMethodState] = useState<LoginMethodsResponse | null>(null);
    const [settings, setSettings] = useState<BotSettings | null>(null);
    const [botPreferencesAvailable, setBotPreferencesAvailable] = useState(false);
    const [identityLoading, setIdentityLoading] = useState(true);
    const [settingsLoading, setSettingsLoading] = useState(true);
    const [action, setAction] = useState<ProfileAction>(null);
    const [error, setError] = useState<string | null>(null);
    const [notice, setNotice] = useState<string | null>(null);
    const [saved, setSaved] = useState(false);

    const loadLoginMethods = useCallback(async (signal?: AbortSignal) => {
        const result = await fetchJson<LoginMethodsResponse>("/api/login-methods", signal);
        setLoginMethodState(result);
        return result;
    }, []);

    const loadBotPreferences = useCallback(async (signal?: AbortSignal) => {
        const result = await fetchJson<BotPreferencesResponse>("/api/bot-preferences", signal);
        setBotPreferencesAvailable(result.available);
        setSettings(result.settings);
    }, []);

    useEffect(() => {
        const controller = new AbortController();
        setIdentityLoading(true);
        setSettingsLoading(true);
        setError(null);

        void loadLoginMethods(controller.signal)
            .catch((requestError: unknown) => {
                if (requestError instanceof DOMException && requestError.name === "AbortError") return;
                setError("Linked accounts could not be loaded. Please refresh and try again.");
            })
            .finally(() => {
                if (!controller.signal.aborted) setIdentityLoading(false);
            });

        void loadBotPreferences(controller.signal)
            .catch((requestError: unknown) => {
                if (requestError instanceof DOMException && requestError.name === "AbortError") return;
                setError("Bot preferences could not be loaded. Please refresh and try again.");
            })
            .finally(() => {
                if (!controller.signal.aborted) setSettingsLoading(false);
            });

        return () => controller.abort();
    }, [loadBotPreferences, loadLoginMethods, session.user.id]);

    const handleLink = useCallback(
        async (provider: LoginMethod["provider"]) => {
            setAction(`linking-${provider}`);
            setError(null);
            setNotice(null);
            try {
                const result = await fetchJson<LinkResponse>(`/api/login-methods/link/${provider}`, undefined, {
                    method: "POST",
                });
                if (result.alreadyLinked) {
                    await loadLoginMethods();
                    setNotice(`${provider === "osu" ? "osu!" : "Discord"} is already linked to this Hanami account.`);
                    setAction(null);
                    return;
                }
                if (!result.url) throw new Error("Missing provider authorization URL");
                window.location.assign(result.url);
            } catch (requestError) {
                setError(readIdentityActionError(requestError, provider, "link"));
                setAction(null);
            }
        },
        [loadLoginMethods],
    );

    useEffect(() => {
        const parameters = new URLSearchParams(location.search);
        if (parameters.has("linkError")) {
            setError(
                readOAuthError(location.search) ?? "That provider could not be linked. It may already belong to another Hanami account.",
            );
            navigate("/profile", { replace: true });
            return;
        }
        if (parameters.get("link") !== "osu" || automaticLinkStarted.current || identityLoading) return;
        automaticLinkStarted.current = true;
        navigate("/profile", { replace: true });
        if (!loginMethodState?.loginMethods.some((method) => method.provider === "osu")) void handleLink("osu");
    }, [handleLink, identityLoading, loginMethodState, location.search, navigate]);

    async function handleUnlink(provider: LoginMethod["provider"]) {
        const label = provider === "osu" ? "osu!" : "Discord";
        if (!window.confirm(`Unlink ${label}? You will continue to use the same Hanami account through your other login method.`)) return;

        setAction(`unlinking-${provider}`);
        setError(null);
        setNotice(null);
        try {
            await fetchJson<UnlinkResponse>(`/api/login-methods/${provider}`, undefined, {
                method: "DELETE",
            });
            await loadLoginMethods();
            await loadBotPreferences();
            setNotice(`${label} was unlinked. Your canonical Hanami account was not deleted.`);
        } catch (requestError) {
            setError(readIdentityActionError(requestError, provider, "unlink"));
        } finally {
            setAction(null);
        }
    }

    async function handleSaveSettings(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        if (!settings) return;

        setAction("saving");
        setError(null);
        setSaved(false);
        try {
            await fetchJson<{ success: boolean }>("/api/bot-preferences", undefined, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(settings),
            });
            setSaved(true);
        } catch {
            setError("Bot preferences could not be saved.");
        } finally {
            setAction(null);
        }
    }

    return (
        <AccountPage>
            <AccountLayout className={profileLayoutClass}>
                <header className={profileHeadingClass}>
                    <Eyebrow>Account</Eyebrow>
                    <h1>Your Hanami account</h1>
                    <p>Manage the login methods attached to one canonical Hanami user ID.</p>
                </header>

                {error && (
                    <p className={cn(formMessageClass, "text-danger")} role="alert">
                        <AlertCircle aria-hidden="true" />
                        {error}
                    </p>
                )}
                {notice && (
                    <p className={cn(formMessageClass, "text-success")} role="status">
                        {notice}
                    </p>
                )}

                <IdentitySection
                    linkedAccounts={loginMethodState?.linkedAccounts ?? []}
                    loginMethodCount={loginMethodState?.loginMethodCount ?? 0}
                    loading={identityLoading}
                    action={action}
                    onLink={handleLink}
                    onUnlink={handleUnlink}
                />

                {botPreferencesAvailable && (
                    <BotPreferencesSection
                        settings={settings}
                        loading={settingsLoading}
                        action={action}
                        saved={saved}
                        onSettingsChange={setSettings}
                        onSubmit={handleSaveSettings}
                    />
                )}

                <AccountPrivacyAside />
            </AccountLayout>
        </AccountPage>
    );
}

function readIdentityActionError(error: unknown, provider: LoginMethod["provider"], action: "link" | "unlink"): string {
    if (error instanceof ApiError && error.message) return error.message;
    const label = provider === "osu" ? "osu!" : "Discord";
    return `${label} could not be ${action === "link" ? "linked" : "unlinked"}.`;
}
