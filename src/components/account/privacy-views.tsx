import { AlertCircle, Loader2 } from "lucide-react";
import type { FormEvent, ReactNode } from "react";

import { routes } from "@/client/routes/paths";
import { AuthLayout } from "@/components/account/account-shell";
import { Eyebrow } from "@/components/marketing";
import { PrefetchLink } from "@/components/navigation/prefetch-link";
import { dangerOutlineActionClass, formMessageClass, loadingInlineClass, primaryActionClass } from "@/components/ui/action-styles";
import { legalContacts } from "@/data/legal";
import { cn } from "@/lib/utils";

const confirmationPhrase = "DELETE MY HANAMI ACCOUNT";
const terminalPanelClass =
    "w-[min(100%,720px)] py-[clamp(2rem,6vw,3.5rem)] [&>h1]:text-[clamp(2.25rem,6vw,4rem)] [&>h1]:leading-[1.02] [&>h1]:tracking-[-0.055em] [&>p]:max-w-[68ch] [&>p]:text-[0.88rem] [&>p]:leading-[1.7] [&>p]:text-muted [&_a:not(.primary-action)]:text-white [&_a:not(.primary-action)]:underline [&_a:not(.primary-action)]:decoration-white/45 [&_a:not(.primary-action)]:underline-offset-[0.25em]";

export function ConfirmationPage({
    ready,
    verifying,
    deleting,
    challengePresent,
    phrase,
    error,
    onPhraseChange,
    onSubmit,
}: {
    ready: boolean;
    verifying: boolean;
    deleting: boolean;
    challengePresent: boolean;
    phrase: string;
    error: string | null;
    onPhraseChange: (value: string) => void;
    onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
    return (
        <AuthLayout>
            <section className={terminalPanelClass} aria-labelledby="confirm-title">
                <Eyebrow>Permanent action</Eyebrow>
                <h1 id="confirm-title">Delete your Hanami account</h1>
                {verifying ? (
                    <p className={cn(loadingInlineClass, "justify-start")} role="status">
                        <Loader2 aria-hidden="true" /> Verifying the recent Discord sign-in…
                    </p>
                ) : !challengePresent || !ready ? (
                    <>
                        {error && <ErrorMessage>{error}</ErrorMessage>}
                        <p>This confirmation is missing, expired, or was opened under a different account.</p>
                        <PrefetchLink className={cn(primaryActionClass, "primary-action mt-6")} to={routes.profilePrivacy}>
                            Start again
                        </PrefetchLink>
                    </>
                ) : (
                    <form className="mt-6" onSubmit={onSubmit}>
                        <p className="text-[0.88rem] leading-[1.7] text-muted">
                            Your website identity, provider link, sessions, and Discord-keyed Hanami Bot link and preferences will be
                            deleted immediately. Discord, osu!, and a separate osu!guessr profile are not deleted.
                        </p>
                        <p className="mt-3 text-[0.82rem] leading-[1.65] text-muted">
                            For other data, contact <a href={`mailto:${legalContacts.privacy}`}>{legalContacts.privacy}</a>.
                        </p>
                        {error && <ErrorMessage>{error}</ErrorMessage>}
                        <label className="mt-8 grid gap-[0.7rem]">
                            <span className="text-[0.82rem] font-bold text-[#e8e2e9]">
                                Type <code className="font-mono text-accent-soft">{confirmationPhrase}</code> to continue
                            </span>
                            <input
                                className="min-h-12.5 w-full rounded-sm border border-border-strong bg-surface px-[0.9rem] text-white focus-visible:border-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent/30"
                                type="text"
                                value={phrase}
                                onChange={(event) => onPhraseChange(event.target.value)}
                                autoComplete="off"
                                spellCheck="false"
                                aria-describedby="confirmation-help"
                            />
                        </label>
                        <p id="confirmation-help" className="mt-3 text-[0.78rem] leading-[1.6] text-muted">
                            The phrase is checked by the server. Surrounding and repeated whitespace is normalized; capitalization must
                            match.
                        </p>
                        <button
                            className={cn(primaryActionClass, dangerOutlineActionClass, "mt-6")}
                            type="submit"
                            disabled={!phrase.trim() || deleting}
                        >
                            {deleting ? "Deleting account…" : "Delete account now"}
                        </button>
                    </form>
                )}
            </section>
        </AuthLayout>
    );
}

export function ErrorMessage({ children }: { children: ReactNode }) {
    return (
        <p className={cn(formMessageClass, "text-danger")} role="alert">
            <AlertCircle aria-hidden="true" /> {children}
        </p>
    );
}
