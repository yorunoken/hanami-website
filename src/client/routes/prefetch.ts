import type { RoutePreloader } from "./route-modules";

export const prefetchRootMargin = "400px 0px";

interface NetworkInformationLike {
  saveData?: boolean;
}

interface NavigatorWithConnection extends Navigator {
  connection?: NetworkInformationLike;
}

export function prefersReducedData(): boolean {
  if (typeof navigator === "undefined") return false;

  const saveData = (navigator as NavigatorWithConnection).connection?.saveData;
  const mediaPreference =
    typeof window !== "undefined" &&
    typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-reduced-data: reduce)").matches;

  return Boolean(saveData || mediaPreference);
}

export function prefetchRoute(
  preload: RoutePreloader | undefined,
  onFailure?: () => void,
): void {
  if (!preload || prefersReducedData()) return;
  void preload().catch(() => onFailure?.());
}

export function prefetchAfterHandler<E extends { defaultPrevented: boolean }>(
  event: E,
  handler: ((event: E) => void) | undefined,
  preload: RoutePreloader | undefined,
  onFailure?: () => void,
): void {
  handler?.(event);
  if (!event.defaultPrevented) prefetchRoute(preload, onFailure);
}

export function observeRoutePrefetch(
  target: Element,
  preload: RoutePreloader | undefined,
  onFailure?: () => void,
  Observer:
    typeof IntersectionObserver | undefined = typeof IntersectionObserver ===
  "undefined"
    ? undefined
    : IntersectionObserver,
): () => void {
  if (!preload || !Observer || prefersReducedData()) return () => undefined;

  let active = true;
  const observer = new Observer(
    (entries) => {
      if (!entries.some((entry) => entry.isIntersecting)) return;

      void preload()
        .then(() => {
          if (active) observer.unobserve(target);
        })
        .catch(() => onFailure?.());
    },
    { rootMargin: prefetchRootMargin },
  );

  observer.observe(target);

  return () => {
    active = false;
    observer.disconnect();
  };
}
