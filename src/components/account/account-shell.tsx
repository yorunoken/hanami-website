import type { ReactNode } from "react";

import Footer from "@/components/footer";
import Header from "@/components/header";
import { siteContainerClass, sitePageClass } from "@/components/layout/styles";
import { Eyebrow } from "@/components/marketing";
import { cn } from "@/lib/utils";

export const accountPageClass = cn(sitePageClass, "bg-[linear-gradient(150deg,rgba(235,118,170,0.055),transparent_34%),var(--color-bg)]");

export const profileLayoutClass = "py-[clamp(2.75rem,5vw,4.5rem)]";

export const profileHeadingClass =
    "mb-10 max-w-220 [&>h1]:text-[clamp(2.15rem,4vw,3.35rem)] [&>h1]:leading-[1.04] [&>h1]:tracking-[-0.05em] [&>p:not(:first-child)]:mt-4 [&>p:not(:first-child)]:max-w-[62ch] [&>p:not(:first-child)]:text-[0.95rem] [&>p:not(:first-child)]:leading-[1.6] [&>p:not(:first-child)]:text-muted";

export const accountPanelClass = "overflow-hidden rounded-md border border-border bg-surface/55";

export const accountPanelHeaderClass =
    "grid grid-cols-1 gap-2 border-b border-border px-[clamp(1.35rem,3vw,2rem)] py-5 min-[701px]:grid-cols-[minmax(0,1fr)_minmax(14rem,0.8fr)] min-[701px]:items-end min-[701px]:gap-8 [&_h2]:text-[1.25rem] [&_h2]:tracking-[-0.025em] [&_p]:text-[0.8rem] [&_p]:leading-[1.55] [&_p]:text-muted";

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

export function AccountPageIntro({
    eyebrow,
    title,
    description,
    children,
    className,
}: {
    eyebrow: string;
    title: string;
    description: string;
    children?: ReactNode;
    className?: string;
}) {
    return (
        <header className={cn(profileHeadingClass, className)}>
            <Eyebrow>{eyebrow}</Eyebrow>
            <h1>{title}</h1>
            <p>{description}</p>
            {children}
        </header>
    );
}

export function AccountPanel({ children, className, ...props }: React.ComponentPropsWithoutRef<"section">) {
    return (
        <section {...props} className={cn(accountPanelClass, className)}>
            {children}
        </section>
    );
}

export function AccountPanelHeader({ title, description, id }: { title: string; description: string; id?: string }) {
    return (
        <div className={accountPanelHeaderClass}>
            <h2 id={id}>{title}</h2>
            <p>{description}</p>
        </div>
    );
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
                "w-[min(100%,600px)] rounded-md border border-border bg-surface/60 p-[clamp(1.75rem,5vw,3rem)] [&>h1]:text-[clamp(2.3rem,6vw,4rem)] [&>h1]:leading-[1.02] [&>h1]:tracking-[-0.055em] [&>p:not(:first-child)]:mt-[1.2rem] [&>p:not(:first-child)]:leading-[1.7] [&>p:not(:first-child)]:text-muted",
                className,
            )}
        >
            {children}
        </section>
    );
}
