import { describe, expect, test } from "bun:test";

import { assertSeparateDatabases, parseMariaDbConnection } from "./config";

describe("parseMariaDbConnection", () => {
    test("decodes credentials and removes brackets from an IPv6 host", () => {
        expect(parseMariaDbConnection("mysql://web%40user:p%40ss%3Aword@[2001:DB8::1]:3307/hanami", "web")).toEqual({
            host: "2001:db8::1",
            port: 3307,
            user: "web@user",
            password: "p@ss:word",
            database: "hanami",
        });
    });

    test("rejects non-MySQL protocols with a role-specific error", () => {
        expect(() => parseMariaDbConnection("postgresql://user:password@db.example/hanami", "web")).toThrow(
            "WEB_DATABASE_URL must use the mysql:// protocol",
        );
    });

    test("rejects URLs without a database name", () => {
        expect(() => parseMariaDbConnection("mysql://user:password@db.example/", "bot")).toThrow(
            "BOT_DATABASE_URL must include a database name",
        );
    });
});

describe("assertSeparateDatabases", () => {
    test("rejects equivalent databases after normalizing host names and default ports", () => {
        expect(() =>
            assertSeparateDatabases("mysql://web:password@DB.Example.com:3306/hanami", "mysql://bot:password@db.example.com/hanami"),
        ).toThrow("WEB_DATABASE_URL and BOT_DATABASE_URL must point to different databases");
    });

    test("allows distinct databases on the same normalized server", () => {
        expect(() =>
            assertSeparateDatabases("mysql://web:password@DB.Example.com:3306/hanami", "mysql://bot:password@db.example.com/hanami_bot"),
        ).not.toThrow();
    });
});
