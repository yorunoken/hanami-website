import Header from "@/components/header";
import { sitePageClass } from "./styles";

export function RouteFallback() {
    return (
        <div className={sitePageClass}>
            <Header />
            <main
                className="mx-auto flex min-h-[calc(100svh-72px)] w-[min(calc(100%_-_2rem),1240px)] items-center"
                aria-live="polite"
                aria-busy="true"
            >
                <span className="font-mono text-xs tracking-[0.12em] text-quiet uppercase">Loading page…</span>
            </main>
        </div>
    );
}
