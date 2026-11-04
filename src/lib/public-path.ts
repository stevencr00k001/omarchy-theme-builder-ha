/**
 * Prefix a public file for the current build.
 * The panel is served from NEXT_PUBLIC_BASE_PATH. A root path such as
 * /brand/tesh-logo.png would otherwise miss that folder inside Home Assistant.
 */
export function publicPath(path: string): string {
  const raw = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
  const base = raw.endsWith("/") ? raw.slice(0, -1) : raw;
  const suffix = path.startsWith("/") ? path : `/${path}`;
  return `${base}${suffix}`;
}
