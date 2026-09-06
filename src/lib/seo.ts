import { routeMetadata, siteConfig, type RouteMetadata } from "@/data/site-config";

export const INDEX_ROBOTS_DIRECTIVE = "index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1";
export const NOINDEX_ROBOTS_DIRECTIVE = "noindex, nofollow";

export const notFoundMetadata: RouteMetadata = {
    title: "Page not found | Hanami",
    description: siteConfig.description,
    indexable: false,
};

export interface PageSeo {
    canonicalUrl: string;
    metadata: RouteMetadata;
    robots: string;
    socialImageUrl: string;
    structuredData: Record<string, unknown> | null;
}

export function getRouteMetadata(pathname: string): RouteMetadata | undefined {
    return (routeMetadata as Record<string, RouteMetadata>)[pathname];
}

export function getPageSeo(pathname: string): PageSeo {
    const metadata = getRouteMetadata(pathname) ?? notFoundMetadata;
    const canonicalUrl = new URL(pathname, siteConfig.url).toString();
    const socialImageUrl = new URL(metadata.socialImage ?? "/hanami.webp", siteConfig.url).toString();

    return {
        canonicalUrl,
        metadata,
        robots: metadata.indexable ? INDEX_ROBOTS_DIRECTIVE : NOINDEX_ROBOTS_DIRECTIVE,
        socialImageUrl,
        structuredData: metadata.indexable ? createStructuredData(pathname, metadata, canonicalUrl, socialImageUrl) : null,
    };
}

export function isKnownClientRoute(pathname: string): boolean {
    return getRouteMetadata(pathname) !== undefined;
}

function createStructuredData(
    pathname: string,
    metadata: RouteMetadata,
    canonicalUrl: string,
    socialImageUrl: string,
): Record<string, unknown> {
    const websiteId = `${siteConfig.url}/#website`;
    const organizationId = `${siteConfig.url}/#organization`;
    const graph: Record<string, unknown>[] = [
        {
            "@type": "Organization",
            "@id": organizationId,
            name: siteConfig.name,
            url: `${siteConfig.url}/`,
            logo: {
                "@type": "ImageObject",
                url: `${siteConfig.url}/hanami.webp`,
                width: 565,
                height: 542,
            },
            sameAs: [siteConfig.links.organization],
        },
        {
            "@type": "WebSite",
            "@id": websiteId,
            name: siteConfig.name,
            url: `${siteConfig.url}/`,
            description: siteConfig.description,
            publisher: { "@id": organizationId },
            inLanguage: "en",
        },
    ];

    if (pathname !== "/") {
        graph.push({
            "@type": "WebPage",
            "@id": `${canonicalUrl}#webpage`,
            url: canonicalUrl,
            name: metadata.title,
            description: metadata.description,
            isPartOf: { "@id": websiteId },
            primaryImageOfPage: {
                "@type": "ImageObject",
                url: socialImageUrl,
            },
            breadcrumb: { "@id": `${canonicalUrl}#breadcrumb` },
            inLanguage: "en",
        });
        graph.push(createBreadcrumbData(pathname, canonicalUrl));
    }

    return {
        "@context": "https://schema.org",
        "@graph": graph,
    };
}

function createBreadcrumbData(pathname: string, canonicalUrl: string): Record<string, unknown> {
    const segments = pathname.split("/").filter(Boolean);
    const paths = ["/", ...segments.map((_, index) => `/${segments.slice(0, index + 1).join("/")}`)];
    const itemListElement = paths.map((path, index) => {
        const metadata = getRouteMetadata(path);
        return {
            "@type": "ListItem",
            position: index + 1,
            name: path === "/" ? siteConfig.name : getBreadcrumbLabel(metadata?.title ?? segments[index - 1] ?? siteConfig.name),
            item: new URL(path, siteConfig.url).toString(),
        };
    });

    return {
        "@type": "BreadcrumbList",
        "@id": `${canonicalUrl}#breadcrumb`,
        itemListElement,
    };
}

function getBreadcrumbLabel(title: string): string {
    return title.split(" | ")[0] ?? title;
}
