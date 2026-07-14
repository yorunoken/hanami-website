import { describe, expect, it } from "bun:test";

import {
  observeRoutePrefetch,
  prefetchAfterHandler,
  prefetchRoute,
  prefetchRootMargin,
} from "./prefetch";

describe("route prefetch behavior", () => {
  it("runs supplied intent handlers before preloading", async () => {
    const calls: string[] = [];
    prefetchAfterHandler(
      { defaultPrevented: false },
      () => calls.push("handler"),
      async () => {
        calls.push("preload");
      },
    );

    await Promise.resolve();
    expect(calls).toEqual(["handler", "preload"]);
  });

  it("honors prevented intent events", async () => {
    let preloads = 0;
    prefetchAfterHandler({ defaultPrevented: true }, undefined, async () => {
      preloads += 1;
    });

    await Promise.resolve();
    expect(preloads).toBe(0);
  });

  it("prefetches on keyboard-focus intent", async () => {
    let preloads = 0;
    prefetchAfterHandler(
      { defaultPrevented: false, type: "focus" },
      undefined,
      async () => {
        preloads += 1;
      },
    );

    await Promise.resolve();
    expect(preloads).toBe(1);
  });

  it("prefetches on pointer-down intent", async () => {
    let preloads = 0;
    prefetchAfterHandler(
      { defaultPrevented: false, type: "pointerdown" },
      undefined,
      async () => {
        preloads += 1;
      },
    );

    await Promise.resolve();
    expect(preloads).toBe(1);
  });

  it("reports background failures without throwing", async () => {
    let failures = 0;
    prefetchRoute(
      async () => {
        throw new Error("network unavailable");
      },
      () => {
        failures += 1;
      },
    );

    await Promise.resolve();
    await Promise.resolve();
    expect(failures).toBe(1);
  });

  it("observes with the selected root margin and stops after success", async () => {
    let callback: IntersectionObserverCallback | undefined;
    let observed = 0;
    let unobserved = 0;
    let disconnected = 0;
    let configuredMargin: string | undefined;

    class ObserverStub {
      constructor(
        next: IntersectionObserverCallback,
        options?: IntersectionObserverInit,
      ) {
        callback = next;
        configuredMargin = options?.rootMargin;
      }
      observe() {
        observed += 1;
      }
      unobserve() {
        unobserved += 1;
      }
      disconnect() {
        disconnected += 1;
      }
      takeRecords() {
        return [];
      }
      readonly root = null;
      readonly rootMargin = prefetchRootMargin;
      readonly thresholds = [0];
    }

    const cleanup = observeRoutePrefetch(
      {} as Element,
      async () => undefined,
      undefined,
      ObserverStub,
    );

    expect(observed).toBe(1);
    expect(configuredMargin).toBe(prefetchRootMargin);
    callback?.(
      [{ isIntersecting: true } as IntersectionObserverEntry],
      {} as IntersectionObserver,
    );
    await Promise.resolve();
    expect(unobserved).toBe(1);

    cleanup();
    expect(disconnected).toBe(1);
  });

  it("gracefully skips viewport setup without IntersectionObserver", () => {
    let preloads = 0;
    const cleanup = observeRoutePrefetch(
      {} as Element,
      async () => {
        preloads += 1;
      },
      undefined,
      undefined,
    );

    cleanup();
    expect(preloads).toBe(0);
  });
});
