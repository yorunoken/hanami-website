import Footer from "@/components/footer";
import Header from "@/components/header";
import { siteContainerClass, sitePageClass } from "@/components/layout/styles";
import { ActionLink, Eyebrow } from "@/components/marketing";
import { cn } from "@/lib/utils";

export default function NotFound() {
    return (
        <div className={sitePageClass}>
            <Header />
            <main className={cn(siteContainerClass, "flex min-h-155 flex-col items-start justify-center py-20")}>
                <Eyebrow>Lost in the mapset</Eyebrow>
                <h1 className="mb-8 max-w-180 text-[clamp(2.8rem,7vw,5.4rem)] leading-none tracking-[-0.06em]">
                    This route does not exist.
                </h1>
                <ActionLink href="/">Return home</ActionLink>
            </main>
            <Footer />
        </div>
    );
}
