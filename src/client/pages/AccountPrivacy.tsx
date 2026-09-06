import { useEffect, useState, type FormEvent } from "react";
import { useLocation, useNavigate } from "react-router-dom";

import { reauthenticateWithDiscord } from "@/client/lib/auth";
import { readOAuthError } from "@/client/lib/auth-navigation";
import { clearPendingDeletionChallenge, prepareDeletionReauthentication, readPendingDeletionChallenge } from "@/client/lib/deletion-reauth";
import { fetchJson } from "@/client/lib/fetch-json";
import { routes } from "@/client/routes/paths";
import { AccountLayout, AccountPage, AccountPageIntro, AccountPanel, AccountPanelHeader } from "@/components/account/account-shell";
import { useAuthenticatedSession } from "@/components/account/authenticated-route";
import { ConfirmationPage, ErrorMessage } from "@/components/account/privacy-views";
import { PrefetchLink } from "@/components/navigation/prefetch-link";
import { dangerOutlineActionClass, primaryActionClass } from "@/components/ui/action-styles";
import { legalContacts } from "@/data/legal";
import { cn } from "@/lib/utils";

interface OsuLinkStatus {
    linked: boolean;
    banchoId?: string;
    username?: string;
}

interface StartResponse {
    reauthenticationRequired: boolean;
    confirmationPath: string;
}

export default function AccountPrivacy() {
    const session = useAuthenticatedSession();
    const location = useLocation();
    const navigate = useNavigate();
    const isConfirmation = location.pathname.endsWith("/confirm");
    const [challenge, setChallenge] = useState<string | null>(
        () => readChallengeFromHash(location.hash) ?? (isConfirmation ? readPendingDeletionChallenge() : null),
    );
    const [osuLink, setOsuLink] = useState<OsuLinkStatus | null>(null);
    const [osuLinkUnavailable, setOsuLinkUnavailable] = useState(false);
    const [loading, setLoading] = useState(true);
    const [action, setAction] = useState<"starting" | "verifying" | "deleting" | null>(null);
    const [confirmationReady, setConfirmationReady] = useState(false);
    const [typedPhrase, setTypedPhrase] = useState("");
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const hashChallenge = readChallengeFromHash(location.hash);
        if (hashChallenge) setChallenge(hashChallenge);
        if (isConfirmation && (hashChallenge || challenge)) clearPendingDeletionChallenge();
        if (location.hash) window.history.replaceState(null, "", location.pathname);
    }, [challenge, isConfirmation, location.hash, location.pathname]);

    useEffect(() => {
        if (isConfirmation) {
            setLoading(false);
            return;
        }

        const controller = new AbortController();
        setLoading(true);
        fetchJson<OsuLinkStatus>("/api/osu-link/status", controller.signal)
            .then((result) => {
                setOsuLink(result);
                setOsuLinkUnavailable(false);
            })
            .catch(() => setOsuLinkUnavailable(true))
            .finally(() => setLoading(false));
        return () => controller.abort();
    }, [isConfirmation, session.user.id]);

    useEffect(() => {
        const oauthError = readOAuthError(location.search);
        if (!oauthError || !new URLSearchParams(location.search).has("reauth")) return;

        clearPendingDeletionChallenge();
        setError(oauthError);
        navigate(routes.profilePrivacy, { replace: true });
    }, [location.search, navigate]);

    useEffect(() => {
        if (!isConfirmation || !challenge || confirmationReady) return;
        let active = true;
        setAction("verifying");
        setError(null);
        fetchJson<{ ready: boolean }>("/api/account-deletion/reauth/complete", undefined, jsonRequest({ challenge }))
            .then(() => {
                if (active) setConfirmationReady(true);
            })
            .catch(() => {
                if (active) setError("Fresh Discord authentication could not be confirmed. Start again from account privacy.");
            })
            .finally(() => {
                if (active) setAction(null);
            });
        return () => {
            active = false;
        };
    }, [challenge, confirmationReady, isConfirmation, session.user.id]);

    async function startAccountDeletion() {
        setAction("starting");
        setError(null);
        try {
            const result = await fetchJson<StartResponse>("/api/account-deletion/reauth/start", undefined, jsonRequest({}));
            if (result.reauthenticationRequired) {
                const callbackURL = prepareDeletionReauthentication(result.confirmationPath);
                try {
                    await reauthenticateWithDiscord(callbackURL, `${routes.profilePrivacy}?reauth=1`);
                } catch (reauthenticationError) {
                    clearPendingDeletionChallenge();
                    throw reauthenticationError;
                }
                return;
            }
            navigate(result.confirmationPath);
        } catch (requestError) {
            setError(requestError instanceof Error ? requestError.message : "Account deletion could not be started.");
            setAction(null);
        }
    }

    async function deleteAccount(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        if (!challenge) return;
        setAction("deleting");
        setError(null);
        try {
            await fetchJson<{ deleted: true }>(
                "/api/account-deletion",
                undefined,
                jsonRequest({ challenge, confirmationPhrase: typedPhrase }, "DELETE"),
            );
            window.location.replace(`${routes.login}?deleted=1`);
        } catch (requestError) {
            setError(requestError instanceof Error ? requestError.message : "The account could not be deleted.");
            setAction(null);
        }
    }

    if (isConfirmation) {
        return (
            <ConfirmationPage
                ready={confirmationReady}
                verifying={action === "verifying"}
                deleting={action === "deleting"}
                challengePresent={Boolean(challenge)}
                phrase={typedPhrase}
                error={error}
                onPhraseChange={setTypedPhrase}
                onSubmit={deleteAccount}
            />
        );
    }

    return (
        <AccountPage>
            <AccountLayout className="max-w-280 py-[clamp(3rem,6vw,5rem)]">
                <AccountPageIntro
                    eyebrow="Hanami account"
                    title="Account privacy"
                    description="View your account data, request help, or delete your Hanami account."
                >
                    <nav
                        className="mt-6 flex flex-wrap gap-x-6 gap-y-[0.65rem] text-[0.82rem] [&_a]:text-muted [&_a]:underline [&_a]:decoration-white/40 [&_a]:underline-offset-[0.25em]"
                        aria-label="Account sections"
                    >
                        <PrefetchLink to={routes.profile}>Account and preferences</PrefetchLink>
                        <span className="text-white" aria-current="page">
                            Privacy and deletion
                        </span>
                    </nav>
                </AccountPageIntro>

                {error && <ErrorMessage>{error}</ErrorMessage>}

                <div className="mt-8 grid gap-6 min-[960px]:grid-cols-[minmax(0,1.15fr)_minmax(18rem,0.85fr)] min-[960px]:grid-rows-[auto_1fr]">
                    <AccountPanel
                        className="min-[960px]:row-span-2 min-[960px]:grid min-[960px]:grid-rows-subgrid min-[960px]:gap-0"
                        aria-labelledby="identity-title"
                    >
                        <AccountPanelHeader
                            id="identity-title"
                            title="Account data"
                            description="The Hanami account and connected osu! data affected by deletion."
                        />
                        <dl className="grid gap-8 px-[clamp(1.35rem,3vw,2rem)] py-5 [&_dd]:mt-2 [&_dd]:text-base [&_dd]:font-bold [&_dd]:text-white [&_dt]:font-mono [&_dt]:text-[0.68rem] [&_dt]:tracking-[0.08em] [&_dt]:text-quiet [&_dt]:uppercase [&_small]:mt-1 [&_small]:block [&_small]:text-[0.78rem] [&_small]:leading-[1.55] [&_small]:text-muted">
                            <div>
                                <dt>Current Hanami account</dt>
                                <dd>{session.user.name || "Hanami user"}</dd>
                                <small>Your Hanami profile, linked accounts, and sign-in sessions</small>
                            </div>
                            <div>
                                <dt>Connected osu! data</dt>
                                <dd>
                                    {loading
                                        ? "Checking…"
                                        : osuLinkUnavailable
                                          ? "Status unavailable"
                                          : osuLink?.linked
                                            ? osuLink.username || `osu! ID ${osuLink.banchoId}`
                                            : "Not connected"}
                                </dd>
                                <small>{osuLink?.linked ? `osu! ID ${osuLink.banchoId}` : "No linked osu! identity was found"}</small>
                            </div>
                        </dl>
                    </AccountPanel>

                    <AccountPanel
                        className="border-danger/35 min-[960px]:row-span-2 min-[960px]:grid min-[960px]:grid-rows-subgrid min-[960px]:gap-0"
                        aria-labelledby="delete-title"
                    >
                        <AccountPanelHeader
                            id="delete-title"
                            title="Delete account"
                            description="Permanently remove this Hanami account and the linked data listed here."
                        />
                        <div className="p-[clamp(1.35rem,3vw,2rem)]">
                            <p className="text-[0.84rem] leading-[1.7] text-muted">
                                This deletes your Hanami profile, linked sign-in methods, sessions, and Hanami Bot preferences. It cannot be
                                undone.
                            </p>
                            <button
                                className={cn(primaryActionClass, dangerOutlineActionClass, "mt-6 w-full justify-center")}
                                type="button"
                                onClick={startAccountDeletion}
                                disabled={loading || action === "starting"}
                            >
                                {action === "starting" ? "Preparing verification…" : "Delete account"}
                            </button>
                            <p className="mt-5 text-[0.74rem] leading-[1.6] text-quiet">
                                Your Discord and osu! accounts are not deleted. A recent Discord sign-in and typed confirmation may be
                                required.
                            </p>
                        </div>
                    </AccountPanel>
                </div>

                <AccountPanel className="mt-6" aria-labelledby="requests-title">
                    <AccountPanelHeader
                        id="requests-title"
                        title="Other privacy requests"
                        description="For access, correction, restriction, objection, or an account you can no longer reach."
                    />
                    <p className="p-[clamp(1.35rem,3vw,2rem)] text-[0.84rem] leading-[1.7] text-muted [&_a]:text-white [&_a]:underline [&_a]:decoration-white/45 [&_a]:underline-offset-[0.22em]">
                        Email <a href={`mailto:${legalContacts.privacy}`}>{legalContacts.privacy}</a> for help with data outside immediate
                        account deletion. Never send passwords, tokens, cookies, API keys, or backup codes. Read the{" "}
                        <PrefetchLink to={routes.legalDataDeletion}>data deletion details</PrefetchLink> for what is deleted from each
                        service.
                    </p>
                </AccountPanel>
            </AccountLayout>
        </AccountPage>
    );
}

function jsonRequest(body: Record<string, unknown>, method: "POST" | "DELETE" = "POST"): RequestInit {
    return {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
    };
}

function readChallengeFromHash(hash: string): string | null {
    if (!hash.startsWith("#")) return null;
    const value = new URLSearchParams(hash.slice(1)).get("challenge");
    return value && value.length >= 32 && value.length <= 128 ? value : null;
}
