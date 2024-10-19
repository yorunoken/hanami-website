import type { Metadata } from "next";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import Header from "@/components/header";
import Footer from "@/components/footer";
import Script from "next/script";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
    title: "Hanami",
    description: "Main page of Hanami Bot.",
};

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang="en">
            <body className={cn("min-h-screen font-sans antialiased")}>
                <ThemeProvider attribute="class" defaultTheme="dark" enableSystem disableTransitionOnChange>
                    <div className="flex flex-col min-h-screen">
                        <Header />
                        <main>{children}</main>
                        <Footer />
                    </div>
                </ThemeProvider>
                <Script src="https://cloud.umami.is/script.js" data-website-id="b95e60a2-630f-4dab-814f-7299ebab3d61" strategy="afterInteractive" />
            </body>
        </html>
    );
}