import { ArrowLeft, Loader2, MessageCircle } from "lucide-react";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useLocation, useNavigate } from "react-router-dom";

import { claimPendingAttempt, signInWithDiscord, useSession } from "@/client/lib/auth";
import { getAuthenticatedLoginDestination, readOAuthError, readReturnTo } from "@/client/lib/auth-navigation";
import { routes } from "@/client/routes/paths";
import { AccountPage } from "@/components/account/account-shell";
import { siteContainerClass } from "@/components/layout/styles";
import { Eyebrow } from "@/components/marketing";
import { PrefetchLink } from "@/components/navigation/prefetch-link";
import { primaryActionClass, textButtonClass } from "@/components/ui/action-styles";
import { cn } from "@/lib/utils";

export default function Login() {
    const { data: session, isPending: isSessionPending } = useSession();
    const location = useLocation();
    const navigate = useNavigate();
    const returnTo = useMemo(() => readReturnTo(location.search), [location.search]);
    const oauthError = useMemo(() => readOAuthError(location.search), [location.search]);
    const accountDeleted = useMemo(() => new URLSearchParams(location.search).get("deleted") === "1", [location.search]);
    const initiationPending = useRef(false);
    const [isRedirecting, setIsRedirecting] = useState(false);
    const [localError, setLocalError] = useState<string | null>(null);

    useEffect(() => {
        const destination = getAuthenticatedLoginDestination(isSessionPending, Boolean(session), returnTo);
        if (destination) navigate(destination, { replace: true });
    }, [isSessionPending, navigate, returnTo, session]);

    async function handleSignIn() {
        if (!claimPendingAttempt(initiationPending)) return;
        setIsRedirecting(true);
        setLocalError(null);

        try {
            await signInWithDiscord(returnTo);
        } catch {
            initiationPending.current = false;
            setLocalError("Discord sign-in could not be started. Check your connection and try again.");
            setIsRedirecting(false);
        }
    }

    if (session) return null;

    if (isSessionPending) {
        return (
            <LoginScene>
                <LoginPending />
            </LoginScene>
        );
    }

    return (
        <LoginScene>
            <LoginPanel
                error={localError || oauthError}
                status={accountDeleted ? "Your Hanami account was deleted." : null}
                isRedirecting={isRedirecting}
                onSignIn={handleSignIn}
            />
        </LoginScene>
    );
}

function LoginScene({ children }: { children: ReactNode }) {
    return (
        <AccountPage>
            <main className="relative isolate min-h-[calc(100svh-72px)] overflow-hidden border-b border-border max-[900px]:min-h-[min(780px,calc(100svh-72px))]">
                <div
                    className="absolute inset-0 bg-[linear-gradient(115deg,rgba(235,118,170,0.055),transparent_42%),linear-gradient(180deg,transparent_68%,rgba(0,0,0,0.18))]"
                    aria-hidden="true"
                />
                <div
                    className={cn(
                        siteContainerClass,
                        "relative grid min-h-[calc(100svh-72px)] grid-cols-[minmax(0,0.9fr)_minmax(320px,0.58fr)] items-center gap-[clamp(3rem,8vw,8rem)] py-[clamp(4.5rem,9vw,7.5rem)] max-[900px]:min-h-[min(780px,calc(100svh-72px))] max-[900px]:grid-cols-1 max-[900px]:items-start max-[900px]:gap-0 max-[900px]:pt-[clamp(5rem,12vh,7rem)] max-[900px]:pb-[clamp(5rem,10vh,7rem)] max-[600px]:pt-[clamp(4.5rem,11vh,5.75rem)] max-[600px]:pb-14",
                    )}
                >
                    {children}
                    <div
                        className="pointer-events-none relative h-full min-h-125 self-end overflow-hidden max-[900px]:absolute max-[900px]:-right-24 max-[900px]:bottom-0 max-[900px]:h-96 max-[900px]:min-h-0 max-[900px]:w-90 max-[900px]:border-0 max-[900px]:opacity-14 max-[600px]:-right-32 max-[600px]:h-80 max-[600px]:w-80"
                        aria-hidden="true"
                    >
                        <div className="relative size-full motion-safe:animate-[reveal-up_550ms_150ms_cubic-bezier(0.2,0.7,0.2,1)_both]">
                            <img
                                className="absolute right-[-8%] bottom-[-5%] h-auto w-[min(35vw,500px)] max-w-none opacity-68 max-[900px]:right-0 max-[900px]:bottom-[-8%] max-[900px]:w-full max-[900px]:opacity-100"
                                src="/hanami-transparent.png"
                                alt=""
                                width="565"
                                height="542"
                            />
                        </div>
                    </div>
                </div>
            </main>
        </AccountPage>
    );
}

export function LoginPanel({
    error,
    status = null,
    isRedirecting,
    onSignIn,
}: {
    error: string | null;
    status?: string | null;
    isRedirecting: boolean;
    onSignIn: () => void;
}) {
    return (
        <section
            className="relative z-10 max-w-155 motion-safe:animate-[reveal-up_420ms_60ms_cubic-bezier(0.2,0.7,0.2,1)_both]"
            aria-labelledby="sign-in-title"
        >
            <Eyebrow>Hanami account</Eyebrow>
            <h1
                className="text-[clamp(3rem,7vw,5.4rem)] leading-[0.96] tracking-[-0.065em] text-white max-[600px]:text-[clamp(2.7rem,13vw,4rem)]"
                id="sign-in-title"
            >
                Sign in to Hanami
            </h1>
            <p className="mt-6 max-w-[54ch] text-[clamp(1rem,1.5vw,1.12rem)] leading-[1.7] text-muted">
                Discord is Hanami’s sign-in provider. We use your account ID and the profile details Discord makes available.
            </p>

            {status && (
                <div className="mt-7 border-l-2 border-success py-1 pl-4" role="status">
                    <p className="font-mono text-[0.65rem] tracking-[0.08em] text-success uppercase">Account deleted</p>
                    <p className="mt-1.5 max-w-[54ch] text-[0.84rem] leading-[1.6] text-[#d6cfd7]">{status}</p>
                </div>
            )}

            {error && (
                <div className="mt-7 border-l-2 border-danger py-1 pl-4" role="alert">
                    <p className="font-mono text-[0.65rem] tracking-[0.08em] text-danger uppercase">Sign-in paused</p>
                    <p className="mt-1.5 max-w-[54ch] text-[0.84rem] leading-[1.6] text-[#d6cfd7]">{error}</p>
                </div>
            )}

            <button
                className={cn(primaryActionClass, "mt-8 w-[min(100%,23rem)]")}
                type="button"
                onClick={onSignIn}
                disabled={isRedirecting}
            >
                {isRedirecting ? (
                    <Loader2 className="animate-[spin_900ms_linear_infinite] motion-reduce:animate-none" aria-hidden="true" />
                ) : (
                    <MessageCircle aria-hidden="true" />
                )}
                {isRedirecting ? "Opening Discord…" : "Sign in with Discord"}
            </button>

            <div className="mt-8 flex flex-wrap items-center gap-x-7 gap-y-4 border-t border-border pt-5">
                <PrefetchLink className={textButtonClass} to={routes.home} prefetch="none">
                    <ArrowLeft aria-hidden="true" /> Back to the public site
                </PrefetchLink>
            </div>
        </section>
    );
}

function LoginPending() {
    return (
        <section className="relative z-10 max-w-155" role="status" aria-label="Checking sign-in status" aria-busy="true">
            <span className="sr-only">Checking sign-in status</span>
            <div className="h-3 w-29 animate-pulse bg-accent/25 motion-reduce:animate-none" aria-hidden="true" />
            <div className="mt-8 h-17 w-[min(100%,30rem)] animate-pulse bg-white/[0.055] motion-reduce:animate-none" aria-hidden="true" />
            <div className="mt-6 h-5 w-[min(86%,26rem)] animate-pulse bg-white/[0.04] motion-reduce:animate-none" aria-hidden="true" />
            <div className="mt-3 h-5 w-[min(70%,21rem)] animate-pulse bg-white/[0.04] motion-reduce:animate-none" aria-hidden="true" />
            <div
                className="mt-9 h-12 w-[min(100%,23rem)] animate-pulse rounded-sm bg-white/[0.07] motion-reduce:animate-none"
                aria-hidden="true"
            />
        </section>
    );
}
