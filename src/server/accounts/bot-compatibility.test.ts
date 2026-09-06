import { describe, expect, it, mock } from "bun:test";

import { BotAccountCompatibility, type BotAccountDatabase } from "./bot-compatibility";

describe("Bot account compatibility", () => {
    it("writes banchoId only when one canonical user owns both providers", async () => {
        const upsert = mock(async () => undefined);
        const clear = mock(async () => undefined);
        const database: BotAccountDatabase = { user: { upsert, updateMany: clear } };
        const accounts = {
            listLoginMethods: mock(async () => [
                { provider: "discord" as const, providerUserId: "123456789012345678" },
                { provider: "osu" as const, providerUserId: "24680" },
            ]),
        };

        await new BotAccountCompatibility(accounts, database).synchronizeUser("user-1");

        expect(upsert).toHaveBeenCalledWith({
            where: { id: "123456789012345678" },
            create: { id: "123456789012345678", banchoId: "24680" },
            update: { banchoId: "24680" },
        });
        expect(clear).not.toHaveBeenCalled();
    });

    it("clears an existing Bot mirror when the canonical pair is incomplete", async () => {
        const upsert = mock(async () => undefined);
        const clear = mock(async () => undefined);
        const database: BotAccountDatabase = { user: { upsert, updateMany: clear } };
        const accounts = {
            listLoginMethods: async () => [{ provider: "discord" as const, providerUserId: "123456789012345678" }],
        };

        await new BotAccountCompatibility(accounts, database).synchronizeUser("user-1");

        expect(clear).toHaveBeenCalledWith({ where: { id: "123456789012345678" }, data: { banchoId: null } });
        expect(upsert).not.toHaveBeenCalled();
    });

    it("clears the removed Discord mirror when the canonical user has no Discord identity left", async () => {
        const upsert = mock(async () => undefined);
        const clear = mock(async () => undefined);
        const database: BotAccountDatabase = { user: { upsert, updateMany: clear } };
        const accounts = { listLoginMethods: async () => [{ provider: "osu" as const, providerUserId: "24680" }] };

        await new BotAccountCompatibility(accounts, database).synchronizeUser("user-1", {
            provider: "discord",
            providerUserId: "123456789012345678",
        });

        expect(clear).toHaveBeenCalledWith({ where: { id: "123456789012345678" }, data: { banchoId: null } });
        expect(upsert).not.toHaveBeenCalled();
    });
});
