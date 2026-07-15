import { Github } from "lucide-react";

import Footer from "@/components/footer";
import Header from "@/components/header";
import { sectionSpacingClass, siteContainerClass, sitePageClass } from "@/components/layout/styles";
import { ActionLink, Eyebrow, TextLink } from "@/components/marketing";
import { products, siteConfig } from "@/data/site-config";
import { cn } from "@/lib/utils";

const productAccentClasses = {
    rose: "text-white",
    violet: "text-[#d4c8ff]",
    cyan: "text-[#b8edf5]",
    lime: "text-[#d2edab]",
} as const;

export default function Home() {
    return (
        <div className={sitePageClass}>
            <Header />

            <main>
                <section className="relative min-h-[min(820px,calc(100svh-72px))] overflow-hidden border-b border-border max-[820px]:min-h-180 max-[600px]:min-h-165">
                    <div className="absolute inset-0" aria-hidden="true">
                        <img
                            className="size-full object-cover object-[50%_38%] opacity-55"
                            src="/background.webp"
                            alt=""
                            width="2560"
                            height="1709"
                            fetchPriority="high"
                        />
                    </div>
                    <div
                        className="absolute inset-0 bg-[linear-gradient(90deg,rgba(10,9,12,0.97)_0%,rgba(10,9,12,0.78)_40%,rgba(10,9,12,0.14)_72%),linear-gradient(0deg,var(--color-bg),transparent_30%)]"
                        aria-hidden="true"
                    />

                    <div
                        className={cn(
                            siteContainerClass,
                            "relative z-10 grid min-h-[min(820px,calc(100svh-72px))] grid-cols-[minmax(0,0.95fr)_minmax(340px,0.75fr)] items-center gap-[clamp(2rem,7vw,7rem)] py-16 max-[1080px]:grid-cols-[minmax(0,1fr)_minmax(280px,0.65fr)] max-[1080px]:gap-8 max-[820px]:min-h-180 max-[820px]:grid-cols-1 max-[820px]:content-center max-[820px]:py-12 max-[600px]:min-h-165",
                        )}
                    >
                        <div className="relative z-20 max-w-180 pr-0 motion-safe:animate-[reveal-up_500ms_80ms_cubic-bezier(0.2,0.7,0.2,1)_both] min-[601px]:max-[820px]:pr-[10%]">
                            <h1 className="text-[clamp(4rem,24vw,5.7rem)] leading-[0.88] tracking-[-0.085em] text-white min-[601px]:text-[clamp(4.4rem,9vw,7.2rem)]">
                                Hanami
                            </h1>
                            <p className="mt-[1.8rem] max-w-165 text-[1.08rem] leading-[1.45] tracking-tight text-[#e9e4e9] min-[601px]:text-[clamp(1.2rem,2.2vw,1.65rem)]">
                                A small family of osu! projects: a Discord bot, a guessing game, a desktop prototype, and a Rust analysis
                                toolkit.
                            </p>
                            <div className="mt-8 flex flex-wrap gap-3 max-[600px]:flex-col max-[600px]:items-stretch">
                                <ActionLink href="#projects">Browse the projects</ActionLink>
                                <ActionLink href={siteConfig.links.organization} variant="secondary" external>
                                    <Github aria-hidden="true" /> GitHub
                                </ActionLink>
                            </div>
                        </div>

                        <div
                            className="w-[min(45vw,530px)] self-end justify-self-end motion-safe:animate-[reveal-up_550ms_150ms_cubic-bezier(0.2,0.7,0.2,1)_both] max-[820px]:absolute max-[820px]:-right-20 max-[820px]:-bottom-10 max-[820px]:w-[min(62vw,390px)] max-[820px]:opacity-40 max-[600px]:-right-26 max-[600px]:opacity-30"
                            aria-hidden="true"
                        >
                            <img
                                className="h-auto w-full drop-shadow-[0_22px_35px_rgba(0,0,0,0.28)]"
                                src="/hanami-transparent.png"
                                alt=""
                                width="565"
                                height="542"
                                fetchPriority="high"
                            />
                        </div>
                    </div>
                </section>

                <section className={cn(siteContainerClass, sectionSpacingClass)} id="projects" aria-labelledby="projects-title">
                    <header className="mb-10 grid grid-cols-1 items-end gap-x-20 gap-y-6 min-[601px]:mb-18 min-[821px]:grid-cols-[minmax(0,0.85fr)_minmax(280px,0.55fr)]">
                        <Eyebrow className="mb-0 min-[821px]:col-span-2 min-[821px]:-mb-2">Projects</Eyebrow>
                        <h2 className="text-[clamp(2rem,4.2vw,3.8rem)] leading-[1.04] tracking-[-0.055em] text-white" id="projects-title">
                            Choose the thing you need.
                        </h2>
                        <p className="max-w-[62ch] text-[clamp(1rem,1.4vw,1.1rem)] leading-7 text-muted">
                            Each project has its own purpose and release state. The product pages cover the details without pretending the
                            prototypes are finished.
                        </p>
                    </header>

                    <div className="border-t border-border-strong">
                        {products.map((product) => (
                            <article
                                className="grid min-h-37.5 grid-cols-[minmax(180px,0.65fr)_minmax(260px,1fr)_auto] items-center gap-x-10 gap-y-6 border-b border-border max-[1080px]:grid-cols-[minmax(170px,0.55fr)_1fr] max-[600px]:min-h-0 max-[600px]:grid-cols-1 max-[600px]:items-start max-[600px]:gap-y-3 max-[600px]:py-6"
                                key={product.key}
                            >
                                <div>
                                    <p className="mb-[0.45rem] font-mono text-[0.68rem] tracking-[0.06em] text-quiet uppercase">
                                        {product.category} · {product.status}
                                    </p>
                                    <h3
                                        className={cn(
                                            "text-[clamp(1.3rem,2.2vw,2rem)] tracking-[-0.04em]",
                                            productAccentClasses[product.tone],
                                        )}
                                    >
                                        {product.name}
                                    </h3>
                                </div>
                                <p className="max-w-[52ch] text-[0.96rem] leading-[1.65] text-muted">{product.description}</p>
                                <TextLink
                                    className="max-[1080px]:col-start-2 max-[1080px]:-mt-2 max-[1080px]:mb-6 max-[600px]:col-start-1 max-[600px]:mt-[0.6rem] max-[600px]:mb-0"
                                    href={product.route}
                                    prefetch="intent-and-viewport"
                                >
                                    {product.action}
                                </TextLink>
                            </article>
                        ))}
                    </div>
                </section>

                <section className="border-y border-border bg-surface">
                    <div
                        className={cn(
                            siteContainerClass,
                            "grid grid-cols-1 items-center gap-[clamp(2rem,7vw,7rem)] py-12 min-[821px]:grid-cols-[minmax(300px,1fr)_minmax(300px,0.78fr)] min-[821px]:py-[clamp(3.5rem,7vw,6rem)]",
                        )}
                    >
                        <img
                            className="aspect-video w-full rounded-md object-cover"
                            src="/products/osuguessr-audio.webp"
                            alt="Colorful osu! beatmap artwork used in osu!guessr"
                            width="1920"
                            height="1080"
                        />
                        <div>
                            <Eyebrow>Open development</Eyebrow>
                            <h2 className="text-[clamp(2rem,4.2vw,3.8rem)] leading-[1.04] tracking-[-0.055em] text-white">
                                Useful on its own. Connected only when it helps.
                            </h2>
                            <p className="mt-5 max-w-[62ch] text-[clamp(1rem,1.4vw,1.1rem)] leading-7 text-muted">
                                Hanami’s code, issues, and project history are public. Live products, published tools, and prototypes are
                                labeled separately.
                            </p>
                            <TextLink className="mt-[1.8rem]" href={siteConfig.links.organization} external>
                                Browse the repositories
                            </TextLink>
                        </div>
                    </div>
                </section>
            </main>

            <Footer />
        </div>
    );
}
