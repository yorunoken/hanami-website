import { Elysia } from "elysia";

import { apiRoutes } from "./api";
import { auth } from "./auth";

const PORT = process.env.PORT ?? 3000;
const legacyLegalRoutes = new Map([
    ["/privacy", "/legal/privacy"],
    ["/privacy-policy", "/legal/privacy"],
    ["/terms", "/legal/terms"],
    ["/terms-of-service", "/legal/terms"],
]);

const app = new Elysia().use(apiRoutes).all("*", async ({ request, set }) => {
    const url = new URL(request.url);

    const legalRedirect = legacyLegalRoutes.get(url.pathname);
    if (legalRedirect) {
        url.pathname = legalRedirect;
        return Response.redirect(url, 308);
    }

    if (url.pathname.startsWith("/api/auth")) {
        const res = await auth.handler(request);
        if (res) return res;
    }

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
    console.log(`🦊 Elysia is running at http://${app.server?.hostname}:${app.server?.port}`);
}
