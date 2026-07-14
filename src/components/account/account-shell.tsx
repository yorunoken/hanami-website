import type { ReactNode } from "react";

import Footer from "@/components/footer";
import Header from "@/components/header";
import { siteContainerClass, sitePageClass } from "@/components/layout/styles";
import { cn } from "@/lib/utils";

export const accountPageClass = cn(sitePageClass, "bg-[linear-gradient(150deg,rgba(235,118,170,0.055),transparent_34%),var(--color-bg)]");

export const accountHeadingClass =
    "mb-16 max-w-195 [&>h1]:text-[clamp(2.6rem,6vw,5rem)] [&>h1]:leading-none [&>h1]:tracking-[-0.06em] [&>p:not(:first-child)]:mt-5 [&>p:not(:first-child)]:max-w-[62ch] [&>p:not(:first-child)]:leading-[1.7] [&>p:not(:first-child)]:text-muted";

export const sectionHeadingClass =
    "grid grid-cols-1 items-end gap-6 border-b border-border-strong pb-5 min-[821px]:grid-cols-2 min-[821px]:gap-8 [&_h2]:text-[1.45rem] [&_h2]:tracking-[-0.035em] [&_p]:text-[0.84rem] [&_p]:leading-[1.55] [&_p]:text-muted";

export function AccountPage({ children }: { children: ReactNode }) {
    return (
        <div className={accountPageClass}>
            <Header />
            {children}
            <Footer />
        </div>
    );
}

export function AccountLayout({ children, className }: { children: ReactNode; className?: string }) {
    return <main className={cn(siteContainerClass, "py-[clamp(4rem,8vw,7rem)]", className)}>{children}</main>;
}

export function AuthLayout({ children }: { children: ReactNode }) {
    return (
        <AccountPage>
            <main className={cn(siteContainerClass, "grid min-h-155 place-items-center py-20")}>{children}</main>
        </AccountPage>
    );
}

export function AuthPanel({ children, className, ...props }: React.ComponentPropsWithoutRef<"section">) {
    return (
        <section
            {...props}
            className={cn(
                "w-[min(100%,560px)] border-y border-border-strong py-10 [&>h1]:text-[clamp(2.3rem,6vw,4rem)] [&>h1]:leading-[1.02] [&>h1]:tracking-[-0.055em] [&>p:not(:first-child)]:mt-[1.2rem] [&>p:not(:first-child)]:leading-[1.7] [&>p:not(:first-child)]:text-muted",
                className,
            )}
        >
            {children}
        </section>
    );
}
