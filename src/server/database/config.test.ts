import { describe, expect, test } from "bun:test";

import { assertDisposableTestDatabase, assertSeparateDatabases, parseMariaDbConnection } from "./config";

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

describe("assertDisposableTestDatabase", () => {
    test("rejects a database name without an explicit disposable marker", () => {
        expect(() => assertDisposableTestDatabase("mysql://test:password@db.example/hanami")).toThrow(
            "TEST_DATABASE_URL must use a database name explicitly marked test-only or disposable",
        );
    });

    test("rejects the configured Web database even when its name is marked test-only", () => {
        expect(() =>
            assertDisposableTestDatabase("mysql://test:password@db.example/hanami_test", {
                webUrl: "mysql://web:password@db.example/hanami_test",
            }),
        ).toThrow("WEB_DATABASE_URL and BOT_DATABASE_URL must point to different databases");
    });

    test("rejects the configured Bot database even when its name is marked disposable", () => {
        expect(() =>
            assertDisposableTestDatabase("mysql://test:password@db.example/hanami-disposable", {
                botUrl: "mysql://bot:password@db.example/hanami-disposable",
            }),
        ).toThrow("WEB_DATABASE_URL and BOT_DATABASE_URL must point to different databases");
    });

    test("allows a distinct explicitly marked test database", () => {
        expect(() =>
            assertDisposableTestDatabase("mysql://test:password@db.example/hanami_test", {
                webUrl: "mysql://web:password@db.example/hanami_web",
                botUrl: "mysql://bot:password@db.example/hanami_bot",
            }),
        ).not.toThrow();
    });
});
