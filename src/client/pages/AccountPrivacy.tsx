import { useEffect, useState, type FormEvent } from "react";
import { useLocation, useNavigate } from "react-router-dom";

import { reauthenticateWithProvider } from "@/client/lib/auth";
import { readOAuthError } from "@/client/lib/auth-navigation";
import { clearPendingDeletionChallenge, prepareDeletionReauthentication, readPendingDeletionChallenge } from "@/client/lib/deletion-reauth";
import { fetchJson } from "@/client/lib/fetch-json";
import { routes } from "@/client/routes/paths";
import { AccountLayout, AccountPage, profileHeadingClass, sectionHeadingClass } from "@/components/account/account-shell";
import { useAuthenticatedSession } from "@/components/account/authenticated-route";
import { ConfirmationPage, ErrorMessage } from "@/components/account/privacy-views";
import type { IdentityResponse } from "@/components/account/profile-sections";
import { Eyebrow } from "@/components/marketing";
import { PrefetchLink } from "@/components/navigation/prefetch-link";
import { dangerOutlineActionClass, primaryActionClass } from "@/components/ui/action-styles";
import { legalContacts } from "@/data/legal";
import { cn } from "@/lib/utils";

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
    const [identityState, setIdentityState] = useState<IdentityResponse | null>(null);
    const [identitiesUnavailable, setIdentitiesUnavailable] = useState(false);
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
        fetchJson<IdentityResponse>("/api/identities", controller.signal)
            .then((result) => {
                setIdentityState(result);
                setIdentitiesUnavailable(false);
            })
            .catch(() => setIdentitiesUnavailable(true))
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
                if (active) setError("Fresh provider authentication could not be confirmed. Start again from account privacy.");
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
                const provider = identityState?.identities.find((identity) => identity.canAuthenticate)?.provider;
                if (!provider) throw new Error("A linked login method is required before account deletion can continue.");
                const callbackURL = prepareDeletionReauthentication(result.confirmationPath);
                try {
                    await reauthenticateWithProvider(provider, callbackURL, `${routes.profilePrivacy}?reauth=1`);
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
            <AccountLayout className="max-w-260 py-[clamp(3rem,6vw,5rem)]">
                <header className={profileHeadingClass}>
                    <Eyebrow>Account</Eyebrow>
                    <h1>Privacy and account</h1>
                    <p>Review the identity attached to this account or permanently delete the data this website can remove directly.</p>
                    <nav
                        className="mt-6 flex flex-wrap gap-x-6 gap-y-[0.65rem] text-[0.82rem] [&_a]:text-muted [&_a]:underline [&_a]:decoration-white/40 [&_a]:underline-offset-[0.25em]"
                        aria-label="Account sections"
                    >
                        <PrefetchLink to={routes.profile}>Account and preferences</PrefetchLink>
                        <span className="text-white" aria-current="page">
                            Privacy and deletion
                        </span>
                    </nav>
                </header>

                {error && <ErrorMessage>{error}</ErrorMessage>}

                <section className="mt-12" aria-labelledby="identity-title">
                    <div className={sectionHeadingClass}>
                        <h2 id="identity-title">Signed-in identity</h2>
                        <p>Every provider below belongs to the canonical account affected by deletion.</p>
                    </div>
                    <dl className="grid grid-cols-1 min-[601px]:grid-cols-2 [&_dd]:mt-2 [&_dd]:text-base [&_dd]:font-bold [&_dd]:text-white [&_dt]:font-mono [&_dt]:text-[0.68rem] [&_dt]:tracking-[0.08em] [&_dt]:text-quiet [&_dt]:uppercase [&_small]:mt-1 [&_small]:block [&_small]:text-[0.78rem] [&_small]:leading-[1.55] [&_small]:text-muted [&>div]:border-b [&>div]:border-border [&>div]:py-6 min-[601px]:[&>div:first-child]:border-r min-[601px]:[&>div:first-child]:pr-8 min-[601px]:[&>div:last-child]:pl-8">
                        {loading || identitiesUnavailable ? (
                            <div>
                                <dt>Linked providers</dt>
                                <dd>{loading ? "Checking…" : "Status unavailable"}</dd>
                                <small>Canonical Hanami user ID {session.user.id}</small>
                            </div>
                        ) : (
                            identityState?.identities.map((identity) => (
                                <div key={identity.provider}>
                                    <dt>{identity.provider === "osu" ? "osu! login" : "Discord login"}</dt>
                                    <dd>{identity.displayName || identity.username || "Linked provider"}</dd>
                                    <small>Provider user ID {identity.providerUserId}</small>
                                </div>
                            ))
                        )}
                    </dl>
                </section>

                <section
                    className="mt-12 grid grid-cols-1 items-end gap-x-12 gap-y-6 border-b border-border-strong pb-10 min-[821px]:grid-cols-[minmax(0,1fr)_auto]"
                    aria-labelledby="delete-title"
                >
                    <div>
                        <Eyebrow>Permanent action</Eyebrow>
                        <h2 className="text-2xl tracking-[-0.035em]" id="delete-title">
                            Delete account
                        </h2>
                        <p className="mt-3 max-w-[68ch] text-[0.88rem] leading-[1.7] text-muted">
                            Immediately deletes your canonical Hanami account, linked login methods, sessions, and Companion credentials.
                            Discord-keyed Bot data is also queued for deletion when a Discord identity exists. This cannot be undone.
                        </p>
                    </div>
                    <button
                        className={cn(primaryActionClass, dangerOutlineActionClass, "min-[821px]:w-fit")}
                        type="button"
                        onClick={startAccountDeletion}
                        disabled={loading || action === "starting"}
                    >
                        {action === "starting" ? "Preparing verification…" : "Delete account"}
                    </button>
                    <p className="max-w-[80ch] text-[0.78rem] leading-[1.6] text-muted min-[821px]:col-span-2">
                        This does not delete your Discord or osu! provider accounts, a separate osu!guessr profile, or records that must
                        remain temporarily in operational logs where justified. The repositories do not document a production backup
                        schedule. A provider sign-in from the last 15 minutes and typed confirmation are required.
                    </p>
                </section>

                <section className="mt-12 grid grid-cols-1 gap-4 pb-8 min-[821px]:grid-cols-2 min-[821px]:gap-10">
                    <div>
                        <h2 className="text-lg tracking-[-0.025em]">Other privacy requests</h2>
                        <p className="mt-2 text-[0.82rem] leading-[1.6] text-muted">
                            Access, correction, restriction, objection, or lost access.
                        </p>
                    </div>
                    <p className="text-[0.82rem] leading-[1.65] text-muted [&_a]:text-white [&_a]:underline [&_a]:decoration-white/45 [&_a]:underline-offset-[0.22em]">
                        Email <a href={`mailto:${legalContacts.privacy}`}>{legalContacts.privacy}</a> if you cannot sign in or need help
                        with data outside the immediate deletion scope. Never send passwords, tokens, cookies, API keys, or backup codes.
                        See the <PrefetchLink to={routes.legalDataDeletion}>data deletion details</PrefetchLink>.
                    </p>
                </section>
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
