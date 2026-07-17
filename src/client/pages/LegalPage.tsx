import type { ReactNode } from "react";

import Footer from "@/components/footer";
import Header from "@/components/header";
import { sitePageClass } from "@/components/layout/styles";

export default function LegalPage({ children }: { children: ReactNode }) {
    return (
        <div className={`${sitePageClass} bg-[#0d0c0f] print:bg-white print:text-[#111]`}>
            <Header />
            {children}
            <Footer />
        </div>
    );
}
