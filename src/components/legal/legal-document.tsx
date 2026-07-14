import type { ReactNode } from "react";
import { routes } from "@/client/routes/paths";
import { siteContainerClass } from "@/components/layout/styles";
import { PrefetchLink } from "@/components/navigation/prefetch-link";
import { legalMetadata } from "@/data/legal";
import { cn } from "@/lib/utils";

const legalProseClass =
    "min-w-0 [&>section]:scroll-mt-[6.5rem] [&>section+section]:mt-12 [&>section+section]:border-t [&>section+section]:border-border [&>section+section]:pt-12 [&_a]:text-white [&_a]:decoration-white/45 [&_a]:underline-offset-[0.22em] [&_code]:font-mono [&_code]:text-[0.86em] [&_code]:text-[#f0c9da] [&_h3]:mt-8 [&_h3]:mb-3 [&_h3]:text-base [&_h3]:text-[#e7e1e8] [&_li]:text-[0.93rem] [&_li]:leading-[1.78] [&_li]:text-[#c2bbc4] [&_li+li]:mt-[0.55rem] [&_ol]:my-[0.85rem] [&_ol]:pl-[1.4rem] [&_p]:my-[0.85rem] [&_p]:text-[0.93rem] [&_p]:leading-[1.78] [&_p]:text-[#c2bbc4] [&_ul]:my-[0.85rem] [&_ul]:pl-[1.4rem] print:max-w-none print:[&_a]:text-[#111] print:[&_h2]:text-[#111] print:[&_h3]:text-[#111] print:[&_li]:text-[#333] print:[&_p]:text-[#333]";

export interface TocItem {
    id: string;
    label: string;
}

export function LegalDocument({
    title,
    summary,
    toc,
    children,
}: {
    title: string;
    summary: string;
    toc: readonly TocItem[];
    children: ReactNode;
}) {
    return (
        <main className={cn(siteContainerClass, "py-[clamp(4rem,8vw,7rem)] print:w-full print:py-0")}>
            <header className="max-w-[900px] border-b border-border-strong pb-[clamp(2.5rem,5vw,4rem)] print:max-w-none">
                <PrefetchLink
                    to={routes.legal}
                    prefetch="intent"
                    className="mb-[1.4rem] inline-block text-[0.78rem] text-muted underline-offset-[0.3em] print:hidden"
                >
                    Legal center
                </PrefetchLink>
                <h1 className="text-[clamp(2.7rem,6vw,5.1rem)] leading-none tracking-[-0.06em] print:text-[#111]">{title}</h1>
                <p className="mt-[1.35rem] max-w-[68ch] text-base leading-[1.7] text-muted print:text-[#333]">{summary}</p>
                <dl className="mt-8 flex flex-wrap gap-x-12 gap-y-6">
                    <div>
                        <dt className="mb-[0.3rem] font-mono text-[0.64rem] tracking-[0.06em] text-quiet uppercase">Effective date</dt>
                        <dd className="text-[0.8rem] text-[#d6d0d7] print:text-[#333]">{legalMetadata.effectiveDate}</dd>
                    </div>
                    <div>
                        <dt className="mb-[0.3rem] font-mono text-[0.64rem] tracking-[0.06em] text-quiet uppercase">Last updated</dt>
                        <dd className="text-[0.8rem] text-[#d6d0d7] print:text-[#333]">{legalMetadata.lastUpdated}</dd>
                    </div>
                </dl>
                <p className="mt-[1.8rem] max-w-[76ch] border-l-2 border-accent pl-4 text-[0.82rem] leading-[1.65] text-[#c9c1ca] [&_code]:font-mono [&_code]:text-[0.88em] [&_code]:font-semibold [&_code]:text-[#ffd0e3]">
                    <strong>Draft notice:</strong> unresolved facts are marked <code>REQUIRES OWNER CONFIRMATION</code>. This text must be
                    reviewed before publication as an effective policy.
                </p>
            </header>

            <div className="mt-16 grid grid-cols-1 items-start gap-10 min-[821px]:grid-cols-[210px_minmax(0,760px)] min-[821px]:gap-[clamp(3rem,8vw,7rem)] print:mt-8 print:block">
                <nav
                    className="border-b border-border pb-6 min-[821px]:sticky min-[821px]:top-[105px] min-[821px]:border-0 min-[821px]:pb-0 print:hidden"
                    aria-label={`${title} contents`}
                >
                    <h2 className="mb-4 font-mono text-[0.68rem] tracking-[0.08em] text-quiet uppercase">On this page</h2>
                    <ol className="columns-1 min-[601px]:columns-2 min-[821px]:columns-1">
                        {toc.map((item) => (
                            <li className="break-inside-avoid [&+li]:mt-[0.65rem]" key={item.id}>
                                <a className="text-[0.75rem] leading-[1.4] text-muted no-underline hover:text-white" href={`#${item.id}`}>
                                    {item.label}
                                </a>
                            </li>
                        ))}
                    </ol>
                </nav>
                <article className={legalProseClass}>{children}</article>
            </div>
        </main>
    );
}

export function LegalSection({ id, title, children }: { id: string; title: string; children: ReactNode }) {
    return (
        <section className="print:break-inside-avoid-page" id={id}>
            <h2 className="mb-5 text-[clamp(1.45rem,2.8vw,2rem)] leading-[1.2] tracking-[-0.035em] text-white">
                <a href={`#${id}`}>{title}</a>
            </h2>
            {children}
        </section>
    );
}

export function OwnerConfirmation({ children }: { children?: ReactNode }) {
    return (
        <span className="font-mono text-[0.88em] font-semibold text-[#ffd0e3]">
            REQUIRES OWNER CONFIRMATION{children ? <> — {children}</> : null}
        </span>
    );
}

export function LegalTable({ children }: { children: ReactNode }) {
    return (
        <div className="my-6 max-w-full overflow-x-auto" tabIndex={0} role="region" aria-label="Scrollable table">
            <table className="w-full min-w-[620px] border-collapse text-[0.78rem] [&_td]:border-b [&_td]:border-border [&_td]:px-3 [&_td]:py-[0.85rem] [&_td]:text-left [&_td]:align-top [&_td]:leading-[1.55] [&_td]:text-[#bbb4bd] print:[&_td]:text-[#333] [&_th]:border-b [&_th]:border-border [&_th]:px-3 [&_th]:py-[0.85rem] [&_th]:text-left [&_th]:align-top [&_th]:leading-[1.55] [&_th]:font-bold [&_th]:text-white print:[&_th]:text-[#111]">
                {children}
            </table>
        </div>
    );
}
