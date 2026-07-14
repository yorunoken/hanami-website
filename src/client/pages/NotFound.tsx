import Footer from "@/components/footer";
import Header from "@/components/header";
import { siteContainerClass, sitePageClass } from "@/components/layout/styles";
import { ActionLink, Eyebrow } from "@/components/marketing";
import { cn } from "@/lib/utils";

export default function NotFound() {
  return (
    <div className={sitePageClass}>
      <Header />
      <main
        className={cn(
          siteContainerClass,
          "flex min-h-[620px] flex-col items-start justify-center py-20",
        )}
      >
        <span className="mb-[1.3rem] font-mono text-[0.75rem] text-quiet">
          404
        </span>
        <Eyebrow>Lost in the mapset</Eyebrow>
        <h1 className="max-w-[720px] text-[clamp(2.8rem,7vw,5.4rem)] leading-none tracking-[-0.06em]">
          This route does not exist.
        </h1>
        <p className="mt-[1.3rem] mb-8 max-w-[52ch] leading-[1.7] text-muted">
          The ecosystem is still here. Head back to the project index and choose
          another path.
        </p>
        <ActionLink href="/">Return home</ActionLink>
      </main>
      <Footer />
    </div>
  );
}
