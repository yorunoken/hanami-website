import { ArrowRight, Cookie, FileText, Scale, ShieldCheck, Trash2 } from "lucide-react";

import { routes } from "@/client/routes/paths";
import { siteContainerClass } from "@/components/layout/styles";
import { Eyebrow } from "@/components/marketing";
import { PrefetchLink } from "@/components/navigation/prefetch-link";
import { legalContacts, legalDocuments, legalMetadata, legalServices } from "@/data/legal";

const taskCards = [
    {
        title: "Understand how data is used",
        description: "See what data each service collects and why.",
        path: routes.legalPrivacy,
        icon: ShieldCheck,
    },
    {
        title: "Read the service rules",
        description: "Read the rules for accounts, acceptable use, and third-party services.",
        path: routes.legalTerms,
        icon: Scale,
    },
    {
        title: "Manage cookies and browser storage",
        description: "See which cookies and browser storage the services use and how to manage them.",
        path: routes.legalCookies,
        icon: Cookie,
    },
    {
        title: "Delete data or make a privacy request",
        description: "Delete your account or contact us about other personal data.",
        path: routes.legalDataDeletion,
        icon: Trash2,
    },
] as const;

export default function LegalIndex() {
    return (
        <main className={`${siteContainerClass} py-[clamp(4rem,8vw,7rem)]`}>
            <header className="max-w-215 border-b border-border-strong pb-[clamp(2.5rem,5vw,4rem)]">
                <Eyebrow>Legal center</Eyebrow>
                <h1 className="max-w-190 text-[clamp(2.7rem,6vw,5.1rem)] leading-[0.96] tracking-[-0.06em]">Privacy and terms</h1>
                <p className="mt-6 max-w-[66ch] text-base leading-[1.7] text-muted">
                    Read how Hanami Web, Hanami Bot, and osu!guessr use your data, the rules for using them, and how to delete your account.
                    These pages also cover Companion and Map Analyzer.
                </p>
            </header>

            <section className="mt-12 max-w-260" aria-labelledby="legal-tasks-title">
                <div className="flex items-end justify-between gap-5 pb-4">
                    <div>
                        <p className="font-mono text-[0.68rem] tracking-[0.08em] text-quiet uppercase">Start here</p>
                        <h2 className="mt-2 text-2xl tracking-[-0.03em]" id="legal-tasks-title">
                            What are you looking for?
                        </h2>
                    </div>
                    <FileText className="hidden size-5 text-accent-soft min-[601px]:block" aria-hidden="true" />
                </div>
                <div className="grid gap-px overflow-hidden rounded-md border border-border bg-border min-[601px]:grid-cols-2">
                    {taskCards.map(({ title, description, path, icon: Icon }) => (
                        <PrefetchLink
                            className="group flex min-h-42 flex-col justify-between bg-surface/65 p-5 no-underline transition-colors hover:bg-surface min-[821px]:p-6"
                            key={path}
                            to={path}
                            prefetch="intent"
                        >
                            <span>
                                <Icon className="size-5 text-accent-soft" aria-hidden="true" />
                                <span className="mt-5 block text-[1.05rem] font-medium text-white">{title}</span>
                                <span className="mt-2 block max-w-[42ch] text-[0.82rem] leading-[1.6] text-muted">{description}</span>
                            </span>
                            <span className="mt-6 inline-flex items-center gap-2 text-[0.78rem] text-white">
                                Read more{" "}
                                <ArrowRight
                                    className="size-3.5 transition-transform duration-160 group-hover:translate-x-1"
                                    aria-hidden="true"
                                />
                            </span>
                        </PrefetchLink>
                    ))}
                </div>
            </section>

            <section
                className="mt-16 grid max-w-260 gap-10 border-t border-border-strong pt-8 min-[821px]:grid-cols-[1.1fr_0.9fr] min-[821px]:gap-16"
                aria-labelledby="legal-coverage-title"
            >
                <div>
                    <p className="font-mono text-[0.68rem] tracking-[0.08em] text-quiet uppercase">Coverage</p>
                    <h2 className="mt-2 text-2xl tracking-[-0.03em]" id="legal-coverage-title">
                        Services covered
                    </h2>
                    <p className="mt-4 max-w-[58ch] text-[0.88rem] leading-[1.7] text-muted">
                        Each service uses different data. These policies explain what each one stores and which account links are currently
                        supported.
                    </p>
                </div>
                <ul className="grid gap-4">
                    {legalServices.map((service) => (
                        <li className="flex items-center justify-between gap-4 py-1" key={service.name}>
                            <span className="text-[0.86rem] text-white">{service.name}</span>
                            <span className="text-right text-[0.74rem] text-muted">{service.status}</span>
                        </li>
                    ))}
                </ul>
            </section>

            <section className="mt-16 max-w-260 border-t border-border-strong pt-8" aria-labelledby="legal-contact-title">
                <div className="grid gap-8 min-[821px]:grid-cols-[1fr_2fr] min-[821px]:gap-16">
                    <div>
                        <p className="font-mono text-[0.68rem] tracking-[0.08em] text-quiet uppercase">Need help?</p>
                        <h2 className="mt-2 text-2xl tracking-[-0.03em]" id="legal-contact-title">
                            Contact and account actions
                        </h2>
                    </div>
                    <dl className="grid gap-5 min-[601px]:grid-cols-3">
                        <div>
                            <dt className="text-[0.72rem] text-quiet">Privacy and personal data</dt>
                            <dd className="mt-2 text-[0.82rem] wrap-anywhere text-white">
                                <a
                                    className="underline decoration-white/45 underline-offset-[0.25em]"
                                    href={`mailto:${legalContacts.privacy}`}
                                >
                                    {legalContacts.privacy}
                                </a>
                            </dd>
                        </div>
                        <div>
                            <dt className="text-[0.72rem] text-quiet">Terms and legal notices</dt>
                            <dd className="mt-2 text-[0.82rem] wrap-anywhere text-white">
                                <a
                                    className="underline decoration-white/45 underline-offset-[0.25em]"
                                    href={`mailto:${legalContacts.legal}`}
                                >
                                    {legalContacts.legal}
                                </a>
                            </dd>
                        </div>
                        <div>
                            <dt className="text-[0.72rem] text-quiet">Signed-in account deletion</dt>
                            <dd className="mt-2 text-[0.82rem] text-white">
                                <PrefetchLink
                                    className="underline decoration-white/45 underline-offset-[0.25em]"
                                    to={routes.profilePrivacy}
                                >
                                    Open account privacy
                                </PrefetchLink>
                            </dd>
                        </div>
                    </dl>
                </div>
            </section>

            <section className="mt-16 max-w-260 border-t border-border pt-8" aria-labelledby="all-documents-title">
                <div className="flex items-end justify-between gap-5">
                    <div>
                        <p className="font-mono text-[0.68rem] tracking-[0.08em] text-quiet uppercase">Reference</p>
                        <h2 className="mt-2 text-2xl tracking-[-0.03em]" id="all-documents-title">
                            All notices
                        </h2>
                    </div>
                    <span className="text-[0.75rem] text-muted">Effective {legalMetadata.effectiveDate}</span>
                </div>
                <div className="mt-5 grid gap-3 min-[601px]:grid-cols-2">
                    {legalDocuments.map((document) => (
                        <PrefetchLink
                            className="group flex items-center justify-between gap-4 rounded-md border border-border bg-surface/35 p-4 no-underline transition-colors hover:border-border-strong hover:bg-surface"
                            key={document.path}
                            to={document.path}
                            prefetch="intent"
                        >
                            <span>
                                <span className="block text-[0.86rem] font-medium text-white">{document.title}</span>
                                <span className="mt-1 block text-[0.76rem] leading-[1.5] text-muted">{document.description}</span>
                            </span>
                            <ArrowRight
                                className="size-4 shrink-0 text-muted transition-transform duration-160 group-hover:translate-x-1 group-hover:text-white"
                                aria-hidden="true"
                            />
                        </PrefetchLink>
                    ))}
                </div>
            </section>
        </main>
    );
}
