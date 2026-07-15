import { useEffect } from "react";
import { useLocation } from "react-router-dom";

import { getPageSeo } from "@/lib/seo";

function setMeta(selector: string, attribute: "name" | "property", key: string, content: string) {
    let element = document.head.querySelector<HTMLMetaElement>(selector);

    if (!element) {
        element = document.createElement("meta");
        element.setAttribute(attribute, key);
        document.head.appendChild(element);
    }

    element.content = content;
}

export default function SiteMeta() {
    const { pathname } = useLocation();

    useEffect(() => {
        const seo = getPageSeo(pathname);

        document.title = seo.metadata.title;
        document.documentElement.lang = "en";

        setMeta('meta[name="description"]', "name", "description", seo.metadata.description);
        setMeta('meta[name="robots"]', "name", "robots", seo.robots);
        setMeta('meta[property="og:site_name"]', "property", "og:site_name", "Hanami");
        setMeta('meta[property="og:locale"]', "property", "og:locale", "en_US");
        setMeta('meta[property="og:title"]', "property", "og:title", seo.metadata.title);
        setMeta('meta[property="og:description"]', "property", "og:description", seo.metadata.description);
        setMeta('meta[property="og:url"]', "property", "og:url", seo.canonicalUrl);
        setMeta('meta[property="og:type"]', "property", "og:type", "website");
        setMeta('meta[property="og:image"]', "property", "og:image", seo.socialImageUrl);
        setMeta('meta[property="og:image:alt"]', "property", "og:image:alt", "Hanami project artwork");
        setMeta('meta[name="twitter:card"]', "name", "twitter:card", "summary");
        setMeta('meta[name="twitter:title"]', "name", "twitter:title", seo.metadata.title);
        setMeta('meta[name="twitter:description"]', "name", "twitter:description", seo.metadata.description);
        setMeta('meta[name="twitter:image"]', "name", "twitter:image", seo.socialImageUrl);

        let canonical = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
        if (!canonical) {
            canonical = document.createElement("link");
            canonical.rel = "canonical";
            document.head.appendChild(canonical);
        }
        canonical.href = seo.canonicalUrl;

        updateStructuredData(seo.structuredData);

        window.scrollTo({ top: 0, behavior: "auto" });
    }, [pathname]);

    return null;
}

function updateStructuredData(value: Record<string, unknown> | null) {
    let element = document.head.querySelector<HTMLScriptElement>("#hanami-structured-data");

    if (!value) {
        element?.remove();
        return;
    }

    if (!element) {
        element = document.createElement("script");
        element.id = "hanami-structured-data";
        element.type = "application/ld+json";
        document.head.appendChild(element);
    }

    element.textContent = JSON.stringify(value);
}
