import {
  Github,
  Headphones,
  Image as ImageIcon,
  Paintbrush,
} from "lucide-react";

import {
  ActionLink,
  Eyebrow,
  SectionIntro,
  StatusLine,
  TextLink,
} from "@/components/marketing";
import {
  HeroActions,
  ProductFootnote,
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
import { siteContainerClass } from "@/components/layout/styles";
import { getProduct } from "@/data/site-config";
import { cn } from "@/lib/utils";

const modes = [
  {
    icon: ImageIcon,
    title: "Background",
    description: "Identify a beatmap from its background artwork.",
    image: "/products/osuguessr-ghostrule.webp",
    alt: "Anime-style beatmap background used in osu!guessr",
  },
  {
    icon: Headphones,
    title: "Audio",
    description: "Listen to a short clip and name the beatmap.",
    image: "/products/osuguessr-audio.webp",
    alt: "Bright red and cyan beatmap artwork used in osu!guessr",
  },
  {
    icon: Paintbrush,
    title: "Skin",
    description: "Recognize an osu! skin from a screenshot.",
    image: "/products/osuguessr-skin.webp",
    alt: "Blue-toned osu! skin screenshot used in osu!guessr",
  },
] as const;

export default function OsuGuessr() {
  const product = getProduct("osuguessr");

  return (
    <ProductPage>
      <section className="relative min-h-[720px] overflow-hidden border-b border-border max-[820px]:min-h-[680px]">
        <img
          className="absolute inset-0 size-full object-cover object-[55%_46%]"
          src="/products/osuguessr-hero.webp"
          alt=""
          width="2048"
          height="1317"
          fetchPriority="high"
        />
        <div
          className="absolute inset-0 bg-[linear-gradient(90deg,rgba(10,9,12,0.97)_0%,rgba(10,9,12,0.82)_41%,rgba(10,9,12,0.18)_75%),linear-gradient(0deg,rgba(10,9,12,0.72),transparent_42%)]"
          aria-hidden="true"
        />
        <div
          className={cn(
            siteContainerClass,
            "relative z-20 flex min-h-[720px] items-center py-20 max-[820px]:min-h-[680px]",
          )}
        >
          <div className={cn(productHeroCopyClass, "max-w-[700px]")}>
            <Eyebrow>Browser game</Eyebrow>
            <StatusLine
              status={product.status}
              detail="Background, audio, and skin modes"
              tone={product.tone}
            />
            <h1 className={productTitleClass}>{product.name}</h1>
            <h2 className={productSubtitleClass}>
              Recognize the map before the answer appears.
            </h2>
            <p className={productBodyClass}>
              Sign in with osu!, choose a mode, and guess from artwork, audio,
              or a skin screenshot. Scores and streaks feed the public
              leaderboards.
            </p>
            <HeroActions>
              <ActionLink href={product.links.primary} external>
                Play osu!guessr
              </ActionLink>
              <ActionLink
                href={product.links.source}
                variant="secondary"
                external
              >
                <Github aria-hidden="true" /> Source
              </ActionLink>
            </HeroActions>
            <p className="mt-[1.2rem] text-[0.7rem] text-white/50">
              Background artwork is sourced with the game’s beatmap catalog.
            </p>
          </div>
        </div>
      </section>

      <ProductSection>
        <SectionIntro
          eyebrow="Three ways to play"
          title="Different clues, the same memory test."
          body="Each mode draws from catalog assets used by the live game."
        />
        <div className="grid grid-cols-1 border-y border-border-strong min-[821px]:grid-cols-3">
          {modes.map(({ icon: Icon, title, description, image, alt }) => (
            <article
              className="group relative min-h-[300px] overflow-hidden border-b border-border-strong last:border-b-0 min-[821px]:min-h-[340px] min-[821px]:border-r min-[821px]:border-b-0 last:min-[821px]:border-r-0"
              key={title}
            >
              <img
                className="absolute inset-0 size-full object-cover transition-transform duration-[450ms] ease-[cubic-bezier(0.2,0.7,0.2,1)] group-hover:scale-[1.025] motion-reduce:transform-none"
                src={image}
                alt={alt}
                width="1920"
                height="1080"
                loading="lazy"
              />
              <div
                className="absolute inset-0 bg-[linear-gradient(0deg,rgba(8,7,10,0.94)_0%,rgba(8,7,10,0.18)_74%)]"
                aria-hidden="true"
              />
              <div className="absolute inset-x-6 bottom-6 z-20">
                <Icon
                  className="mb-[0.8rem] size-5 text-[#d8ccff]"
                  aria-hidden="true"
                />
                <h3 className="text-[1.35rem]">{title}</h3>
                <p className="mt-[0.35rem] text-[0.85rem] leading-[1.55] text-[#c5bec9]">
                  {description}
                </p>
              </div>
            </article>
          ))}
        </div>
      </ProductSection>

      <ProductSplit>
        <div>
          <Eyebrow>Game variants</Eyebrow>
          <h2 className={sectionHeadingClass}>Ten rounds, or one mistake.</h2>
          <p className={sectionBodyClass}>
            Classic mode ends after ten rounds. Death mode continues while the
            guesses are correct. The service stores completed game results for
            history, profiles, achievements, and rankings.
          </p>
        </div>
        <dl className="border-t border-border-strong [&>div]:grid [&>div]:grid-cols-[5.5rem_1fr] [&>div]:gap-4 [&>div]:border-b [&>div]:border-border [&>div]:py-5 min-[601px]:[&>div]:grid-cols-[7rem_1fr] [&_dd]:text-[0.88rem] [&_dd]:leading-[1.55] [&_dd]:text-muted [&_dt]:font-mono [&_dt]:text-[0.74rem] [&_dt]:text-[#d8ccff]">
          <div>
            <dt>Classic</dt>
            <dd>10 rounds with a cumulative score</dd>
          </div>
          <div>
            <dt>Death</dt>
            <dd>A streak that ends on an incorrect answer</dd>
          </div>
          <div>
            <dt>Account</dt>
            <dd>osu! sign-in is required to start a game</dd>
          </div>
          <div>
            <dt>Reporting</dt>
            <dd>Signed-in players can report catalog problems</dd>
          </div>
        </dl>
      </ProductSplit>

      <ProductFootnote>
        <p>
          osu!guessr is a separate hosted service with its own authentication,
          browser storage, analytics, and advertising behavior.
        </p>
        <TextLink href="/legal/privacy">
          Read the ecosystem privacy policy
        </TextLink>
      </ProductFootnote>
    </ProductPage>
  );
}
