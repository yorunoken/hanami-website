import { Braces, CheckCircle2, FileJson2, Github, Package, TerminalSquare } from "lucide-react";

import { ActionLink, Eyebrow, SectionIntro, StatusLine } from "@/components/marketing";
import {
    HeroActions,
    ProductHero,
    ProductPage,
    ProductSection,
    ProductSplit,
    productBodyClass,
    productHeroCopyClass,
    productSubtitleClass,
    productTitleClass,
    sectionBodyClass,
    sectionHeadingClass,
} from "@/components/product/product-layout";
import { getProduct } from "@/data/site-config";

const outputs = [
    [TerminalSquare, "Readable reports", "Compact terminal output by default, with grouped detail on request."],
    [Braces, "Rust types", "Structured timing, object, rhythm, stream, aim, speed, slider, and section results."],
    [FileJson2, "Dataset exports", "JSON, JSONL, and CSV paths for analysis and labeling workflows."],
    [CheckCircle2, "Validation", "Structural and numerical checks with separate passes, warnings, and errors."],
] as const;

export default function MapAnalyzer() {
    const product = getProduct("map-analyzer");

    return (
        <ProductPage>
            <ProductHero className="bg-[linear-gradient(rgba(180,218,122,0.045)_1px,transparent_1px),linear-gradient(90deg,rgba(180,218,122,0.045)_1px,transparent_1px),#0a0d0a] bg-size-[48px_48px]">
                <div className={productHeroCopyClass}>
                    <Eyebrow>Rust library and CLI</Eyebrow>
                    <StatusLine status={product.status} detail="Crate version 0.2.9" tone={product.tone} />
                    <h1 className={productTitleClass}>{product.name}</h1>
                    <h2 className={productSubtitleClass}>Turn a local .osu file into inspectable structure.</h2>
                    <p className={productBodyClass}>
                        A Rust library and command-line tool for local beatmap analysis, human-readable reports, validation, and dataset
                        export. The analyzer itself makes no network requests.
                    </p>
                    <HeroActions>
                        <ActionLink href={product.links.primary} external>
                            Read the docs
                        </ActionLink>
                        <ActionLink href={product.links.source} variant="secondary" external>
                            <Github aria-hidden="true" /> Source
                        </ActionLink>
                    </HeroActions>
                </div>

                <figure className="border-l-2 border-lime py-[1.4rem] pl-[clamp(1.2rem,3vw,2.2rem)] motion-safe:animate-[reveal-up_550ms_150ms_cubic-bezier(0.2,0.7,0.2,1)_both]">
                    <figcaption className="mb-[1.2rem] font-mono text-[0.7rem] tracking-[0.08em] text-lime uppercase">
                        Compact report format
                    </figcaption>
                    <pre className="max-w-full overflow-x-auto font-mono text-[clamp(0.7rem,1.2vw,0.84rem)] leading-[1.8] whitespace-pre-wrap text-[#d8ded1]">
                        <code>
                            <span className="text-lime">$</span> osu-map-analyzer map.osu
                            {"\n\n"}
                            Artist — Title{"\n"}
                            Mapped by Creator [Difficulty]{"\n"}
                            Mods: NM Rate: 1x{"\n"}
                            Star rating · Objects · Length{"\n"}
                            BPM range · Density · Object mix{"\n"}
                            Tags{"\n"}
                            Highlights: streams, spacing, pressure
                        </code>
                    </pre>
                </figure>
            </ProductHero>

            <ProductSection>
                <SectionIntro
                    eyebrow="Output"
                    title="Readable first, structured when needed."
                    body="The same analysis can be consumed by a person in a terminal or by another program through Rust types and serialization."
                />
                <div className="border-t border-border-strong">
                    {outputs.map(([Icon, title, description]) => (
                        <article
                            className="grid grid-cols-[2rem_1fr] gap-5 border-b border-border py-[1.55rem] max-[600px]:grid-cols-[1.5rem_1fr] max-[600px]:gap-[0.8rem]"
                            key={title}
                        >
                            <Icon className="size-4.75 text-lime" aria-hidden="true" />
                            <div>
                                <h3 className="text-base tracking-[-0.02em]">{title}</h3>
                                <p className="mt-[0.35rem] max-w-[62ch] text-[0.9rem] leading-[1.65] text-muted">{description}</p>
                            </div>
                        </article>
                    ))}
                </div>
            </ProductSection>

            <ProductSplit>
                <div>
                    <Eyebrow>Install</Eyebrow>
                    <h2 className={sectionHeadingClass}>Use the CLI or add the crate.</h2>
                    <p className={sectionBodyClass}>The published package is Apache-2.0 licensed and built on rosu-map and rosu-pp.</p>
                    <ActionLink className="mt-[1.8rem]" href={product.links.crate ?? product.links.primary} external>
                        <Package aria-hidden="true" /> Open on crates.io
                    </ActionLink>
                </div>
                <div
                    className="grid border-t border-border-strong [&_code]:border-b [&_code]:border-border [&_code]:py-[1.15rem] [&_code]:font-mono [&_code]:text-[0.78rem] [&_code]:leading-[1.6] [&_code]:text-[#d7d1d8] [&_span]:mr-[0.65rem] [&_span]:text-lime"
                    aria-label="Map Analyzer installation commands"
                >
                    <code>
                        <span>$</span> cargo install osu-map-analyzer
                    </code>
                    <code>
                        <span>$</span> osu-map-analyzer map.osu
                    </code>
                    <code>
                        <span>$</span> osu-map-analyzer --json map.osu
                    </code>
                </div>
            </ProductSplit>
        </ProductPage>
    );
}
