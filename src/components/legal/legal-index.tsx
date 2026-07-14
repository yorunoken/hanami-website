import { ArrowRight } from "lucide-react";
import { routes } from "@/client/routes/paths";
import { siteContainerClass } from "@/components/layout/styles";
import { Eyebrow } from "@/components/marketing";
import { PrefetchLink } from "@/components/navigation/prefetch-link";
import { legalContacts } from "@/data/legal";

const documents = [
  [
    "Privacy policy",
    "/legal/privacy",
    "What information each Hanami service processes, why, where it goes, and which facts still need owner review.",
  ],
  [
    "Terms of service",
    "/legal/terms",
    "Rules for the hosted services, third-party platforms, unfinished products, and open-source boundaries.",
  ],
  [
    "Cookie policy",
    "/legal/cookies",
    "Authentication cookies, browser storage, external fonts, analytics, and advertising found in code.",
  ],
  [
    "Data deletion",
    "/legal/data-deletion",
    "The difference between sign-out, unlinking, provider deletion, and a full Hanami request.",
  ],
] as const;

export default function LegalIndex() {
  return (
    <main className={`${siteContainerClass} py-[clamp(4rem,8vw,7rem)]`}>
      <header className="max-w-[900px] border-b border-border-strong pb-[clamp(2.5rem,5vw,4rem)]">
        <Eyebrow>Legal center</Eyebrow>
        <h1 className="text-[clamp(2.7rem,6vw,5.1rem)] leading-none tracking-[-0.06em]">
          Policies grounded in the current implementation.
        </h1>
        <p className="mt-[1.35rem] max-w-[68ch] text-base leading-[1.7] text-muted">
          These documents cover the Hanami website, Hanami Bot, osu!guessr, and
          the current boundaries of Companion and Map Analyzer.
        </p>
        <p className="mt-[1.8rem] max-w-[76ch] border-l-2 border-accent pl-4 text-[0.82rem] leading-[1.65] text-[#c9c1ca] [&_code]:font-mono [&_code]:text-[0.88em] [&_code]:font-semibold [&_code]:text-[#ffd0e3]">
          <strong>Draft notice:</strong> the documents are not ready to become
          effective until the operator resolves every{" "}
          <code>REQUIRES OWNER CONFIRMATION</code> item and obtains appropriate
          legal review.
        </p>
      </header>
      <section
        className="mt-12 max-w-[1040px]"
        aria-labelledby="legal-contact-title"
      >
        <h2 className="mb-4 text-xl" id="legal-contact-title">
          Contact and requests
        </h2>
        <dl className="grid grid-cols-1 border-y border-border min-[821px]:grid-cols-3 [&>div]:border-b [&>div]:border-border [&>div]:py-4 last:[&>div]:border-b-0 min-[821px]:[&>div]:border-r min-[821px]:[&>div]:border-b-0 min-[821px]:[&>div]:p-[1.2rem] min-[821px]:[&>div:first-child]:pl-0 min-[821px]:[&>div:last-child]:border-r-0 [&_a]:text-[0.82rem] [&_a]:text-white [&_a]:underline-offset-[0.25em] [&_dd]:mt-[0.45rem] [&_dd]:[overflow-wrap:anywhere] [&_dt]:text-[0.72rem] [&_dt]:text-quiet">
          <div>
            <dt>Privacy and personal data</dt>
            <dd>
              <a href={`mailto:${legalContacts.privacy}`}>
                {legalContacts.privacy}
              </a>
            </dd>
          </div>
          <div>
            <dt>Terms and legal notices</dt>
            <dd>
              <a href={`mailto:${legalContacts.legal}`}>
                {legalContacts.legal}
              </a>
            </dd>
          </div>
          <div>
            <dt>Signed-in deletion requests</dt>
            <dd>
              <PrefetchLink to={routes.profilePrivacy}>
                Open account privacy
              </PrefetchLink>
            </dd>
          </div>
        </dl>
      </section>
      <div className="mt-16 max-w-[1040px] border-t border-border-strong">
        {documents.map(([title, to, description], index) => (
          <PrefetchLink
            className="group grid grid-cols-[2rem_1fr] items-center gap-6 border-b border-border py-[1.6rem] no-underline min-[601px]:grid-cols-[3rem_1fr_auto]"
            key={to}
            to={to}
            prefetch="intent"
          >
            <span
              className="font-mono text-[0.68rem] text-quiet"
              aria-hidden="true"
            >
              {String(index + 1).padStart(2, "0")}
            </span>
            <div>
              <h2 className="text-[1.3rem]">{title}</h2>
              <p className="mt-[0.45rem] max-w-[70ch] text-[0.84rem] leading-[1.6] text-muted">
                {description}
              </p>
            </div>
            <ArrowRight
              className="hidden size-[18px] transition-transform duration-[160ms] group-hover:translate-x-1 min-[601px]:block"
              aria-hidden="true"
            />
          </PrefetchLink>
        ))}
      </div>
    </main>
  );
}
