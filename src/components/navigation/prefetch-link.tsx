import { forwardRef } from "react";
import { Link, type LinkProps } from "react-router-dom";

export type PrefetchMode = "none" | "intent" | "viewport" | "intent-and-viewport";

export interface PrefetchLinkProps extends Omit<LinkProps, "prefetch"> {
    prefetch?: PrefetchMode;
}

export const PrefetchLink = forwardRef<HTMLAnchorElement, PrefetchLinkProps>(function PrefetchLink({ prefetch, ...props }, forwardedRef) {
    void prefetch;
    return <Link {...props} ref={forwardedRef} />;
});
