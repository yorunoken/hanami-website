import { describe, expect, it } from "bun:test";

import {
    createLoginPath,
    createProtectedLoginPath,
    describeOAuthError,
    getAuthenticatedLoginDestination,
    getCanonicalDevelopmentAuthURL,
    readReturnTo,
    validateReturnTo,
} from "./auth-navigation";

describe("post-authentication destinations", () => {
    it("accepts internal paths while preserving queries and hashes", () => {
        expect(validateReturnTo("/profile/privacy?source=account#request")).toBe("/profile/privacy?source=account#request");
        expect(readReturnTo("?returnTo=%2Fprofile%2Fprivacy%3Ftab%3Drequest%23status")).toBe("/profile/privacy?tab=request#status");
    });

    it("rejects external, protocol-relative, backslash, and auth endpoint destinations", () => {
        for (const value of [
            "https://example.com/profile",
            "//example.com/profile",
            "/\\example.com/profile",
            "/api/auth/callback/discord",
            "/api%2Fauth%2Fcallback%2Fdiscord",
            "/login",
        ]) {
            expect(validateReturnTo(value)).toBe("/profile");
        }
    });

    it("rejects encoded backslash variants and malformed values safely", () => {
        expect(readReturnTo("?returnTo=%2F%255Cexample.com")).toBe("/profile");
        expect(readReturnTo("?returnTo=%2F%252525252525252Fexample.com")).toBe("/profile");
        expect(readReturnTo("?returnTo=%2Fprofile%250Aadmin")).toBe("/profile");
        expect(readReturnTo("?returnTo=%E0%A4%A")).toBe("/profile");
        expect(validateReturnTo("/profile/%E0%A4%A")).toBe("/profile");
    });

    it("builds a login route with the validated destination", () => {
        expect(createLoginPath("/profile/privacy?tab=request#status")).toBe(
            "/login?returnTo=%2Fprofile%2Fprivacy%3Ftab%3Drequest%23status",
        );
        expect(createLoginPath("//example.com")).toBe("/login?returnTo=%2Fprofile");
    });

    it("preserves a protected route pathname, query, and hash", () => {
        expect(createProtectedLoginPath({ pathname: "/profile/privacy", search: "?tab=request", hash: "#status" })).toBe(
            "/login?returnTo=%2Fprofile%2Fprivacy%3Ftab%3Drequest%23status",
        );
    });

    it("uses a safe fallback and human-readable OAuth errors", () => {
        expect(readReturnTo("")).toBe("/profile");
        expect(describeOAuthError("access_denied")).toContain("cancelled");
        expect(describeOAuthError("state_security_mismatch")).toContain("could not be verified");
        expect(describeOAuthError("unable_to_create_session")).not.toContain("unable_to_create_session");
        expect(describeOAuthError("raw-provider-stack")).toBe("Provider sign-in did not complete. Please try again.");
    });

    it("keeps the development auth flow on the callback hostname", () => {
        expect(getCanonicalDevelopmentAuthURL("http://127.0.0.1:5173/profile?tab=osu#identity", true)).toBe(
            "http://localhost:5173/profile?tab=osu#identity",
        );
        expect(getCanonicalDevelopmentAuthURL("http://[::1]:5173/login", true)).toBe("http://localhost:5173/login");
        expect(getCanonicalDevelopmentAuthURL("http://localhost:5173/profile", true)).toBeNull();
        expect(getCanonicalDevelopmentAuthURL("https://hanami.yorunoken.com/profile", false)).toBeNull();
    });

    it("redirects an authenticated login visit without exposing the form", () => {
        expect(getAuthenticatedLoginDestination(true, true, "/profile/privacy")).toBeNull();
        expect(getAuthenticatedLoginDestination(false, false, "/profile/privacy")).toBeNull();
        expect(getAuthenticatedLoginDestination(false, true, "/profile/privacy")).toBe("/profile/privacy");
        expect(getAuthenticatedLoginDestination(false, true, "//example.com")).toBe("/profile");
    });
});
