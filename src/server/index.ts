import { Elysia } from "elysia";

import { getPageSeo, isKnownClientRoute } from "@/lib/seo";

import { apiRoutes } from "./api";
import { auth, webDatabase } from "./auth";
import { runWebMigrations } from "./migrations";
import { injectRenderedPage } from "./page-renderer";
import { injectSeoHead } from "./seo";

const PORT = process.env.PORT ?? 3000;
const legacyLegalRoutes = new Map([
    ["/privacy", "/legal/privacy"],
    ["/privacy-policy", "/legal/privacy"],
    ["/terms", "/legal/terms"],
    ["/terms-of-service", "/legal/terms"],
]);

const app = new Elysia().use(apiRoutes).all("*", async ({ request, set }) => {
    const url = new URL(request.url);

    if (url.pathname === "/index.html") {
        url.pathname = "/";
        return Response.redirect(url, 308);
    }

    if (url.pathname.length > 1 && url.pathname.endsWith("/")) {
        const normalizedPath = url.pathname.replace(/\/+$/, "");
        if (isKnownClientRoute(normalizedPath)) {
            url.pathname = normalizedPath;
            return Response.redirect(url, 308);
        }
    }

    const legalRedirect = legacyLegalRoutes.get(url.pathname);
    if (legalRedirect) {
        url.pathname = legalRedirect;
        return Response.redirect(url, 308);
    }

    if (url.pathname.startsWith("/api/auth")) {
        const res = await auth.handler(request);
        if (res) return res;
    }

    if (url.pathname.startsWith("/api/")) {
        set.status = 404;
        set.headers["Content-Type"] = "application/json; charset=utf-8";
        set.headers["X-Robots-Tag"] = "noindex, nofollow";
        return { error: "Not Found" };
    }

    if (url.pathname !== "/") {
        const file = Bun.file(`dist${url.pathname}`);
        if (await file.exists()) return file;
    }

    const index = Bun.file("dist/index.html");
    if (!(await index.exists()) || index.size === 0) return "Static files not built yet. Run 'vite build'.";

    const knownRoute = isKnownClientRoute(url.pathname);
    const seo = getPageSeo(url.pathname);
    set.status = knownRoute ? 200 : 404;
    set.headers["Content-Type"] = "text/html; charset=utf-8";
    set.headers["Content-Language"] = "en";
    set.headers["X-Robots-Tag"] = seo.robots;
    set.headers["Cache-Control"] = seo.metadata.indexable ? "public, max-age=0, must-revalidate" : "no-store";

    const html = injectSeoHead(await index.text(), url.pathname);
    return seo.metadata.indexable || !knownRoute ? injectRenderedPage(html, `${url.pathname}${url.search}`) : html;
});

export default app;

// Only listen if this file is run directly
if (import.meta.url === `file://${process.argv[1]}`) {
    await runWebMigrations(webDatabase);
    app.listen(PORT);
    console.log(`🦊 Elysia is running at http://${app.server?.hostname}:${app.server?.port}`);
}
