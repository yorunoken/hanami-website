import { forwardRef, useCallback, useEffect, useRef, type ForwardedRef } from "react";
import { Link, useResolvedPath, type LinkProps } from "react-router-dom";

import { preloadRoute } from "@/client/routes/client-components";

export type PrefetchMode = "none" | "intent" | "viewport" | "intent-and-viewport";

export interface PrefetchLinkProps extends Omit<LinkProps, "prefetch"> {
    prefetch?: PrefetchMode;
}

export const PrefetchLink = forwardRef<HTMLAnchorElement, PrefetchLinkProps>(function PrefetchLink(
    { prefetch = "none", onFocus, onPointerEnter, onTouchStart, to, ...props },
    forwardedRef,
) {
    const linkRef = useRef<HTMLAnchorElement | null>(null);
    const resolvedPath = useResolvedPath(to);
    const prefetchOnIntent = prefetch === "intent" || prefetch === "intent-and-viewport";
    const prefetchInViewport = prefetch === "viewport" || prefetch === "intent-and-viewport";

    const startPrefetch = useCallback(() => {
        void preloadRoute(resolvedPath.pathname).catch(() => undefined);
    }, [resolvedPath.pathname]);

    useEffect(() => {
        if (!prefetchInViewport || typeof IntersectionObserver === "undefined") return;

        const link = linkRef.current;
        if (!link) return;

        const observer = new IntersectionObserver(
            (entries) => {
                if (!entries.some((entry) => entry.isIntersecting)) return;

                startPrefetch();
                observer.disconnect();
            },
            { rootMargin: "240px" },
        );

        observer.observe(link);
        return () => observer.disconnect();
    }, [prefetchInViewport, startPrefetch]);

    return (
        <Link
            {...props}
            to={to}
            ref={(element) => {
                linkRef.current = element;
                assignRef(forwardedRef, element);
            }}
            onPointerEnter={(event) => {
                onPointerEnter?.(event);
                if (!event.defaultPrevented && prefetchOnIntent) startPrefetch();
            }}
            onFocus={(event) => {
                onFocus?.(event);
                if (!event.defaultPrevented && prefetchOnIntent) startPrefetch();
            }}
            onTouchStart={(event) => {
                onTouchStart?.(event);
                if (!event.defaultPrevented && prefetchOnIntent) startPrefetch();
            }}
        />
    );
});

function assignRef<T>(ref: ForwardedRef<T>, value: T | null) {
    if (typeof ref === "function") {
        ref(value);
    } else if (ref) {
        ref.current = value;
    }
}
