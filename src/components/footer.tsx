import { ArrowUpRight } from "lucide-react";

import { routes } from "@/client/routes/paths";
import { siteContainerClass } from "@/components/layout/styles";
import { PrefetchLink } from "@/components/navigation/prefetch-link";
import { products, siteConfig } from "@/data/site-config";
import { cn } from "@/lib/utils";

const footerLinkClass =
    "inline-flex items-center gap-[0.3rem] text-[0.78rem] text-muted no-underline transition-colors hover:text-white [&_svg]:size-3.25";

export default function Footer() {
    return (
        <footer className="border-t border-border bg-[#08070a] print:hidden">
            <div
                className={cn(
                    siteContainerClass,
                    "grid gap-12 py-[clamp(3rem,5vw,4.5rem)] min-[1081px]:grid-cols-[minmax(260px,0.8fr)_minmax(430px,1fr)]",
                )}
            >
                <div>
                    <PrefetchLink
                        className="inline-flex items-center gap-3 text-xl font-extrabold no-underline"
                        to={routes.home}
                        prefetch="none"
                        aria-label="Hanami home"
                    >
                        <img className="size-12 object-contain" src="/hanami-transparent.png" alt="" width="54" height="54" />
                        <span>Hanami</span>
                    </PrefetchLink>
                    <p className="mt-4 max-w-[35ch] text-[0.84rem] leading-[1.65] text-muted">
                        osu! tools, games, and your Hanami account.
                    </p>
                </div>

                <div className="grid grid-cols-2 gap-8 [&>div]:flex [&>div]:flex-col [&>div]:items-start [&>div]:gap-3">
                    <div>
                        <h2 className="mb-[0.3rem] font-mono text-[0.65rem] tracking-[0.08em] text-quiet uppercase">Projects</h2>
                        {products.map((product) => (
                            <PrefetchLink className={footerLinkClass} key={product.route} to={product.route} prefetch="intent">
                                {product.name}
                            </PrefetchLink>
                        ))}
                    </div>
                    <div>
                        <h2 className="mb-[0.3rem] font-mono text-[0.65rem] tracking-[0.08em] text-quiet uppercase">Hanami</h2>
                        <a className={footerLinkClass} href={siteConfig.links.organization} target="_blank" rel="noreferrer">
                            GitHub <ArrowUpRight aria-hidden="true" />
                        </a>
                        <a className={footerLinkClass} href={siteConfig.links.community} target="_blank" rel="noreferrer">
                            Community <ArrowUpRight aria-hidden="true" />
                        </a>
                        <a className={footerLinkClass} href={siteConfig.links.support} target="_blank" rel="noreferrer">
                            Support us <ArrowUpRight aria-hidden="true" />
                        </a>
                    </div>
                </div>
            </div>

            <div
                className={cn(
                    siteContainerClass,
                    "grid grid-cols-1 items-center gap-y-[0.6rem] py-[1.35rem] text-[0.68rem] leading-normal text-quiet min-[821px]:grid-cols-[auto_1fr_auto] min-[821px]:gap-x-8",
                )}
            >
                <span>© {new Date().getFullYear()} Hanami</span>
                <span className="min-[821px]:text-center">
                    An independent community project. Not affiliated with or endorsed by osu! or ppy Pty Ltd.
                </span>
                <div className="flex flex-wrap gap-x-4 gap-y-2 [&_a]:text-muted [&_a]:underline-offset-[0.2em]">
                    <PrefetchLink to={routes.legal} prefetch="intent">
                        Legal center
                    </PrefetchLink>
                    <PrefetchLink to={routes.legalPrivacy} prefetch="intent">
                        Privacy
                    </PrefetchLink>
                    <PrefetchLink to={routes.legalTerms} prefetch="intent">
                        Terms
                    </PrefetchLink>
                    <PrefetchLink to={routes.legalCookies} prefetch="intent">
                        Cookies
                    </PrefetchLink>
                </div>
            </div>
        </footer>
    );
}
