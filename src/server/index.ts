import { Elysia } from "elysia";

import { apiRoutes } from "./api";

const PORT = process.env.PORT ?? 3000;

const app = new Elysia().use(apiRoutes).get("*", async ({ request, set }) => {
    const url = new URL(request.url);
    const possiblePath = `dist${url.pathname === "/" ? "/index.html" : url.pathname}`;
    const file = Bun.file(possiblePath);

    if (await file.exists()) {
        return file;
    }

    const index = Bun.file("dist/index.html");
    if (index.size === 0) return "Static files not built yet. Run 'vite build'.";
    set.headers["Content-Type"] = "text/html";
    return index;
});

export default app;

// Only listen if this file is run directly
if (import.meta.url === `file://${process.argv[1]}`) {
    app.listen(PORT);
    console.log(`🦊 Elysia is running at ${app.server?.hostname}:${app.server?.port}`);
}
