import { Menu, X } from "lucide-react";
import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";

import { routes } from "@/client/routes/paths";
import { PrefetchLink } from "@/components/navigation/prefetch-link";
import ProfileAction from "@/components/navigation/profile-action";
import { navigation, siteConfig } from "@/data/site-config";

export default function Header() {
    const [menuOpen, setMenuOpen] = useState(false);
    const { pathname } = useLocation();

    useEffect(() => {
        setMenuOpen(false);
    }, [pathname]);

    useEffect(() => {
        const closeOnEscape = (event: KeyboardEvent) => {
            if (event.key === "Escape") setMenuOpen(false);
        };

        document.addEventListener("keydown", closeOnEscape);
        return () => document.removeEventListener("keydown", closeOnEscape);
    }, []);

    return (
        <header className="sticky top-0 isolate z-50 h-18 border-b border-border bg-[rgba(10,9,12,0.88)] backdrop-blur-2xl print:hidden">
            <div className="mx-auto flex h-full w-[min(calc(100%-1.5rem),1400px)] items-center gap-6 sm:w-[min(calc(100%-clamp(2rem,6vw,6rem)),1400px)]">
                <PrefetchLink
                    to={routes.home}
                    prefetch="none"
                    className="inline-flex shrink-0 items-center gap-[0.65rem] text-[0.95rem] font-extrabold tracking-[-0.02em] text-white no-underline"
                    aria-label="Hanami home"
                >
                    <img className="size-9.5 object-contain" src="/hanami-transparent.png" alt="" width="42" height="42" />
                    <span>Hanami</span>
                </PrefetchLink>

                <nav className="ml-auto hidden items-center gap-[clamp(1rem,2.2vw,2rem)] min-[1081px]:flex" aria-label="Primary navigation">
                    {navigation.map((item) => (
                        <PrefetchLink
                            key={item.to}
                            to={item.to}
                            prefetch="intent"
                            aria-current={pathname === item.to ? "page" : undefined}
                            className="relative py-6 text-[0.82rem] font-semibold whitespace-nowrap text-muted no-underline transition-colors duration-160 after:absolute after:inset-x-0 after:bottom-[0.95rem] after:h-px after:origin-left after:scale-x-0 after:bg-current after:transition-transform after:duration-160 hover:text-white hover:after:scale-x-100 aria-[current=page]:text-white aria-[current=page]:after:scale-x-100"
                        >
                            {item.label}
                        </PrefetchLink>
                    ))}
                </nav>

                <div className="ml-auto flex items-center gap-1.5 min-[1081px]:ml-0">
                    <ProfileAction mobileNavigationOpen={menuOpen} onMenuOpen={() => setMenuOpen(false)} />
                    <button
                        className="inline-flex min-h-10 w-10.5 items-center justify-center border-0 bg-transparent text-white min-[1081px]:hidden [&_svg]:size-4.5"
                        type="button"
                        aria-expanded={menuOpen}
                        aria-controls="mobile-navigation"
                        aria-label={menuOpen ? "Close navigation" : "Open navigation"}
                        onClick={() => setMenuOpen((open) => !open)}
                    >
                        {menuOpen ? <X aria-hidden="true" /> : <Menu aria-hidden="true" />}
                    </button>
                </div>
            </div>

            <nav
                id="mobile-navigation"
                className="absolute inset-x-0 top-18 min-h-[calc(100svh-72px)] bg-[rgba(10,9,12,0.98)] px-[clamp(1.25rem,5vw,3rem)] py-8 motion-safe:animate-[nav-in_180ms_ease_both] min-[1081px]:hidden"
                aria-label="Mobile navigation"
                hidden={!menuOpen}
            >
                <div className="mb-8 pb-2">
                    <p className="mb-3 font-mono text-[0.65rem] tracking-[0.12em] text-accent-soft uppercase">Hanami</p>
                    <PrefetchLink
                        className="flex min-h-14 items-center text-[1.35rem] font-bold text-white no-underline"
                        to={routes.home}
                        prefetch="none"
                    >
                        Overview
                    </PrefetchLink>
                </div>
                <div className="grid">
                    {navigation.map((item) => (
                        <PrefetchLink
                            className="flex min-h-16 items-center text-[clamp(1.15rem,5vw,1.55rem)] font-bold text-white no-underline"
                            key={item.to}
                            to={item.to}
                            prefetch="intent"
                        >
                            {item.label}
                        </PrefetchLink>
                    ))}
                </div>
                <div className="flex flex-wrap gap-x-6 gap-y-4 pt-8 [&_a]:text-[0.85rem] [&_a]:text-muted">
                    <a href={siteConfig.links.community} target="_blank" rel="noreferrer">
                        Community
                    </a>
                    <a href={siteConfig.links.organization} target="_blank" rel="noreferrer">
                        GitHub
                    </a>
                </div>
            </nav>
        </header>
    );
}
