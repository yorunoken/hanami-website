import { describe, it, expect } from "bun:test";
import app from "./index";

describe("Auth Endpoint", () => {
    it("should return 500 when missing env variables", async () => {
        // Unset env vars
        const oldId = process.env.OSU_CLIENT_ID;
        const oldCb = process.env.OSU_CALLBACK_URL;
        delete process.env.OSU_CLIENT_ID;
        delete process.env.OSU_CALLBACK_URL;

        const req = new Request("http://localhost/api/auth?state=teststate");
        const res = await app.handle(req);
        
        expect(res.status).toBe(500);

        // Restore
        process.env.OSU_CLIENT_ID = oldId;
        process.env.OSU_CALLBACK_URL = oldCb;
    });

    it("should return auth URL when env variables are set", async () => {
        process.env.OSU_CLIENT_ID = "12345";
        process.env.OSU_CALLBACK_URL = "http://localhost:3000/api/callback";

        const req = new Request("http://localhost/api/auth?state=teststate");
        const res = await app.handle(req);
        
        expect(res.status).toBe(200);
        const data = await res.json() as any;
        expect(data.url).toContain("https://osu.ppy.sh/oauth/authorize");
        expect(data.url).toContain("client_id=12345");
        expect(data.url).toContain("state=teststate");
    });
});
