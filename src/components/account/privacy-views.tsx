import { AlertCircle, CheckCircle2, Copy, Loader2 } from "lucide-react";
import type { FormEvent, ReactNode } from "react";

import { routes } from "@/client/routes/paths";
import { AuthLayout, AuthPanel } from "@/components/account/account-shell";
import { Eyebrow } from "@/components/marketing";
import { PrefetchLink } from "@/components/navigation/prefetch-link";
import {
    dangerOutlineActionClass,
    formMessageClass,
    loadingInlineClass,
    primaryActionClass,
    textButtonClass,
} from "@/components/ui/action-styles";
import { cn } from "@/lib/utils";
import { legalContacts } from "@/data/legal";
import type { PublicDeletionRequest } from "@/server/deletion-requests/domain";

const confirmationPhrase = "DELETE MY HANAMI ACCOUNT";
const terminalPanelClass =
    "w-[min(100%,720px)] border-y border-border-strong py-[clamp(2rem,6vw,3.5rem)] [&>h1]:text-[clamp(2.25rem,6vw,4rem)] [&>h1]:leading-[1.02] [&>h1]:tracking-[-0.055em] [&>p]:max-w-[68ch] [&>p]:text-[0.88rem] [&>p]:leading-[1.7] [&>p]:text-muted [&_a:not(.primary-action)]:text-white [&_a:not(.primary-action)]:underline-offset-[0.25em]";

export function ConfirmationPage({
    ready,
    verifying,
    submitting,
    challengePresent,
    phrase,
    error,
    onPhraseChange,
    onSubmit,
}: {
    ready: boolean;
    verifying: boolean;
    submitting: boolean;
    challengePresent: boolean;
    phrase: string;
    error: string | null;
    onPhraseChange: (value: string) => void;
    onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
    return (
        <PrivacyShell>
            <section className={terminalPanelClass} aria-labelledby="confirm-title">
                <Eyebrow>Final confirmation</Eyebrow>
                <h1 id="confirm-title">Confirm your deletion request</h1>
                {verifying ? (
                    <p className={cn(loadingInlineClass, "justify-start")} role="status">
                        <Loader2 aria-hidden="true" /> Verifying the recent Discord sign-in…
                    </p>
                ) : !challengePresent || !ready ? (
                    <>
                        {error && <ErrorMessage>{error}</ErrorMessage>}
                        <p>This confirmation link is missing, expired, or was opened under a different account.</p>
                        <PrefetchLink className={cn(primaryActionClass, "primary-action mt-6")} to={routes.profilePrivacy}>
                            Start again
                        </PrefetchLink>
                    </>
                ) : (
                    <form className="mt-6" onSubmit={onSubmit}>
                        <p>
                            This records a request for operator review across relevant Hanami services. It does not immediately delete every
                            record. Some data may be anonymized; justified security, abuse-prevention, legal, or backup records may remain
                            temporarily. Discord and osu! data controlled by those providers must be managed with them.
                        </p>
                        <p>
                            Questions can be sent to <a href={`mailto:${legalContacts.privacy}`}>{legalContacts.privacy}</a>.
                        </p>
                        {error && <ErrorMessage>{error}</ErrorMessage>}
                        <label className="mt-8 grid gap-[0.7rem]">
                            <span className="text-[0.82rem] font-bold text-[#e8e2e9]">
                                Type <code className="font-mono text-accent-soft">{confirmationPhrase}</code> to continue
                            </span>
                            <input
                                className="min-h-[50px] w-full rounded-sm border border-border-strong bg-surface px-[0.9rem] text-white focus-visible:border-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent/30"
                                type="text"
                                value={phrase}
                                onChange={(event) => onPhraseChange(event.target.value)}
                                autoComplete="off"
                                spellCheck="false"
                                aria-describedby="confirmation-help"
                            />
                        </label>
                        <p id="confirmation-help" className="text-[0.78rem] leading-[1.6] text-muted">
                            The phrase is checked by the server. Reasonable surrounding and repeated whitespace is normalized; the words and
                            capitalization must otherwise match.
                        </p>
                        <button
                            className={cn(primaryActionClass, dangerOutlineActionClass, "mt-6")}
                            type="submit"
                            disabled={!phrase.trim() || submitting}
                        >
                            {submitting ? "Submitting request…" : "Submit deletion request"}
                        </button>
                    </form>
                )}
            </section>
        </PrivacyShell>
    );
}

export function RequestStatus({
    request,
    cancelling,
    onCancel,
}: {
    request: PublicDeletionRequest;
    cancelling: boolean;
    onCancel: () => void;
}) {
    return (
        <section
            className="mt-16 border-y border-border-strong py-10 [&_a]:text-white [&_a]:underline-offset-[0.25em] [&>p]:max-w-[68ch] [&>p]:text-[0.88rem] [&>p]:leading-[1.7] [&>p]:text-muted"
            aria-labelledby="request-status-title"
        >
            <div className="flex items-baseline justify-between gap-8">
                <Eyebrow>Current request</Eyebrow>
                <h2 className="text-2xl tracking-[-0.035em]" id="request-status-title">
                    {statusLabel(request.status)}
                </h2>
            </div>
            <dl className="my-8 grid grid-cols-1 max-[600px]:divide-y max-[600px]:divide-border min-[601px]:grid-cols-3 min-[601px]:divide-x min-[601px]:divide-border [&_dd]:mt-[0.55rem] [&_dd]:text-[0.82rem] [&_dd]:[overflow-wrap:anywhere] [&_dd]:text-[#e6e1e7] [&_dt]:font-mono [&_dt]:text-[0.68rem] [&_dt]:tracking-[0.08em] [&_dt]:text-quiet [&_dt]:uppercase [&>div]:py-5 min-[601px]:[&>div]:px-6 min-[601px]:[&>div:first-child]:pl-0 min-[601px]:[&>div:last-child]:pr-0">
                <div>
                    <dt>Reference</dt>
                    <dd>{request.requestReference}</dd>
                </div>
                <div>
                    <dt>Submitted</dt>
                    <dd>{formatDate(request.requestedAt)}</dd>
                </div>
                <div>
                    <dt>Last updated</dt>
                    <dd>{formatDate(request.updatedAt)}</dd>
                </div>
            </dl>
            <p>{request.furtherAction}</p>
            {request.canCancel && (
                <button className={cn(textButtonClass, "text-danger")} type="button" onClick={onCancel} disabled={cancelling}>
                    {cancelling ? "Cancelling…" : "Cancel request"}
                </button>
            )}
            <p className="!text-[0.78rem] !leading-[1.6]">
                Contact <a href={`mailto:${legalContacts.privacy}`}>{legalContacts.privacy}</a> and include the reference if you need help.
            </p>
        </section>
    );
}

export function DeletionReceipt({ request, copied, onCopy }: { request: PublicDeletionRequest; copied: boolean; onCopy: () => void }) {
    return (
        <PrivacyShell>
            <section className={terminalPanelClass} aria-labelledby="receipt-title">
                <CheckCircle2 className="mb-6 size-7 text-success" aria-hidden="true" />
                <Eyebrow>Request recorded</Eyebrow>
                <h1 id="receipt-title">Keep your request reference</h1>
                <p>
                    Your request is pending manual coordinated processing. All current Hanami website sessions have been revoked. Sign in
                    again if you need to check or cancel it while cancellation remains available.
                </p>
                <div className="my-8 flex items-center justify-between gap-4 border-y border-border py-4">
                    <code className="font-mono text-[1.05rem] [overflow-wrap:anywhere] text-accent-soft">{request.requestReference}</code>
                    <button
                        className="inline-flex items-center gap-[0.4rem] border-0 bg-transparent text-white [&_svg]:size-[15px]"
                        type="button"
                        onClick={onCopy}
                    >
                        <Copy aria-hidden="true" /> {copied ? "Copied" : "Copy"}
                    </button>
                </div>
                <p>
                    Submitted {formatDate(request.requestedAt)}. For help, email{" "}
                    <a href={`mailto:${legalContacts.privacy}`}>{legalContacts.privacy}</a>.
                </p>
                <PrefetchLink className={cn(primaryActionClass, "primary-action mt-6")} to={routes.login}>
                    Return to sign in
                </PrefetchLink>
            </section>
        </PrivacyShell>
    );
}

export function SignedOutPrivacy() {
    return (
        <PrivacyShell>
            <AuthPanel>
                <Eyebrow>Account privacy</Eyebrow>
                <h1>Sign in to view or request deletion.</h1>
                <p>
                    Hanami verifies signed-in requests with Discord OAuth. If you cannot access the connected account, email{" "}
                    <a href={`mailto:${legalContacts.privacy}`}>{legalContacts.privacy}</a>.
                </p>
                <PrefetchLink className={cn(primaryActionClass, "mt-8 w-full")} to={routes.login}>
                    Sign in with Discord
                </PrefetchLink>
            </AuthPanel>
        </PrivacyShell>
    );
}

export function PrivacyShell({ children, loading = false }: { children?: ReactNode; loading?: boolean }) {
    return (
        <AuthLayout>
            {loading ? (
                <p className={loadingInlineClass} role="status">
                    <Loader2 aria-hidden="true" /> Loading account privacy…
                </p>
            ) : (
                children
            )}
        </AuthLayout>
    );
}

export function ActionDefinition({ term, detail }: { term: string; detail: string }) {
    return (
        <div className="grid grid-cols-1 gap-2 border-b border-border py-5 min-[601px]:grid-cols-[minmax(130px,0.32fr)_1fr] min-[601px]:gap-8">
            <dt className="font-bold text-white">{term}</dt>
            <dd className="text-[0.84rem] leading-[1.65] text-muted">{detail}</dd>
        </div>
    );
}

export function ErrorMessage({ children }: { children: ReactNode }) {
    return (
        <p className={cn(formMessageClass, "text-danger")} role="alert">
            <AlertCircle aria-hidden="true" /> {children}
        </p>
    );
}

function formatDate(value: string): string {
    return new Intl.DateTimeFormat(undefined, {
        dateStyle: "medium",
        timeStyle: "short",
    }).format(new Date(value));
}

function statusLabel(status: PublicDeletionRequest["status"]): string {
    switch (status) {
        case "pending":
            return "Pending review";
        case "in_review":
            return "In review";
        case "processing":
            return "Processing";
        case "completed":
            return "Completed";
        case "rejected":
            return "Not approved";
        case "cancelled":
            return "Cancelled";
        case "failed":
            return "Needs operator attention";
    }
}
