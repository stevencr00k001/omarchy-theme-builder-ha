import { OMARCHY_COMMIT, OMARCHY_REPO } from "@/data/upstream";

const FILE = /^[a-z0-9-]+\/backgrounds\/[a-z0-9][a-z0-9._-]{0,80}\.(?:webp|png|jpe?g)$/i;

/** True only for still images in the pinned Omarchy commit. */
export function isPinnedWallpaperUrl(value: string): boolean {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return false;
  }
  if (url.protocol !== "https:" || url.username || url.password || url.port) return false;
  if (url.hostname !== "raw.githubusercontent.com") return false;
  const prefix = `/${OMARCHY_REPO}/${OMARCHY_COMMIT}/themes/`;
  if (!url.pathname.startsWith(prefix)) return false;
  let rest: string;
  try {
    rest = decodeURIComponent(url.pathname.slice(prefix.length));
  } catch {
    return false;
  }
  return FILE.test(rest) && !rest.includes("..");
}

export function isAllowedPreviewUrl(value: string): boolean {
  return value.startsWith("blob:") || isPinnedWallpaperUrl(value);
}
