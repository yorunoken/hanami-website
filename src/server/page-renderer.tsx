import { renderToString } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";

import { getPageSeo } from "@/lib/seo";

import SeoApp from "./seo-app";

const ROOT_ELEMENT = '<div id="root"></div>';
const renderedPublicPages = new Map<string, string>();

export function injectRenderedPage(template: string, location: string): string {
    const pathname = new URL(location, "http://hanami.local").pathname;
    const cacheable = getPageSeo(pathname).metadata.indexable;
    const cachedPage = cacheable ? renderedPublicPages.get(pathname) : undefined;
    const application = cachedPage ?? renderPage(location);

    if (cacheable && cachedPage === undefined) renderedPublicPages.set(pathname, application);

    return template.replace(ROOT_ELEMENT, `<div id="root">${application}</div>`);
}

function renderPage(location: string): string {
    try {
        return renderToString(
            <MemoryRouter initialEntries={[location]}>
                <SeoApp />
            </MemoryRouter>,
        );
    } catch (error) {
        console.error(`Failed to render SEO route "${location}"`, error);
        return "";
    }
}
