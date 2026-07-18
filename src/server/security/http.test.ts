import { describe, expect, it } from "bun:test";
import { APIError } from "better-auth/api";

import { getSafeErrorDetails } from "./http";

describe("safe authentication error diagnostics", () => {
    it("extracts Better Auth status and body codes without logging attached secrets", () => {
        const error = Object.assign(
            new APIError("BAD_REQUEST", {
                code: "ACCOUNT_NOT_FOUND",
                message: "Account not found",
            }),
            {
                accessToken: "must-not-be-logged",
                requestHeaders: { cookie: "must-not-be-logged" },
            },
        );

        const details = getSafeErrorDetails(error);
        expect(details).toEqual({
            name: "APIError",
            status: "BAD_REQUEST",
            statusCode: 400,
            code: "ACCOUNT_NOT_FOUND",
            message: "Account not found",
        });
        expect(JSON.stringify(details)).not.toContain("must-not-be-logged");
    });

    it("redacts messages that could contain authentication credentials", () => {
        expect(getSafeErrorDetails(new Error("Authorization code exchange included a secret token"))).toMatchObject({
            name: "Error",
            message: "Authentication provider operation failed.",
        });
    });
});
