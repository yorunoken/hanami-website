import type { Metadata } from "next";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { ErrorBoundary } from "@/components/error-boundary";
import Footer from "@/components/footer";
import Script from "next/script";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
    title: "Hanami Bot - osu! Discord Bot",
    description: "A specialized Discord bot for osu! written in TypeScript using the Bun runtime engine. Get user profiles, recent scores, and top plays.",
    keywords: ["osu", "discord bot", "hanami", "gaming", "rhythm game"],
    authors: [{ name: "yorunoken" }],
    creator: "yorunoken",
    openGraph: {
        title: "Hanami Bot - osu! Discord Bot",
        description: "A specialized Discord bot for osu! written in TypeScript using the Bun runtime engine.",
        type: "website",
        locale: "en_US",
    },
    twitter: {
        card: "summary_large_image",
        title: "Hanami Bot - osu! Discord Bot",
        description: "A specialized Discord bot for osu! written in TypeScript using the Bun runtime engine.",
    },
    robots: {
        index: true,
        follow: true,
    },
};

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang="en">
            <head>
                <meta name="viewport" content="width=device-width, initial-scale=1" />
            </head>
            <body className={cn("min-h-screen font-sans antialiased")}>
                <ErrorBoundary>
                    <ThemeProvider attribute="class" defaultTheme="dark" enableSystem disableTransitionOnChange>
                        <div className="flex flex-col min-h-screen">
                            <main className="flex-grow">{children}</main>
                            <Footer />
                        </div>
                    </ThemeProvider>
                </ErrorBoundary>
                <Script src="https://cloud.umami.is/script.js" data-website-id="b95e60a2-630f-4dab-814f-7299ebab3d61" strategy="afterInteractive" />
            </body>
        </html>
    );
}
