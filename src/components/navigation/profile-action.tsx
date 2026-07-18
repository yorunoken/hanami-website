import { ChevronDown, LogIn, LogOut, Shield, UserRound } from "lucide-react";
import { useEffect, useRef, useState, type KeyboardEvent as ReactKeyboardEvent } from "react";
import { useLocation, useNavigate } from "react-router-dom";

import { claimPendingAttempt, signOutFromHanami, useSession } from "@/client/lib/auth";
import { createLoginPath } from "@/client/lib/auth-navigation";
import { routes } from "@/client/routes/paths";
import { cn } from "@/lib/utils";

import { PrefetchLink } from "./prefetch-link";
import { accountActionClass } from "./styles";

const controlFrameClass = "relative flex w-36 shrink-0 justify-end max-[600px]:w-24";
const menuItemClass =
    "group relative flex min-h-12 w-full items-center gap-3 border-0 border-b border-border bg-transparent px-4 text-left text-[0.82rem] font-bold text-muted no-underline transition-[background,color] duration-160 before:absolute before:inset-y-3 before:left-0 before:w-px before:origin-center before:scale-y-0 before:bg-accent before:transition-transform before:duration-160 hover:bg-white/[0.035] hover:text-white hover:before:scale-y-100 focus-visible:bg-white/[0.035] focus-visible:text-white focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-accent/50 focus-visible:before:scale-y-100 disabled:cursor-progress disabled:opacity-60 [&_svg]:size-4 [&_svg]:shrink-0";

export default function ProfileAction({
    mobileNavigationOpen = false,
    onMenuOpen,
}: {
    mobileNavigationOpen?: boolean;
    onMenuOpen?: () => void;
}) {
    const { data: session, isPending } = useSession();
    const navigate = useNavigate();
    const location = useLocation();

    async function handleSignOut() {
        await signOutFromHanami();
        navigate(routes.home, { replace: true });
    }

    return (
        <ProfileActionView
            session={session}
            isPending={isPending}
            routeKey={`${location.pathname}${location.search}`}
            mobileNavigationOpen={mobileNavigationOpen}
            onSignOut={handleSignOut}
            onMenuOpen={onMenuOpen}
        />
    );
}

export type HeaderSession = NonNullable<ReturnType<typeof useSession>["data"]>;

export function ProfileActionView({
    session,
    isPending,
    routeKey,
    mobileNavigationOpen = false,
    onSignOut,
    onMenuOpen,
}: {
    session: HeaderSession | null;
    isPending: boolean;
    routeKey: string;
    mobileNavigationOpen?: boolean;
    onSignOut: () => Promise<void>;
    onMenuOpen?: () => void;
}) {
    const buttonRef = useRef<HTMLButtonElement>(null);
    const menuRef = useRef<HTMLDivElement>(null);
    const signOutPending = useRef(false);
    const [menuOpen, setMenuOpen] = useState(false);
    const [avatarFailed, setAvatarFailed] = useState(false);
    const [isSigningOut, setIsSigningOut] = useState(false);
    const [signOutError, setSignOutError] = useState<string | null>(null);

    useEffect(() => {
        setMenuOpen(false);
    }, [routeKey]);

    useEffect(() => {
        if (mobileNavigationOpen) setMenuOpen(false);
    }, [mobileNavigationOpen]);

    useEffect(() => {
        setAvatarFailed(false);
    }, [session?.user.image]);

    useEffect(() => {
        if (!menuOpen) return;

        const closeOnOutsideInteraction = (event: PointerEvent) => {
            const target = event.target as Node;
            if (!menuRef.current?.contains(target) && !buttonRef.current?.contains(target)) setMenuOpen(false);
        };

        document.addEventListener("pointerdown", closeOnOutsideInteraction);
        return () => document.removeEventListener("pointerdown", closeOnOutsideInteraction);
    }, [menuOpen]);

    function openMenu(focus?: "first" | "last") {
        onMenuOpen?.();
        setMenuOpen(true);
        if (!focus) return;
        requestAnimationFrame(() => {
            const items = getMenuItems(menuRef.current);
            (focus === "last" ? items.at(-1) : items[0])?.focus();
        });
    }

    function closeMenu({ restoreFocus = false } = {}) {
        setMenuOpen(false);
        if (restoreFocus) requestAnimationFrame(() => buttonRef.current?.focus());
    }

    function handleMenuButtonKeyDown(event: ReactKeyboardEvent<HTMLButtonElement>) {
        if (event.key === "ArrowDown" || event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            openMenu("first");
        } else if (event.key === "ArrowUp") {
            event.preventDefault();
            openMenu("last");
        }
    }

    function handleMenuKeyDown(event: ReactKeyboardEvent<HTMLDivElement>) {
        if (event.key === "Escape") {
            event.preventDefault();
            closeMenu({ restoreFocus: true });
            return;
        }
        if (event.key === "Tab") {
            closeMenu();
            return;
        }

        const items = getMenuItems(menuRef.current);
        const currentIndex = items.indexOf(document.activeElement as HTMLElement);
        const nextIndex = getNextMenuItemIndex(currentIndex, event.key, items.length);
        if (nextIndex === null) return;

        event.preventDefault();
        items[nextIndex]?.focus();
    }

    async function startSignOut() {
        if (!claimPendingAttempt(signOutPending)) return;
        setIsSigningOut(true);
        setSignOutError(null);

        try {
            await onSignOut();
            closeMenu();
        } catch {
            signOutPending.current = false;
            setSignOutError("Sign out could not be completed. Please try again.");
            setIsSigningOut(false);
        }
    }

    if (isPending) {
        return (
            <div className={controlFrameClass} aria-label="Checking sign-in status" role="status">
                <span className="h-10 w-full animate-pulse rounded-sm bg-white/[0.045] motion-reduce:animate-none" aria-hidden="true" />
            </div>
        );
    }

    if (!session) {
        return (
            <div className={controlFrameClass}>
                <PrefetchLink
                    className={cn(accountActionClass, "w-full border-0 bg-transparent px-2 whitespace-nowrap")}
                    to={createLoginPath(routes.profile)}
                    prefetch="intent"
                >
                    <LogIn aria-hidden="true" />
                    <span>Sign in</span>
                </PrefetchLink>
            </div>
        );
    }

    const displayName = session.user.name || "Hanami user";
    const showAvatar = Boolean(session.user.image) && !avatarFailed;

    return (
        <div className={controlFrameClass}>
            <button
                ref={buttonRef}
                className={cn(accountActionClass, "ml-auto w-full border-0 bg-transparent px-1.5")}
                type="button"
                aria-expanded={menuOpen}
                aria-haspopup="menu"
                aria-controls="account-menu"
                aria-label={`Open account menu for ${displayName}`}
                onClick={() => (menuOpen ? closeMenu() : openMenu())}
                onKeyDown={handleMenuButtonKeyDown}
            >
                {showAvatar ? (
                    <img
                        className="size-8 rounded-full object-cover"
                        src={session.user.image ?? undefined}
                        alt=""
                        width="32"
                        height="32"
                        onError={() => setAvatarFailed(true)}
                    />
                ) : (
                    <span
                        className="grid size-8 place-items-center rounded-full border border-border-strong bg-surface-strong text-[0.75rem] text-white"
                        aria-hidden="true"
                    >
                        {displayName.slice(0, 1).toUpperCase()}
                    </span>
                )}
                <span className="max-w-16 truncate max-[600px]:sr-only">Account</span>
                <ChevronDown className={cn("transition-transform duration-160", menuOpen && "rotate-180")} aria-hidden="true" />
            </button>

            {menuOpen && (
                <div
                    ref={menuRef}
                    id="account-menu"
                    className="absolute top-[calc(100%+0.75rem)] right-0 z-50 w-72 max-w-[calc(100vw-2rem)] origin-top-right border border-border-strong bg-[#0d0b0f] shadow-[0_22px_60px_rgba(0,0,0,0.44)] motion-safe:animate-[nav-in_150ms_cubic-bezier(0.2,0.7,0.2,1)_both]"
                    role="menu"
                    aria-label="Account"
                    onKeyDown={handleMenuKeyDown}
                >
                    <PrefetchLink
                        className={menuItemClass}
                        to={routes.profile}
                        prefetch="intent"
                        role="menuitem"
                        onClick={() => closeMenu({ restoreFocus: true })}
                    >
                        <UserRound aria-hidden="true" /> Account
                    </PrefetchLink>
                    <PrefetchLink
                        className={menuItemClass}
                        to={routes.profilePrivacy}
                        prefetch="intent"
                        role="menuitem"
                        onClick={() => closeMenu({ restoreFocus: true })}
                    >
                        <Shield aria-hidden="true" /> Privacy and deletion
                    </PrefetchLink>
                    <button className={menuItemClass} type="button" role="menuitem" onClick={startSignOut} disabled={isSigningOut}>
                        <LogOut aria-hidden="true" /> {isSigningOut ? "Signing out…" : "Sign out"}
                    </button>
                    {signOutError && (
                        <p className="px-4 py-3 text-[0.75rem] leading-normal text-danger" role="alert">
                            {signOutError}
                        </p>
                    )}
                </div>
            )}
        </div>
    );
}

export function getNextMenuItemIndex(currentIndex: number, key: string, itemCount: number): number | null {
    if (itemCount === 0) return null;
    if (key === "Home") return 0;
    if (key === "End") return itemCount - 1;
    if (key === "ArrowDown") return currentIndex < 0 ? 0 : (currentIndex + 1) % itemCount;
    if (key === "ArrowUp") return currentIndex < 0 ? itemCount - 1 : (currentIndex - 1 + itemCount) % itemCount;
    return null;
}

function getMenuItems(menu: HTMLDivElement | null): HTMLElement[] {
    return Array.from(menu?.querySelectorAll<HTMLElement>("[role='menuitem']:not(:disabled)") ?? []);
}
