import { ArrowRight, ArrowUpRight } from "lucide-react";
import type { ReactNode } from "react";

import {
  PrefetchLink,
  type PrefetchMode,
} from "@/components/navigation/prefetch-link";
import {
  primaryActionClass,
  secondaryActionClass,
} from "@/components/ui/action-styles";
import { cn } from "@/lib/utils";

const actionVariants = {
  primary: "",
  secondary: secondaryActionClass,
} as const;

const statusToneClasses = {
  rose: "bg-accent",
  violet: "bg-violet",
  cyan: "bg-cyan",
  lime: "bg-lime",
} as const;

interface ActionLinkProps {
  children: ReactNode;
  className?: string;
  href: string;
  variant?: "primary" | "secondary";
  external?: boolean;
  prefetch?: PrefetchMode;
}

export function ActionLink({
  children,
  className,
  href,
  variant = "primary",
  external = false,
  prefetch = "intent",
}: ActionLinkProps) {
  const classes = cn(primaryActionClass, actionVariants[variant], className);
  const content = (
    <>
      <span>{children}</span>
      {external ? (
        <ArrowUpRight aria-hidden="true" />
      ) : (
        <ArrowRight aria-hidden="true" />
      )}
    </>
  );

  if (external) {
    return (
      <a className={classes} href={href} target="_blank" rel="noreferrer">
        {content}
      </a>
    );
  }

  if (href.startsWith("#")) {
    return (
      <a className={classes} href={href}>
        {content}
      </a>
    );
  }

  return (
    <PrefetchLink className={classes} to={href} prefetch={prefetch}>
      {content}
    </PrefetchLink>
  );
}

export function Eyebrow({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <p
      className={cn(
        "mb-[1.1rem] font-mono text-[0.72rem] leading-[1.4] font-semibold tracking-[0.14em] text-accent-soft uppercase",
        className,
      )}
    >
      {children}
    </p>
  );
}

export function StatusLine({
  status,
  detail,
  tone = "rose",
}: {
  status: string;
  detail: string;
  tone?: "rose" | "violet" | "cyan" | "lime";
}) {
  return (
    <p className="mb-[1.2rem] flex items-center gap-[0.55rem] text-[0.76rem] text-muted">
      <span
        className={cn("size-[7px] rounded-full", statusToneClasses[tone])}
        aria-hidden="true"
      />
      <strong className="font-bold text-white">{status}</strong>
      <span className="h-4 w-px bg-border-strong" aria-hidden="true" />
      {detail}
    </p>
  );
}

export function SectionIntro({
  eyebrow,
  title,
  body,
}: {
  eyebrow: string;
  title: string;
  body?: string;
}) {
  return (
    <header className="mb-[clamp(2.5rem,5vw,4.5rem)] max-w-[720px]">
      <Eyebrow>{eyebrow}</Eyebrow>
      <h2 className="text-[clamp(2rem,4.2vw,3.8rem)] leading-[1.04] tracking-[-0.055em] text-white">
        {title}
      </h2>
      {body && (
        <p className="mt-5 max-w-[62ch] text-[clamp(1rem,1.4vw,1.1rem)] leading-7 text-muted">
          {body}
        </p>
      )}
    </header>
  );
}

export function TextLink({
  children,
  className,
  href,
  external = false,
  prefetch = "intent",
}: {
  children: ReactNode;
  className?: string;
  href: string;
  external?: boolean;
  prefetch?: PrefetchMode;
}) {
  const content = (
    <>
      <span>{children}</span>
      {external ? (
        <ArrowUpRight aria-hidden="true" />
      ) : (
        <ArrowRight aria-hidden="true" />
      )}
    </>
  );

  if (external) {
    return (
      <a
        className={cn(
          "inline-flex w-fit items-center gap-[0.55rem] border-b border-border-strong pb-[0.3rem] text-[0.86rem] font-bold text-white no-underline transition-colors duration-[160ms] hover:border-current hover:text-accent-soft [&_svg]:size-4",
          className,
        )}
        href={href}
        target="_blank"
        rel="noreferrer"
      >
        {content}
      </a>
    );
  }

  return (
    <PrefetchLink
      className={cn(
        "inline-flex w-fit items-center gap-[0.55rem] border-b border-border-strong pb-[0.3rem] text-[0.86rem] font-bold text-white no-underline transition-colors duration-[160ms] hover:border-current hover:text-accent-soft [&_svg]:size-4",
        className,
      )}
      to={href}
      prefetch={prefetch}
    >
      {content}
    </PrefetchLink>
  );
}
