import { AlertCircle } from "lucide-react";
import { useEffect, useRef, useState, type FormEvent } from "react";

import { fetchJson } from "@/client/lib/fetch-json";
import { AccountLayout, AccountPage, AccountPageIntro, profileLayoutClass } from "@/components/account/account-shell";
import { useAuthenticatedSession } from "@/components/account/authenticated-route";
import {
    AccountPrivacyAside,
    BotPreferencesSection,
    IdentitySection,
    type LoginMethod,
    type ProfileAction,
} from "@/components/account/profile-sections";
import { formMessageClass } from "@/components/ui/action-styles";
import { cn } from "@/lib/utils";
import type { BotSettings } from "@/lib/bot-settings";

export default function Profile() {
    const session = useAuthenticatedSession();
    const [loginMethods, setLoginMethods] = useState<LoginMethod[]>([]);
    const [settings, setSettings] = useState<BotSettings | null>(null);
    const [linkLoading, setLinkLoading] = useState(true);
    const [settingsLoading, setSettingsLoading] = useState(true);
    const [action, setAction] = useState<ProfileAction>(null);
    const [error, setError] = useState<string | null>(null);
    const [saved, setSaved] = useState(false);
    const botLinkAttempted = useRef(false);

    useEffect(() => {
        const controller = new AbortController();
        setLinkLoading(true);
        setError(null);

        void fetchJson<{ loginMethods: LoginMethod[] }>("/api/account/providers", controller.signal)
            .then(({ loginMethods: methods }) => {
                setLoginMethods(methods);
            })
            .catch((requestError: unknown) => {
                if (requestError instanceof DOMException && requestError.name === "AbortError") return;
                setError("Linked identities could not be loaded. Please refresh and try again.");
            })
            .finally(() => {
                if (!controller.signal.aborted) setLinkLoading(false);
            });

        return () => controller.abort();
    }, [session.user.id]);

    const discordLinked = loginMethods.some((method) => method.provider === "discord");

    useEffect(() => {
        if (linkLoading) return;
        if (!discordLinked) {
            setSettings(null);
            setSettingsLoading(false);
            return;
        }

        const controller = new AbortController();
        setSettingsLoading(true);
        void fetchJson<BotSettings>("/api/osu-link/settings", controller.signal)
            .then((botSettings) => {
                setSettings(botSettings);
            })
            .catch((requestError: unknown) => {
                if (requestError instanceof DOMException && requestError.name === "AbortError") return;
                setError("Bot preferences could not be loaded. Please refresh and try again.");
            })
            .finally(() => {
                if (!controller.signal.aborted) setSettingsLoading(false);
            });

        return () => controller.abort();
    }, [discordLinked, linkLoading, session.user.id]);

    useEffect(() => {
        if (linkLoading || botLinkAttempted.current || new URLSearchParams(window.location.search).get("link") !== "osu") return;
        if (!loginMethods.some((method) => method.provider === "osu")) {
            botLinkAttempted.current = true;
            void handleLinkProvider("osu");
        }
    }, [linkLoading, loginMethods]);

    async function handleLinkProvider(provider: "discord" | "osu") {
        setAction({ type: "linking", provider });
        setError(null);
        try {
            const data = await fetchJson<{ url?: string }>(`/api/account/providers/${provider}/link`, undefined, { method: "POST" });
            if (!data.url) throw new Error("Missing authorization URL");
            window.location.assign(data.url);
        } catch {
            setError(`${provider === "osu" ? "osu!" : "Discord"} authorization could not be started.`);
            setAction(null);
        }
    }

    async function handleUnlinkProvider(provider: "discord" | "osu") {
        if (
            !window.confirm(
                `Disconnect this ${provider === "osu" ? "osu!" : "Discord"} account? Your other linked provider will remain available.`,
            )
        )
            return;

        setAction({ type: "unlinking", provider });
        setError(null);
        try {
            await fetchJson<{ unlinked: boolean }>(`/api/account/providers/${provider}`, undefined, {
                method: "DELETE",
            });
            setLoginMethods((methods) => methods.filter((method) => method.provider !== provider));
        } catch {
            setError(`The ${provider === "osu" ? "osu!" : "Discord"} account could not be disconnected.`);
        } finally {
            setAction(null);
        }
    }

    async function handleSaveSettings(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        if (!settings) return;

        setAction({ type: "saving" });
        setError(null);
        setSaved(false);
        try {
            await fetchJson<{ success: boolean }>("/api/osu-link/settings", undefined, {
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

    const displayName = session.user.name || "Hanami user";

    return (
        <AccountPage>
            <AccountLayout className={cn(profileLayoutClass, "max-w-280")}>
                <AccountPageIntro
                    eyebrow="Hanami account"
                    title={displayName}
                    description="Manage your linked accounts and bot preferences."
                />

                {error && (
                    <p className={cn(formMessageClass, "text-danger")} role="alert">
                        <AlertCircle aria-hidden="true" />
                        {error}
                    </p>
                )}

                <IdentitySection
                    loginMethods={loginMethods}
                    currentUser={{ name: displayName, image: session.user.image }}
                    loading={linkLoading}
                    action={action}
                    onLink={handleLinkProvider}
                    onUnlink={handleUnlinkProvider}
                />

                <div className={cn("mt-8 grid items-start gap-6", discordLinked && "min-[1000px]:grid-cols-[minmax(0,1fr)_17rem]")}>
                    {discordLinked && (
                        <BotPreferencesSection
                            settings={settings}
                            loading={settingsLoading}
                            action={action}
                            saved={saved}
                            onSettingsChange={setSettings}
                            onSubmit={handleSaveSettings}
                        />
                    )}

                    <AccountPrivacyAside compact={discordLinked} />
                </div>
            </AccountLayout>
        </AccountPage>
    );
}
