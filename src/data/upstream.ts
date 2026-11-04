/** Pinned Omarchy revision. Wallpapers are loaded from this commit at runtime. */
export const OMARCHY_COMMIT = "cc99764098af5a2ed5cf2245d9059f4d559650f5";

export const OMARCHY_REPO = "omacom/omarchy";

/** Current repository. basecamp/omarchy redirects here. */
export const OMARCHY_REPO_URL = "https://github.com/omacom/omarchy";

/** URL named in the original project. It redirects to OMARCHY_REPO_URL. */
export const OMARCHY_UPSTREAM_URL = "https://github.com/basecamp/omarchy";

export function wallpaperUrl(themeId: string, file: string): string {
  const encoded = file
    .split("/")
    .map((part) => encodeURIComponent(part))
    .join("/");
  return `https://raw.githubusercontent.com/${OMARCHY_REPO}/${OMARCHY_COMMIT}/themes/${themeId}/backgrounds/${encoded}`;
}

export function themeTreeUrl(themeId: string): string {
  return `${OMARCHY_REPO_URL}/tree/${OMARCHY_COMMIT}/themes/${themeId}`;
}

export const CARD_MOD_URL = "https://github.com/thomasloven/lovelace-card-mod";
