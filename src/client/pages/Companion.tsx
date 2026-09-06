import { Github, HardDrive, MonitorDot, Radio } from "lucide-react";

import { ActionLink, Eyebrow, SectionIntro, StatusLine } from "@/components/marketing";
import {
    ProductFootnote,
    ProductHero,
    ProductPage,
    ProductSection,
    ProductSplit,
    ProductStep,
    ProductSteps,
    productBodyClass,
    productHeroCopyClass,
    productSubtitleClass,
    productTitleClass,
    sectionBodyClass,
    sectionHeadingClass,
} from "@/components/product/product-layout";
import { getProduct } from "@/data/site-config";

const currentCapabilities = [
    ["tosu lifecycle", "Connect to an existing tosu instance or launch and stop one owned by Companion."],
    ["Play detection", "Track selected beatmaps and detect passed, failed, retried, and quit attempts."],
    ["Normalized state", "Render normalized local state in React for the current desktop session."],
] as const;

export default function Companion() {
    const product = getProduct("companion");

    return (
        <ProductPage>
            <ProductHero className="bg-[linear-gradient(130deg,rgba(128,215,232,0.08),transparent_42%),#0b0c0f]">
                <div className={productHeroCopyClass}>
                    <Eyebrow>Desktop prototype</Eyebrow>
                    <StatusLine status={product.status} detail="Public source · no packaged release" tone={product.tone} />
                    <h1 className={productTitleClass}>{product.name}</h1>
                    <h2 className={productSubtitleClass}>A local bridge for ideas that do not belong in a browser.</h2>
                    <p className={productBodyClass}>
                        The public Tauri project is an unfinished local prototype. Rust handles process lifecycle and local play detection
                        while React renders normalized state. It can connect to tosu and track local osu! activity, but no packaged release
                        is offered.
                    </p>
                    <ActionLink className="mt-8" href={product.links.primary} external>
                        <Github aria-hidden="true" /> View the source
                    </ActionLink>
                </div>

                <figure className="text-center motion-safe:animate-[reveal-up_550ms_150ms_cubic-bezier(0.2,0.7,0.2,1)_both]">
                    <img
                        className="mx-auto w-[min(78%,370px)] rounded-[26%]"
                        src="/products/companion-icon.png"
                        alt="Hanami Companion application icon"
                        width="512"
                        height="512"
                    />
                    <figcaption className="mx-auto mt-4 max-w-[45ch] text-[0.72rem] leading-[1.55] text-quiet max-[600px]:text-left">
                        Current project icon. No packaged release is published yet.
                    </figcaption>
                </figure>
            </ProductHero>

            <ProductSection>
                <SectionIntro
                    eyebrow="Prototype scope"
                    title="Unfinished local software."
                    body="The public repository documents a local prototype for tosu lifecycle control, play detection, and normalized desktop state. It remains in development and is not a packaged product."
                />
                <div className="grid grid-cols-1 border-t border-border-strong min-[821px]:grid-cols-3">
                    {currentCapabilities.map(([title, description]) => (
                        <article
                            className="flex min-h-37.5 flex-col border-b border-border p-[1.6rem] min-[821px]:min-h-52.5 min-[821px]:border-r last:min-[821px]:border-r-0"
                            key={title}
                        >
                            <h3 className="mt-auto text-base tracking-[-0.02em] text-[#c4f1f7]">{title}</h3>
                            <p className="mt-[0.35rem] max-w-[62ch] text-[0.9rem] leading-[1.65] text-muted">{description}</p>
                        </article>
                    ))}
                </div>
            </ProductSection>

            <ProductSplit>
                <div>
                    <Eyebrow>Data boundary</Eyebrow>
                    <h2 className={sectionHeadingClass}>Local state only.</h2>
                    <p className={sectionBodyClass}>
                        Recent attempts stay in memory for the current desktop session. The prototype is unfinished and its local state is
                        not a hosted Hanami account feature.
                    </p>
                </div>
                <ProductSteps className="[&_svg]:text-cyan">
                    <ProductStep icon={<HardDrive aria-hidden="true" />}>
                        <strong>Local osu! session</strong>
                        <p>tosu reads local game state and exposes it over loopback.</p>
                    </ProductStep>
                    <ProductStep icon={<Radio aria-hidden="true" />}>
                        <strong>Companion listener</strong>
                        <p>The app normalizes state and detects meaningful play attempts.</p>
                    </ProductStep>
                    <ProductStep icon={<MonitorDot aria-hidden="true" />}>
                        <strong>Normalized local state</strong>
                        <p>React renders the local session state for the current desktop process.</p>
                    </ProductStep>
                </ProductSteps>
            </ProductSplit>

            <ProductFootnote className="[&>svg]:text-cyan">
                <MonitorDot aria-hidden="true" />
                <p>The public repository contains an unfinished local prototype. No packaged release is currently offered.</p>
            </ProductFootnote>
        </ProductPage>
    );
}
