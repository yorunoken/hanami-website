import { getPageSeo } from "@/lib/seo";

const SEO_HEAD_PATTERN = /<!-- SEO_HEAD_START -->[\s\S]*?<!-- SEO_HEAD_END -->/;

export function injectSeoHead(template: string, pathname: string): string {
    const seo = getPageSeo(pathname);

    return template.replace(
        SEO_HEAD_PATTERN,
        `<!-- SEO_HEAD_START -->
        <title>${escapeHtml(seo.metadata.title)}</title>
        <meta name="description" content="${escapeHtml(seo.metadata.description)}" />
        <meta name="robots" content="${escapeHtml(seo.robots)}" />
        <link rel="canonical" href="${escapeHtml(seo.canonicalUrl)}" />

        <meta property="og:type" content="website" />
        <meta property="og:site_name" content="Hanami" />
        <meta property="og:locale" content="en_US" />
        <meta property="og:title" content="${escapeHtml(seo.metadata.title)}" />
        <meta property="og:description" content="${escapeHtml(seo.metadata.description)}" />
        <meta property="og:url" content="${escapeHtml(seo.canonicalUrl)}" />
        <meta property="og:image" content="${escapeHtml(seo.socialImageUrl)}" />
        <meta property="og:image:alt" content="Hanami project artwork" />

        <meta name="twitter:card" content="summary" />
        <meta name="twitter:title" content="${escapeHtml(seo.metadata.title)}" />
        <meta name="twitter:description" content="${escapeHtml(seo.metadata.description)}" />
        <meta name="twitter:image" content="${escapeHtml(seo.socialImageUrl)}" />
        ${renderStructuredData(seo.structuredData)}
        <!-- SEO_HEAD_END -->`,
    );
}

function renderStructuredData(value: Record<string, unknown> | null): string {
    if (!value) return "";
    const json = JSON.stringify(value).replaceAll("<", "\\u003c");
    return `<script id="hanami-structured-data" type="application/ld+json">${json}</script>`;
}

function escapeHtml(value: string): string {
    return value.replace(/[&<>"']/g, (character) => {
        switch (character) {
            case "&":
                return "&amp;";
            case "<":
                return "&lt;";
            case ">":
                return "&gt;";
            case '"':
                return "&quot;";
            default:
                return "&#39;";
        }
    });
}
