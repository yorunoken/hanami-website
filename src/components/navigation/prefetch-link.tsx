import {
  forwardRef,
  useCallback,
  useEffect,
  useRef,
  useState,
  type FocusEvent,
  type ForwardedRef,
  type PointerEvent,
} from "react";
import { Link, type LinkProps } from "react-router-dom";

import { getRoutePreloader } from "@/client/routes/route-modules";
import {
  observeRoutePrefetch,
  prefetchAfterHandler,
} from "@/client/routes/prefetch";

export type PrefetchMode =
  "none" | "intent" | "viewport" | "intent-and-viewport";

export interface PrefetchLinkProps extends Omit<LinkProps, "prefetch"> {
  prefetch?: PrefetchMode;
}

function assignRef<T>(ref: ForwardedRef<T>, value: T | null) {
  if (typeof ref === "function") ref(value);
  else if (ref) ref.current = value;
}

function pathFromTo(to: LinkProps["to"]): string | undefined {
  if (typeof to === "string") return to.split(/[?#]/, 1)[0];
  return to.pathname;
}

export const PrefetchLink = forwardRef<HTMLAnchorElement, PrefetchLinkProps>(
  function PrefetchLink(
    {
      onFocus,
      onPointerDown,
      onPointerEnter,
      prefetch = "intent",
      reloadDocument,
      to,
      ...props
    },
    forwardedRef,
  ) {
    const elementRef = useRef<HTMLAnchorElement | null>(null);
    const [prefetchFailed, setPrefetchFailed] = useState(false);
    const preload = getRoutePreloader(pathFromTo(to) ?? "");
    const usesIntent =
      prefetch === "intent" || prefetch === "intent-and-viewport";
    const usesViewport =
      prefetch === "viewport" || prefetch === "intent-and-viewport";

    const setRef = useCallback(
      (element: HTMLAnchorElement | null) => {
        elementRef.current = element;
        assignRef(forwardedRef, element);
      },
      [forwardedRef],
    );

    useEffect(() => {
      if (!usesViewport || !elementRef.current) return;
      return observeRoutePrefetch(elementRef.current, preload, () =>
        setPrefetchFailed(true),
      );
    }, [preload, usesViewport]);

    return (
      <Link
        {...props}
        ref={setRef}
        to={to}
        reloadDocument={reloadDocument || prefetchFailed}
        onFocus={(event: FocusEvent<HTMLAnchorElement>) => {
          if (usesIntent)
            prefetchAfterHandler(event, onFocus, preload, () =>
              setPrefetchFailed(true),
            );
          else onFocus?.(event);
        }}
        onPointerDown={(event: PointerEvent<HTMLAnchorElement>) => {
          if (usesIntent)
            prefetchAfterHandler(event, onPointerDown, preload, () =>
              setPrefetchFailed(true),
            );
          else onPointerDown?.(event);
        }}
        onPointerEnter={(event: PointerEvent<HTMLAnchorElement>) => {
          if (usesIntent)
            prefetchAfterHandler(event, onPointerEnter, preload, () =>
              setPrefetchFailed(true),
            );
          else onPointerEnter?.(event);
        }}
      />
    );
  },
);
