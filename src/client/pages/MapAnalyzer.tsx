import { Activity, Github, Package, Route } from "lucide-react";

import { ActionLink, Eyebrow, SectionIntro } from "@/components/marketing";
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
    [Activity, "Stream analysis", "Confidence, stream counts and lengths, density, and BPM consistency."],
    [Route, "Jump analysis", "Confidence, jump counts and lengths, density, and BPM consistency."],
] as const;

export default function MapAnalyzer() {
    const product = getProduct("map-analyzer");

    return (
        <ProductPage>
            <ProductHero className="bg-[linear-gradient(rgba(180,218,122,0.045)_1px,transparent_1px),linear-gradient(90deg,rgba(180,218,122,0.045)_1px,transparent_1px),#0a0d0a] bg-size-[48px_48px]">
                <div className={productHeroCopyClass}>
                    <Eyebrow>Rust library</Eyebrow>
                    <h1 className={productTitleClass}>{product.name}</h1>
                    <h2 className={productSubtitleClass}>Inspect stream and jump patterns in a local .osu file.</h2>
                    <p className={productBodyClass}>
                        The published crate parses local beatmaps with rosu-map and exposes separate stream and jump analyzers. Version
                        0.2.9 is a library package; it does not publish a standalone command-line program.
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
                        Library usage
                    </figcaption>
                    <pre className="max-w-full overflow-x-auto font-mono text-[clamp(0.7rem,1.2vw,0.84rem)] leading-[1.8] whitespace-pre-wrap text-[#d8ded1]">
                        <code>
                            <span className="text-lime">use</span> std::path::Path;{"\n"}
                            <span className="text-lime">use</span> osu_map_analyzer::{"{"}analyze, rosu_map{"}"};{"\n\n"}
                            let path = Path::new("map.osu");{"\n"}
                            {"let map = rosu_map::from_path::<rosu_map::Beatmap>(path).unwrap();"}
                            {"\n"}
                            let mut stream = analyze::Stream::new(map.clone());{"\n"}
                            let streams = stream.analyze();{"\n"}
                            let mut jump = analyze::Jump::new(map);{"\n"}
                            let jumps = jump.analyze();
                        </code>
                    </pre>
                </figure>
            </ProductHero>

            <ProductSection>
                <SectionIntro
                    eyebrow="Output"
                    title="Stream and jump analysis"
                    body="Version 0.2.9 returns stream and jump analysis as Rust values. Reports and dataset tools are still in development."
                />
                <div className="grid gap-6">
                    {outputs.map(([Icon, title, description]) => (
                        <article
                            className="grid grid-cols-[2rem_1fr] gap-5 py-2 max-[600px]:grid-cols-[1.5rem_1fr] max-[600px]:gap-[0.8rem]"
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
                    <h2 className={sectionHeadingClass}>Install the library</h2>
                    <p className={sectionBodyClass}>
                        The published package is Apache-2.0 licensed and depends on rosu-map. It does not contain a binary target, so
                        <code className="mx-1">cargo install</code> is not an installation path for this release.
                    </p>
                    <ActionLink className="mt-[1.8rem]" href={product.links.crate ?? product.links.primary} external>
                        <Package aria-hidden="true" /> Open on crates.io
                    </ActionLink>
                </div>
                <div
                    className="grid gap-5 [&_code]:font-mono [&_code]:text-[0.78rem] [&_code]:leading-[1.6] [&_code]:text-[#d7d1d8] [&_span]:mr-[0.65rem] [&_span]:text-lime"
                    aria-label="Map Analyzer installation commands"
                >
                    <code>
                        <span>$</span> cargo add osu-map-analyzer@0.2.9
                    </code>
                    <code>
                        <span>toml</span> osu-map-analyzer = "0.2.9"
                    </code>
                </div>
            </ProductSplit>
        </ProductPage>
    );
}
