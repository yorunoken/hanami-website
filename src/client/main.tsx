import { StrictMode } from "react";
import { createRoot, hydrateRoot } from "react-dom/client";

import { getCanonicalDevelopmentAuthURL } from "./lib/auth-navigation";
import App from "./App";
import "./globals.css";

const canonicalDevelopmentURL = getCanonicalDevelopmentAuthURL(window.location.href, Boolean(import.meta.env.DEV));

if (canonicalDevelopmentURL) {
    window.location.replace(canonicalDevelopmentURL);
} else {
    const container = document.getElementById("root")!;
    const application = (
        <StrictMode>
            <App />
        </StrictMode>
    );

    if (container.hasChildNodes()) {
        hydrateRoot(container, application);
    } else {
        createRoot(container).render(application);
    }
}
