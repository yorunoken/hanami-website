import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import { getCanonicalDevelopmentAuthURL } from "./lib/auth-navigation";
import App from "./App";
import "./globals.css";

const canonicalDevelopmentURL = getCanonicalDevelopmentAuthURL(window.location.href, Boolean(import.meta.env.DEV));

if (canonicalDevelopmentURL) {
    window.location.replace(canonicalDevelopmentURL);
} else {
    createRoot(document.getElementById("root")!).render(
        <StrictMode>
            <App />
        </StrictMode>,
    );
}
