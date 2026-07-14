import { Github, HardDrive, MonitorDot, Radio, UploadCloud } from "lucide-react";

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
    ["Tauri shell", "A Rust-backed desktop prototype with a React interface."],
    ["tosu process control", "The app can start and stop a local tosu process."],
    ["Local state events", "It listens for local play-state changes over tosu’s WebSocket."],
] as const;

export default function Companion() {
    const product = getProduct("companion");

    return (
        <ProductPage>
            <ProductHero className="bg-[linear-gradient(130deg,rgba(128,215,232,0.08),transparent_42%),#0b0c0f]">
                <div className={productHeroCopyClass}>
                    <Eyebrow>Desktop prototype</Eyebrow>
                    <StatusLine status={product.status} detail="Source only; no packaged release" tone={product.tone} />
                    <h1 className={productTitleClass}>{product.name}</h1>
                    <h2 className={productSubtitleClass}>A local bridge for ideas that do not belong in a browser.</h2>
                    <p className={productBodyClass}>
                        The current Tauri prototype can manage tosu and observe local osu! state. Hanami account connection and score upload
                        are still mocked in code.
                    </p>
                    <ActionLink className="mt-8" href={product.links.primary} external>
                        <Github aria-hidden="true" /> Inspect the prototype
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
                        Current project icon. The desktop application is not yet distributed.
                    </figcaption>
                </figure>
            </ProductHero>

            <ProductSection>
                <SectionIntro
                    eyebrow="Implemented now"
                    title="A narrow local prototype."
                    body="The website separates working code from planned integration so the status is unambiguous."
                />
                <div className="grid grid-cols-1 border-t border-border-strong min-[821px]:grid-cols-3">
                    {currentCapabilities.map(([title, description], index) => (
                        <article
                            className="flex min-h-[150px] flex-col border-b border-border p-[1.6rem] min-[821px]:min-h-[210px] min-[821px]:border-r last:min-[821px]:border-r-0"
                            key={title}
                        >
                            <span className="font-mono text-[0.7rem] text-quiet" aria-hidden="true">
                                {String(index + 1).padStart(2, "0")}
                            </span>
                            <h3 className="mt-auto text-base tracking-[-0.02em] text-[#c4f1f7]">{title}</h3>
                            <p className="mt-[0.35rem] max-w-[62ch] text-[0.9rem] leading-[1.65] text-muted">{description}</p>
                        </article>
                    ))}
                </div>
            </ProductSection>

            <ProductSplit>
                <div>
                    <Eyebrow>Data boundary</Eyebrow>
                    <h2 className={sectionHeadingClass}>Local first, with the network path still unfinished.</h2>
                    <p className={sectionBodyClass}>
                        The prototype connects to a local tosu WebSocket. Its Hanami API client only prints mock score and map-upload
                        messages; the network requests are commented out.
                    </p>
                </div>
                <ProductSteps className="[&_svg]:text-cyan">
                    <ProductStep icon={<HardDrive aria-hidden="true" />}>
                        <strong>Local osu! session</strong>
                        <p>tosu reads local game state.</p>
                    </ProductStep>
                    <ProductStep icon={<Radio aria-hidden="true" />}>
                        <strong>Companion listener</strong>
                        <p>The app observes state transitions.</p>
                    </ProductStep>
                    <ProductStep icon={<UploadCloud aria-hidden="true" />} muted>
                        <strong>Hanami sync — planned</strong>
                        <p>No production upload endpoint is active.</p>
                    </ProductStep>
                </ProductSteps>
            </ProductSplit>

            <ProductFootnote className="[&>svg]:text-cyan">
                <MonitorDot aria-hidden="true" />
                <p>No release download is offered because the repository is still a development prototype.</p>
            </ProductFootnote>
        </ProductPage>
    );
}
