/** Canonical site. The apex domain redirects here, which drops nothing we add. */
export const TESH_ORIGIN = "https://www.topendsmarthomes.com.au";

export const UTM_SOURCE = "omarchy-theme-builder";
export const UTM_MEDIUM = "app";

/**
 * Every link to Top End Smart Homes goes through here so placement is measurable.
 * Visible copy can still say topendsmarthomes.com.au.
 */
export function teshUrl(pathname: string, campaign: string): string {
  const url = new URL(pathname, TESH_ORIGIN);
  url.searchParams.set("utm_source", UTM_SOURCE);
  url.searchParams.set("utm_medium", UTM_MEDIUM);
  url.searchParams.set("utm_campaign", campaign);
  return url.toString();
}
