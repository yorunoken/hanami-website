import { Bot as BotIcon, Github, Link2, SlidersHorizontal } from "lucide-react";

import { ActionLink, Eyebrow, SectionIntro, TextLink } from "@/components/marketing";
import {
    HeroActions,
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

const commands = [
    ["/profile", "Player profiles", "Rank, accuracy, play count, country, and account details."],
    ["/recent", "Recent plays", "The latest score with mods, combo, hit results, and performance data."],
    ["/top", "Top scores", "Best plays for a linked user or an osu! username."],
    ["/beatmap", "Beatmap details", "Difficulty, BPM, length, object counts, estimates, and map links."],
    ["/compare", "Score comparison", "Compare a player on a beatmap already shared in the conversation."],
    ["/whatif", "Performance scenarios", "Explore performance-point requirements for different score outcomes."],
] as const;

export default function Bot() {
    const product = getProduct("bot");

    return (
        <ProductPage>
            <ProductHero className="bg-[linear-gradient(125deg,#121015_0%,#171019_68%,#22111a_100%)]">
                <div className={productHeroCopyClass}>
                    <Eyebrow>Discord bot</Eyebrow>
                    <h1 className={productTitleClass}>{product.name}</h1>
                    <h2 className={productSubtitleClass}>Look up osu! players and scores in Discord.</h2>
                    <p className={productBodyClass}>
                        Look up players, scores, and beatmaps inside Discord. Link an osu! account once to use your own profile as the
                        default in supported commands.
                    </p>
                    <HeroActions>
                        <ActionLink href={product.links.primary} external>
                            <BotIcon aria-hidden="true" /> Add to Discord
                        </ActionLink>
                        <ActionLink href={product.links.source} variant="secondary" external>
                            <Github aria-hidden="true" /> Source
                        </ActionLink>
                    </HeroActions>
                </div>
                <figure className="self-end text-center motion-safe:animate-[reveal-up_550ms_150ms_cubic-bezier(0.2,0.7,0.2,1)_both]">
                    <img
                        className="mx-auto w-[min(100%,470px)] max-[820px]:w-[min(70%,340px)]"
                        src="/hanami-transparent.png"
                        alt="Hanami mascot"
                        width="565"
                        height="542"
                    />
                </figure>
            </ProductHero>

            <ProductSection aria-labelledby="bot-commands-title">
                <SectionIntro
                    eyebrow="Commands"
                    title="Player, score, and beatmap commands"
                    body="Use these commands in your Discord server."
                />
                <div className="grid gap-7" id="bot-commands-title">
                    {commands.map(([command, title, description]) => (
                        <article
                            className="grid grid-cols-[9rem_1fr] items-start gap-6 py-2 max-[600px]:grid-cols-1 max-[600px]:gap-y-[0.6rem]"
                            key={command}
                        >
                            <code className="font-mono text-[0.86rem] text-accent-soft">{command}</code>
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
                    <Eyebrow>Optional account link</Eyebrow>
                    <h2 className={sectionHeadingClass}>Link your osu! account</h2>
                    <p className={sectionBodyClass}>
                        Sign in with Discord and connect your osu! account. You can also change the bot’s display settings from your
                        profile.
                    </p>
                    <TextLink className="mt-[1.8rem]" href="/profile">
                        Open account settings
                    </TextLink>
                </div>
                <ProductSteps>
                    <ProductStep icon={<Link2 aria-hidden="true" />}>
                        <strong>Connect</strong>
                        <p>Connect your osu! account to your Discord account.</p>
                    </ProductStep>
                    <ProductStep icon={<SlidersHorizontal aria-hidden="true" />}>
                        <strong>Choose defaults</strong>
                        <p>Set game mode, score source, embed size, and embed style.</p>
                    </ProductStep>
                    <ProductStep icon={<BotIcon aria-hidden="true" />}>
                        <strong>Use commands</strong>
                        <p>Player commands use your linked osu! account by default.</p>
                    </ProductStep>
                </ProductSteps>
            </ProductSplit>

            <ProductFootnote>
                <p>
                    <strong>Privacy note:</strong> unlinking osu! removes the ID link; it does not delete the web account, bot settings, or
                    other service data.
                </p>
                <TextLink href="/legal/data-deletion">Account deletion details</TextLink>
            </ProductFootnote>
        </ProductPage>
    );
}
