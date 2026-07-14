import { ShieldCheck } from "lucide-react";
import { useEffect, useState, type FormEvent } from "react";
import { useLocation, useNavigate } from "react-router-dom";

import { fetchJson } from "@/client/lib/fetch-json";
import { signIn, useSession } from "@/client/lib/auth";
import { routes } from "@/client/routes/paths";
import {
  AccountLayout,
  AccountPage,
  accountHeadingClass,
  sectionHeadingClass,
} from "@/components/account/account-shell";
import {
  ActionDefinition,
  ConfirmationPage,
  DeletionReceipt,
  ErrorMessage,
  PrivacyShell,
  RequestStatus,
  SignedOutPrivacy,
} from "@/components/account/privacy-views";
import { Eyebrow } from "@/components/marketing";
import { PrefetchLink } from "@/components/navigation/prefetch-link";
import {
  dangerOutlineActionClass,
  primaryActionClass,
} from "@/components/ui/action-styles";
import { cn } from "@/lib/utils";
import { legalContacts } from "@/data/legal";
import type { PublicDeletionRequest } from "@/server/deletion-requests/domain";

interface AccountSummary {
  discordAccountId: string | null;
  request: PublicDeletionRequest | null;
}

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
  const { data: session, isPending } = useSession();
  const location = useLocation();
  const navigate = useNavigate();
  const isConfirmation = location.pathname.endsWith("/confirm");
  const [challenge, setChallenge] = useState<string | null>(() =>
    readChallengeFromHash(location.hash),
  );
  const [summary, setSummary] = useState<AccountSummary | null>(null);
  const [osuLink, setOsuLink] = useState<OsuLinkStatus | null>(null);
  const [osuLinkUnavailable, setOsuLinkUnavailable] = useState(false);
  const [loading, setLoading] = useState(true);
  const [action, setAction] = useState<
    "starting" | "verifying" | "submitting" | "cancelling" | null
  >(null);
  const [confirmationReady, setConfirmationReady] = useState(false);
  const [typedPhrase, setTypedPhrase] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [receipt, setReceipt] = useState<PublicDeletionRequest | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const hashChallenge = readChallengeFromHash(location.hash);
    if (hashChallenge) setChallenge(hashChallenge);
    if (location.hash) window.history.replaceState(null, "", location.pathname);
  }, [location.hash, location.pathname]);

  useEffect(() => {
    if (!session || isConfirmation) {
      setLoading(false);
      return;
    }

    const controller = new AbortController();
    setLoading(true);
    setError(null);
    Promise.allSettled([
      fetchJson<AccountSummary>("/api/deletion-requests", controller.signal),
      fetchJson<OsuLinkStatus>("/api/osu-link/status", controller.signal),
    ]).then(([summaryResult, osuResult]) => {
      if (controller.signal.aborted) return;
      if (summaryResult.status === "fulfilled") {
        setSummary(summaryResult.value);
      } else {
        setError("Your deletion-request status could not be loaded.");
      }
      if (osuResult.status === "fulfilled") {
        setOsuLink(osuResult.value);
        setOsuLinkUnavailable(false);
      } else {
        setOsuLinkUnavailable(true);
      }
      setLoading(false);
    });

    return () => controller.abort();
  }, [isConfirmation, session]);

  useEffect(() => {
    if (!isConfirmation || !session || !challenge || confirmationReady) return;
    let active = true;
    setAction("verifying");
    setError(null);
    fetchJson<{ ready: boolean }>(
      "/api/deletion-requests/reauth/complete",
      undefined,
      jsonRequest({ challenge }),
    )
      .then(() => {
        if (active) setConfirmationReady(true);
      })
      .catch(() => {
        if (active)
          setError(
            "Fresh Discord authentication could not be confirmed. Start the request again.",
          );
      })
      .finally(() => {
        if (active) setAction(null);
      });
    return () => {
      active = false;
    };
  }, [challenge, confirmationReady, isConfirmation, session]);

  async function startDeletionRequest() {
    setAction("starting");
    setError(null);
    try {
      const result = await fetchJson<StartResponse>(
        "/api/deletion-requests/reauth/start",
        undefined,
        jsonRequest({}),
      );
      if (result.reauthenticationRequired) {
        await signIn.social({
          provider: "discord",
          callbackURL: result.confirmationPath,
        });
        return;
      }
      navigate(result.confirmationPath);
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "The deletion request could not be started.",
      );
      setAction(null);
    }
  }

  async function submitDeletionRequest(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!challenge) return;
    setAction("submitting");
    setError(null);
    try {
      const result = await fetchJson<{
        request: PublicDeletionRequest;
        sessionsRevoked: boolean;
      }>(
        "/api/deletion-requests",
        undefined,
        jsonRequest({ challenge, confirmationPhrase: typedPhrase }),
      );
      setReceipt(result.request);
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "The deletion request could not be submitted.",
      );
    } finally {
      setAction(null);
    }
  }

  async function cancelDeletionRequest() {
    if (
      !window.confirm(
        "Cancel this deletion request? No deletion work will continue from this request.",
      )
    )
      return;
    setAction("cancelling");
    setError(null);
    try {
      const result = await fetchJson<{ request: PublicDeletionRequest }>(
        "/api/deletion-requests/cancel",
        undefined,
        jsonRequest({}),
      );
      setSummary((current) =>
        current ? { ...current, request: result.request } : current,
      );
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "The request could not be cancelled.",
      );
    } finally {
      setAction(null);
    }
  }

  if (receipt)
    return (
      <DeletionReceipt
        request={receipt}
        copied={copied}
        onCopy={() => {
          void navigator.clipboard
            .writeText(receipt.requestReference)
            .then(() => setCopied(true));
        }}
      />
    );
  if (isPending) return <PrivacyShell loading />;
  if (!session) return <SignedOutPrivacy />;
  if (isConfirmation)
    return (
      <ConfirmationPage
        ready={confirmationReady}
        verifying={action === "verifying"}
        submitting={action === "submitting"}
        challengePresent={Boolean(challenge)}
        phrase={typedPhrase}
        error={error}
        onPhraseChange={setTypedPhrase}
        onSubmit={submitDeletionRequest}
      />
    );

  return (
    <AccountPage>
      <AccountLayout className="max-w-[1040px]">
        <header className={accountHeadingClass}>
          <Eyebrow>Account privacy</Eyebrow>
          <h1>Deletion requests</h1>
          <p>
            Submit and track one coordinated request for data Hanami controls.
            This is separate from signing out or disconnecting osu!.
          </p>
          <nav
            className="mt-6 flex flex-wrap gap-x-6 gap-y-[0.65rem] text-[0.82rem] [&_a]:text-muted [&_a]:underline-offset-[0.25em]"
            aria-label="Account sections"
          >
            <PrefetchLink to={routes.profile}>
              Account and preferences
            </PrefetchLink>
            <span className="text-white" aria-current="page">
              Privacy and deletion
            </span>
          </nav>
        </header>

        {error && <ErrorMessage>{error}</ErrorMessage>}

        <section className="mt-16" aria-labelledby="your-identity">
          <div className={sectionHeadingClass}>
            <h2 id="your-identity">Identity used for this request</h2>
            <p>
              Public usernames or numeric IDs alone do not verify a request.
            </p>
          </div>
          <dl className="grid grid-cols-1 min-[601px]:grid-cols-2 [&>div]:min-h-[150px] [&>div]:border-b [&>div]:border-border [&>div]:py-6 min-[601px]:[&>div:first-child]:border-r min-[601px]:[&>div:first-child]:pr-8 min-[601px]:[&>div:last-child]:pl-8 [&_dd]:mt-[0.55rem] [&_dd]:mb-1 [&_dd]:text-[1.1rem] [&_dd]:font-bold [&_dd]:text-white [&_dt]:font-mono [&_dt]:text-[0.68rem] [&_dt]:tracking-[0.08em] [&_dt]:text-quiet [&_dt]:uppercase [&_span]:text-[0.78rem] [&_span]:leading-[1.6] [&_span]:text-muted">
            <div>
              <dt>Discord sign-in</dt>
              <dd>{session.user.name || "Discord user"}</dd>
              <span>
                {loading
                  ? "Checking account ID…"
                  : summary?.discordAccountId
                    ? `Discord ID ${summary.discordAccountId}`
                    : "Discord account ID unavailable"}
              </span>
            </div>
            <div>
              <dt>Linked osu! account</dt>
              <dd>
                {osuLinkUnavailable
                  ? "Status unavailable"
                  : osuLink?.linked
                    ? osuLink.username || `osu! ID ${osuLink.banchoId}`
                    : "Not linked"}
              </dd>
              <span>
                {osuLinkUnavailable
                  ? "The bot database could not be reached; this does not prevent a deletion request."
                  : osuLink?.linked
                    ? `osu! ID ${osuLink.banchoId}`
                    : "Disconnecting an osu! link is not account deletion."}
              </span>
            </div>
          </dl>
        </section>

        {summary?.request ? (
          <RequestStatus
            request={summary.request}
            cancelling={action === "cancelling"}
            onCancel={cancelDeletionRequest}
          />
        ) : (
          <section
            className="mt-16 grid grid-cols-1 items-end gap-x-12 gap-y-5 border-y border-border-strong py-10 min-[821px]:grid-cols-[minmax(0,1fr)_auto]"
            aria-labelledby="request-title"
          >
            <div>
              <Eyebrow>Manual coordinated processing</Eyebrow>
              <h2 className="text-2xl tracking-[-0.035em]" id="request-title">
                Request account deletion
              </h2>
              <p className="max-w-[68ch] text-[0.88rem] leading-[1.7] text-muted">
                Hanami will record the request and an operator will review data
                held across the website, Hanami Bot, osu!guessr, temporary Redis
                state, logs, diagnostics, analytics, and backups where
                applicable. Full automatic cross-service deletion is not
                implemented.
              </p>
              <ul className="mt-5 grid grid-cols-1 gap-x-8 gap-y-[0.55rem] pl-[1.1rem] text-[0.78rem] leading-[1.55] text-muted min-[601px]:grid-cols-2">
                <li>Hanami website identity, provider link, and sessions</li>
                <li>
                  Hanami Bot account link, settings, caches, and relevant logs
                </li>
                <li>
                  osu!guessr profile, games, reports, badges, and API keys
                </li>
                <li>Temporary Redis state and service rate-limit records</li>
                <li>
                  Identifiable diagnostics, Discord error messages, analytics
                  limitations, and backups
                </li>
              </ul>
            </div>
            <button
              className={cn(
                primaryActionClass,
                dangerOutlineActionClass,
                "min-[821px]:w-fit",
              )}
              type="button"
              onClick={startDeletionRequest}
              disabled={loading || action === "starting"}
            >
              <ShieldCheck aria-hidden="true" />
              {action === "starting"
                ? "Preparing verification…"
                : "Request account deletion"}
            </button>
            <p className="text-[0.78rem] leading-[1.6] text-muted min-[821px]:col-span-2">
              A Discord sign-in from the last 15 minutes is required. Submitting
              revokes your Hanami website sessions, but it does not delete your
              Discord or osu! accounts.
            </p>
          </section>
        )}

        <section
          className="mt-16 [&>p]:max-w-[68ch] [&>p]:text-[0.88rem] [&>p]:leading-[1.7] [&>p]:text-muted [&>p_a]:text-white [&>p_a]:underline-offset-[0.25em]"
          aria-labelledby="actions-title"
        >
          <div className={sectionHeadingClass}>
            <h2 id="actions-title">What each action does</h2>
          </div>
          <dl>
            <ActionDefinition
              term="Sign out"
              detail="Ends a Hanami web session. It does not remove account or product data."
            />
            <ActionDefinition
              term="Disconnect osu!"
              detail="Clears the Discord-to-osu! link used by Hanami Bot. It does not delete stored Hanami data or either provider account."
            />
            <ActionDefinition
              term="Request Hanami deletion"
              detail="Starts manual review of the web identity, Bot settings, osu!guessr data, temporary state, and relevant logs. Records may be deleted or anonymized; justified security, legal, and backup copies may remain temporarily."
            />
            <ActionDefinition
              term="Delete provider data"
              detail="Discord and osu! control their own accounts and provider-side records. Use their privacy controls for that data."
            />
          </dl>
          <p>
            Cannot sign in, lost Discord access, or need access, correction,
            restriction, or objection instead? Email{" "}
            <a href={`mailto:${legalContacts.privacy}`}>
              {legalContacts.privacy}
            </a>
            . Additional verification may be required; never send passwords,
            tokens, cookies, API keys, or backup codes.
          </p>
        </section>
      </AccountLayout>
    </AccountPage>
  );
}

function jsonRequest(body: Record<string, unknown>): RequestInit {
  return {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  };
}

function readChallengeFromHash(hash: string): string | null {
  if (!hash.startsWith("#")) return null;
  const value = new URLSearchParams(hash.slice(1)).get("challenge");
  return value && value.length >= 32 && value.length <= 128 ? value : null;
}
