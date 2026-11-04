import { CARD_STYLE_IDS, type CardStyleId, type StyleDefaults } from "@/lib/card-styles";

export interface ShareState {
  theme: string;
  /** Wallpaper file name inside the theme, or empty when the theme has none. */
  bg: string;
  opacity: number;
  blur: boolean;
  strength: number;
  radius: number;
  style: CardStyleId;
}

export interface ShareTheme {
  id: string;
  backgrounds: { file: string }[];
}

export interface ShareStyle {
  id: CardStyleId;
  defaults: StyleDefaults;
}

const THEME_ID = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const BG_FILE = /^[a-z0-9][a-z0-9._-]{0,80}\.(?:webp|png|jpe?g)$/i;

function clamp(n: number, min: number, max: number): number {
  if (Number.isNaN(n)) return min;
  return Math.min(max, Math.max(min, n));
}

export function encodeShare(state: ShareState): string {
  const params = new URLSearchParams();
  params.set("theme", state.theme);
  params.set("style", state.style);
  if (state.bg) params.set("bg", state.bg);
  params.set("opacity", state.opacity.toFixed(2));
  params.set("blur", state.blur ? "1" : "0");
  params.set("strength", String(Math.round(state.strength)));
  params.set("radius", String(Math.round(state.radius)));
  return `?${params.toString()}`;
}

export function decodeShare(search: string): Partial<ShareState> & { upload?: boolean } {
  const params = new URLSearchParams(search.startsWith("?") ? search.slice(1) : search);
  const out: Partial<ShareState> & { upload?: boolean } = {};
  const theme = params.get("theme");
  if (theme && THEME_ID.test(theme) && theme.length <= 64) out.theme = theme;
  const style = params.get("style");
  if (style && (CARD_STYLE_IDS as readonly string[]).includes(style)) {
    out.style = style as CardStyleId;
  }
  const bg = params.get("bg");
  if (bg === "upload") out.upload = true;
  else if (bg && BG_FILE.test(bg) && !bg.includes("..") && !bg.includes("/") && !bg.includes("\\")) {
    out.bg = bg;
  }
  const opacity = params.get("opacity");
  if (opacity) {
    const n = Number(opacity);
    if (!Number.isNaN(n)) out.opacity = clamp(n, 0.05, 1);
  }
  const blur = params.get("blur");
  if (blur === "1" || blur === "0") out.blur = blur === "1";
  const strength = params.get("strength");
  if (strength) {
    const n = Number(strength);
    if (!Number.isNaN(n)) out.strength = clamp(Math.round(n), 0, 48);
  }
  const radius = params.get("radius");
  if (radius) {
    const n = Number(radius);
    if (!Number.isNaN(n)) out.radius = clamp(Math.round(n), 0, 40);
  }
  return out;
}

export function resolveShare(
  search: string,
  themes: ShareTheme[],
  styles: ShareStyle[],
  fallbackThemeId: string,
): { state: ShareState; uploadMissing: boolean } {
  const parsed = decodeShare(search);
  const fallbackStyle = styles.find((style) => style.id === "frosted") ?? styles[0];
  const style = styles.find((item) => item.id === parsed.style) ?? fallbackStyle;
  const theme =
    themes.find((item) => item.id === parsed.theme) ??
    themes.find((item) => item.id === fallbackThemeId) ??
    themes[0];

  const files = theme?.backgrounds.map((item) => item.file) ?? [];
  const bg = parsed.bg && files.includes(parsed.bg) ? parsed.bg : (files[0] ?? "");

  return {
    uploadMissing: Boolean(parsed.upload),
    state: {
      theme: theme?.id ?? fallbackThemeId,
      bg,
      style: style.id,
      opacity: parsed.opacity ?? style.defaults.opacity,
      blur: parsed.blur ?? style.defaults.blur,
      strength: parsed.strength ?? style.defaults.blurPx,
      radius: parsed.radius ?? style.defaults.radius,
    },
  };
}
