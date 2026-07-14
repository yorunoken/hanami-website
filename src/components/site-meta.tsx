import { useEffect } from "react";
import { useLocation } from "react-router-dom";

import { routeMetadata, siteConfig } from "@/data/site-config";

type MetadataPath = keyof typeof routeMetadata;

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
        const metadata = routeMetadata[pathname as MetadataPath] ?? {
            title: "Page not found — Hanami",
            description: siteConfig.description,
        };
        const canonicalUrl = new URL(pathname, siteConfig.url).toString();
        const socialImage = new URL("/hanami.webp", siteConfig.url).toString();

        document.title = metadata.title;
        document.documentElement.lang = "en";

        setMeta('meta[name="description"]', "name", "description", metadata.description);
        setMeta('meta[property="og:title"]', "property", "og:title", metadata.title);
        setMeta('meta[property="og:description"]', "property", "og:description", metadata.description);
        setMeta('meta[property="og:url"]', "property", "og:url", canonicalUrl);
        setMeta('meta[property="og:type"]', "property", "og:type", "website");
        setMeta('meta[property="og:image"]', "property", "og:image", socialImage);
        setMeta('meta[name="twitter:card"]', "name", "twitter:card", "summary");
        setMeta('meta[name="twitter:title"]', "name", "twitter:title", metadata.title);
        setMeta('meta[name="twitter:description"]', "name", "twitter:description", metadata.description);
        setMeta('meta[name="twitter:image"]', "name", "twitter:image", socialImage);

        let canonical = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
        if (!canonical) {
            canonical = document.createElement("link");
            canonical.rel = "canonical";
            document.head.appendChild(canonical);
        }
        canonical.href = canonicalUrl;

        window.scrollTo({ top: 0, behavior: "auto" });
    }, [pathname]);

    return null;
}
