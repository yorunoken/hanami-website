import type { ReactNode } from "react";

import Footer from "@/components/footer";
import Header from "@/components/header";
import { sectionSpacingClass, siteContainerClass, sitePageClass } from "@/components/layout/styles";
import { cn } from "@/lib/utils";

export const productHeroCopyClass = "relative z-20 max-w-180 motion-safe:animate-[reveal-up_500ms_80ms_cubic-bezier(0.2,0.7,0.2,1)_both]";
export const productTitleClass =
    "text-[clamp(3rem,13vw,4.6rem)] leading-[0.94] tracking-[-0.075em] text-white min-[601px]:text-[clamp(3.5rem,6.4vw,5.8rem)]";
export const productSubtitleClass = "mt-5 max-w-170 text-[clamp(1.25rem,2vw,1.75rem)] leading-[1.3] tracking-[-0.035em] text-[#e8e4e8]";
export const productBodyClass = "mt-[1.2rem] max-w-[62ch] text-[1rem] leading-7 text-muted";
export const sectionHeadingClass = "text-[clamp(1.9rem,3.6vw,3.25rem)] leading-[1.06] tracking-[-0.055em] text-white";
export const sectionBodyClass = "mt-4 max-w-[62ch] text-[clamp(1rem,1.3vw,1.08rem)] leading-7 text-muted";

export function ProductPage({ children }: { children: ReactNode }) {
    return (
        <div className={sitePageClass}>
            <Header />
            <main>{children}</main>
            <Footer />
        </div>
    );
}

export function ProductHero({ children, className }: { children: ReactNode; className?: string }) {
    return (
        <section className={cn("relative min-h-150 overflow-hidden border-b border-border max-[820px]:min-h-0", className)}>
            <div
                className={cn(
                    siteContainerClass,
                    "grid min-h-150 grid-cols-[minmax(0,0.88fr)_minmax(340px,0.72fr)] items-center gap-[clamp(3rem,8vw,8rem)] py-16 max-[1080px]:grid-cols-[minmax(0,1fr)_minmax(280px,0.65fr)] max-[1080px]:gap-8 max-[820px]:min-h-0 max-[820px]:grid-cols-1 max-[820px]:py-14",
                )}
            >
                {children}
            </div>
        </section>
    );
}

export function HeroActions({ children }: { children: ReactNode }) {
    return <div className="mt-8 flex flex-wrap gap-3 max-[600px]:flex-col max-[600px]:items-stretch">{children}</div>;
}

export function ProductSection({ children, className, ...props }: React.ComponentPropsWithoutRef<"section">) {
    return (
        <section {...props} className={cn(siteContainerClass, sectionSpacingClass, className)}>
            {children}
        </section>
    );
}

export function ProductSplit({ children, className }: { children: ReactNode; className?: string }) {
    return (
        <section className={cn("border-y border-border bg-surface", className)}>
            <div
                className={cn(
                    siteContainerClass,
                    sectionSpacingClass,
                    "grid grid-cols-[minmax(0,0.78fr)_minmax(320px,0.7fr)] items-start gap-[clamp(3rem,9vw,9rem)] max-[820px]:grid-cols-1 max-[820px]:gap-6",
                )}
            >
                {children}
            </div>
        </section>
    );
}

export function ProductFootnote({ children, className }: { children: ReactNode; className?: string }) {
    return (
        <aside
            className={cn(
                siteContainerClass,
                "flex items-center justify-between gap-8 py-10 max-[600px]:flex-col max-[600px]:items-start max-[600px]:gap-4 [&>p]:max-w-[70ch] [&>p]:text-[0.85rem] [&>p]:leading-[1.65] [&>p]:text-muted [&>p>strong]:text-white [&>svg]:size-5.5 [&>svg]:shrink-0",
                className,
            )}
        >
            {children}
        </aside>
    );
}

export function ProductSteps({ children, className }: { children: ReactNode; className?: string }) {
    return <ol className={cn("grid gap-5", className)}>{children}</ol>;
}

export function ProductStep({ children, icon }: { children: ReactNode; icon: ReactNode }) {
    return (
        <li className="grid grid-cols-[2rem_1fr] gap-4 py-2 [&_p]:mt-1.5 [&_p]:text-[0.86rem] [&_p]:leading-[1.6] [&_strong]:text-[0.95rem] [&_svg]:size-5 [&_svg]:text-accent-soft">
            {icon}
            <div>{children}</div>
        </li>
    );
}
