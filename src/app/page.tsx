import { Builder } from "@/components/builder";
import { SiteFooter, SiteHeader } from "@/components/site-chrome";

export default function HomePage() {
  return (
    <>
      <a
        href="#preview"
        className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:rounded-md focus:bg-white focus:px-3 focus:py-2"
      >
        Skip to preview
      </a>
      <SiteHeader />
      <main>
        <Builder />
      </main>
      <SiteFooter />
    </>
  );
}
