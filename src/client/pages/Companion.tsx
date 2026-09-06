import { Github, HardDrive, MonitorDot, Radio } from "lucide-react";

import { ActionLink, Eyebrow, SectionIntro } from "@/components/marketing";
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
    ["tosu connection", "Connect to an existing tosu instance or launch and stop one owned by Companion."],
    ["Play detection", "Track selected beatmaps and detect passed, failed, retried, and quit attempts."],
    ["Game activity", "View your current osu! activity in the desktop app."],
] as const;

export default function Companion() {
    const product = getProduct("companion");

    return (
        <ProductPage>
            <ProductHero className="bg-[linear-gradient(130deg,rgba(128,215,232,0.08),transparent_42%),#0b0c0f]">
                <div className={productHeroCopyClass}>
                    <Eyebrow>Desktop prototype</Eyebrow>
                    <h1 className={productTitleClass}>{product.name}</h1>
                    <h2 className={productSubtitleClass}>Track osu! activity on your desktop.</h2>
                    <p className={productBodyClass}>
                        Companion is an unfinished local prototype for tracking osu! activity through tosu. It supports local play
                        detection, but you need to build it from source to try it.
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
                        No installer is available yet.
                    </figcaption>
                </figure>
            </ProductHero>

            <ProductSection>
                <SectionIntro
                    eyebrow="Features"
                    title="Current features"
                    body="The prototype can connect to tosu, detect plays, and display your current game activity."
                />
                <div className="grid grid-cols-1 min-[821px]:grid-cols-3">
                    {currentCapabilities.map(([title, description]) => (
                        <article
                            className="flex min-h-37.5 flex-col p-[1.6rem] min-[821px]:min-h-52.5 min-[821px]:border-r last:min-[821px]:border-r-0"
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
                    <Eyebrow>Local data</Eyebrow>
                    <h2 className={sectionHeadingClass}>Play data stays on your computer.</h2>
                    <p className={sectionBodyClass}>
                        Recent attempts are kept in memory while Companion is running. They are not saved to your Hanami account.
                    </p>
                </div>
                <ProductSteps className="[&_svg]:text-cyan">
                    <ProductStep icon={<HardDrive aria-hidden="true" />}>
                        <strong>Local osu! session</strong>
                        <p>tosu reads osu! activity on your computer.</p>
                    </ProductStep>
                    <ProductStep icon={<Radio aria-hidden="true" />}>
                        <strong>Play detection</strong>
                        <p>Companion detects when you start, finish, retry, or quit a play.</p>
                    </ProductStep>
                    <ProductStep icon={<MonitorDot aria-hidden="true" />}>
                        <strong>Desktop display</strong>
                        <p>View the activity from your current session.</p>
                    </ProductStep>
                </ProductSteps>
            </ProductSplit>

            <ProductFootnote className="[&>svg]:text-cyan">
                <MonitorDot aria-hidden="true" />
                <p>You can try Companion by building it from source. It is still under development.</p>
            </ProductFootnote>
        </ProductPage>
    );
}
