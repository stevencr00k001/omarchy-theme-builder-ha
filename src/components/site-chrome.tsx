import { teshUrl } from "@/lib/links";
import { publicPath } from "@/lib/public-path";
import { OMARCHY_REPO_URL, OMARCHY_UPSTREAM_URL } from "@/data/upstream";

export function SiteHeader() {
  const home = teshUrl("/", "header");
  return (
    <header className="sticky top-0 z-30 border-b-2 border-[#0b3b3c] bg-[#0a0d12] pt-[env(safe-area-inset-top)] text-white">
      <div className="mx-auto flex max-w-[1400px] flex-wrap items-center gap-3 px-4 py-3">
        <a href={home} className="flex items-center gap-3 text-white no-underline" rel="noopener noreferrer">
          {/* Brand mark served locally so the header does not depend on the shop being up. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={publicPath("/brand/tesh-logo.png")}
            alt="Top End Smart Homes"
            width={44}
            height={44}
            className="size-11 shrink-0 rounded-full shadow-[0_0_12px_#2be4f055]"
          />
          <span className="hidden text-sm font-semibold sm:inline">Top End Smart Homes</span>
        </a>
        <div className="hidden h-8 w-px bg-white/15 sm:block" />
        <div className="min-w-0">
          <h1 className="text-base leading-tight font-semibold tracking-tight sm:text-lg">
            Omarchy Theme Builder
          </h1>
          <p className="text-xs text-white/70 sm:text-sm">
            for Home Assistant ·{" "}
            <a href={home} className="text-[#5fd3c6] no-underline hover:underline" rel="noopener noreferrer">
              by Top End Smart Homes
            </a>
          </p>
        </div>
      </div>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="mt-12 border-t border-[#0b3b3c] bg-[#0b3b3c] pb-[env(safe-area-inset-bottom)] text-[#d9efec]">
      <div className="mx-auto grid max-w-[1400px] gap-6 px-4 py-8 text-sm sm:grid-cols-2">
        <div>
          <p className="font-medium text-white">Colours and wallpapers</p>
          <p className="mt-2 text-[#d9efec]/90">
            Palettes are read from Omarchy <span className="font-mono">colors.toml</span> files.
            Wallpapers load from the Omarchy repository at a pinned commit and are not copied into
            this project.
          </p>
          <p className="mt-2">
            <a href={OMARCHY_REPO_URL} className="text-[#5fd3c6] hover:underline" rel="noopener noreferrer">
              Omarchy on GitHub
            </a>
            <span className="text-[#d9efec]/70">
              {" "}
              · the{" "}
              <a href={OMARCHY_UPSTREAM_URL} className="text-[#5fd3c6] hover:underline" rel="noopener noreferrer">
                basecamp/omarchy
              </a>{" "}
              address redirects there. Theme authors are the Omarchy project and the people who
              designed each palette.
            </span>
          </p>
        </div>
        <div>
          <p className="font-medium text-white">Top End Smart Homes</p>
          <p className="mt-2">
            More dashboards and smart home kits at{" "}
            <a href={teshUrl("/", "footer")} className="text-[#5fd3c6] hover:underline" rel="noopener noreferrer">
              topendsmarthomes.com.au
            </a>
            .
          </p>
          <p className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
            <a href={teshUrl("/kits", "footer-kits")} className="text-[#5fd3c6] hover:underline" rel="noopener noreferrer">
              Dashboard kits
            </a>
            <a href={teshUrl("/tutorials", "footer-tutorials")} className="text-[#5fd3c6] hover:underline" rel="noopener noreferrer">
              Tutorials
            </a>
          </p>
          <p className="mt-4 text-xs text-[#d9efec]/70">
            Free and open source under the MIT licence. Not affiliated with the Home Assistant
            project.
          </p>
        </div>
      </div>
    </footer>
  );
}
