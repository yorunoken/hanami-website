import { AlertCircle } from "lucide-react";
import { useEffect, useState, type FormEvent } from "react";

import { fetchJson } from "@/client/lib/fetch-json";
import { AccountLayout, AccountPage, accountHeadingClass } from "@/components/account/account-shell";
import { useAuthenticatedSession } from "@/components/account/authenticated-route";
import {
    AccountPrivacyAside,
    BotPreferencesSection,
    IdentitySection,
    type BotSettings,
    type LinkStatus,
    type ProfileAction,
} from "@/components/account/profile-sections";
import { Eyebrow } from "@/components/marketing";
import { formMessageClass } from "@/components/ui/action-styles";
import { getDiscordContactEmail } from "@/lib/discord-identity";
import { cn } from "@/lib/utils";

export default function Profile() {
    const session = useAuthenticatedSession();
    const [linkStatus, setLinkStatus] = useState<LinkStatus | null>(null);
    const [settings, setSettings] = useState<BotSettings | null>(null);
    const [loading, setLoading] = useState(true);
    const [action, setAction] = useState<ProfileAction>(null);
    const [error, setError] = useState<string | null>(null);
    const [saved, setSaved] = useState(false);

    useEffect(() => {
        const controller = new AbortController();
        setLoading(true);
        setError(null);

        Promise.all([
            fetchJson<LinkStatus>("/api/osu-link/status", controller.signal),
            fetchJson<BotSettings>("/api/osu-link/settings", controller.signal),
        ])
            .then(([status, botSettings]) => {
                setLinkStatus(status);
                setSettings(botSettings);
            })
            .catch((requestError: unknown) => {
                if (requestError instanceof DOMException && requestError.name === "AbortError") return;
                setError("Account settings could not be loaded. Please refresh and try again.");
            })
            .finally(() => {
                if (!controller.signal.aborted) setLoading(false);
            });

        return () => controller.abort();
    }, [session.user.id]);

    async function handleLinkOsu() {
        setAction("linking");
        setError(null);
        try {
            const data = await fetchJson<{ url?: string }>("/api/auth");
            if (!data.url) throw new Error("Missing authorization URL");
            window.location.assign(data.url);
        } catch {
            setError("osu! authorization could not be started.");
            setAction(null);
        }
    }

    async function handleUnlinkOsu() {
        if (
            !window.confirm(
                "Disconnect this osu! account? This removes the ID link, but does not delete either provider account or your Hanami web account.",
            )
        )
            return;

        setAction("unlinking");
        setError(null);
        try {
            await fetchJson<{ success: boolean }>("/api/osu-link/unlink", undefined, {
                method: "DELETE",
            });
            setLinkStatus({ linked: false });
        } catch {
            setError("The osu! account could not be disconnected.");
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

    const displayName = session.user.name || "Discord user";

    return (
        <AccountPage>
            <AccountLayout>
                <header className={accountHeadingClass}>
                    <Eyebrow>Account</Eyebrow>
                    <h1>Linked accounts and bot preferences</h1>
                    <p>Manage the Discord identity used for sign-in and the optional osu! ID stored by Hanami Bot.</p>
                </header>

                {error && (
                    <p className={cn(formMessageClass, "text-danger")} role="alert">
                        <AlertCircle aria-hidden="true" />
                        {error}
                    </p>
                )}

                <IdentitySection
                    discordUser={{
                        name: displayName,
                        email: getDiscordContactEmail(session.user.email),
                        image: session.user.image,
                    }}
                    linkStatus={linkStatus}
                    loading={loading}
                    action={action}
                    onLink={handleLinkOsu}
                    onUnlink={handleUnlinkOsu}
                />

                <BotPreferencesSection
                    settings={settings}
                    loading={loading}
                    action={action}
                    saved={saved}
                    onSettingsChange={setSettings}
                    onSubmit={handleSaveSettings}
                />

                <AccountPrivacyAside />
            </AccountLayout>
        </AccountPage>
    );
}
