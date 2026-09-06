import { describe, expect, it } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";

import { getNextMenuItemIndex, ProfileActionView, type HeaderSession } from "./profile-action";

const session = {
    user: {
        id: "user-1",
        name: "Hanami Player",
        email: "discord-123@discord.invalid",
        image: "https://cdn.discordapp.com/avatar.png",
        emailVerified: false,
        createdAt: new Date("2026-07-15T00:00:00Z"),
        updatedAt: new Date("2026-07-15T00:00:00Z"),
    },
    session: {
        id: "session-1",
        userId: "user-1",
        token: "token",
        expiresAt: new Date("2026-07-16T00:00:00Z"),
        createdAt: new Date("2026-07-15T00:00:00Z"),
        updatedAt: new Date("2026-07-15T00:00:00Z"),
    },
} as HeaderSession;

describe("header account control", () => {
    it("reserves pending space without showing the wrong auth action", () => {
        const markup = render({ session: null, isPending: true });
        expect(markup).toContain("Checking sign-in status");
        expect(markup).not.toContain("Sign in");
        expect(markup).not.toContain("Open account menu");
    });

    it("links signed-out users to the provider-neutral login page", () => {
        const markup = render({ session: null, isPending: false });
        expect(markup).toContain('aria-label="Sign in to Hanami"');
        expect(markup).toContain('href="/login"');
        expect(markup).toContain("Sign in");
        expect(markup).not.toContain("Discord");
    });

    it("shows the compact account control without exposing email when signed in", () => {
        const markup = render({ session, isPending: false });
        expect(markup).toContain('aria-label="Open account menu for Hanami Player"');
        expect(markup).toContain("avatar.png");
        expect(markup).not.toContain("discord.invalid");
    });

    it("supports wrapping arrow navigation plus Home and End", () => {
        expect(getNextMenuItemIndex(0, "ArrowUp", 3)).toBe(2);
        expect(getNextMenuItemIndex(2, "ArrowDown", 3)).toBe(0);
        expect(getNextMenuItemIndex(1, "Home", 3)).toBe(0);
        expect(getNextMenuItemIndex(1, "End", 3)).toBe(2);
        expect(getNextMenuItemIndex(1, "Escape", 3)).toBeNull();
    });
});

function render({ session: currentSession, isPending }: { session: HeaderSession | null; isPending: boolean }): string {
    return renderToStaticMarkup(
        <MemoryRouter>
            <ProfileActionView
                session={currentSession}
                isPending={isPending}
                routeKey="/"
                onSignOut={async () => {}}
            />
        </MemoryRouter>,
    );
}
