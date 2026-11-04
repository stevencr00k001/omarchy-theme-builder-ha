import { getCardStyle, cardModPlan, type CardStyleId } from "@/lib/card-styles";
import { asHex, mixColor, rgba, type Palette } from "@/lib/colors";
import { bestOnColor } from "@/lib/contrast";
import { teshUrl } from "@/lib/links";
import { CARD_MOD_URL, OMARCHY_COMMIT, OMARCHY_REPO_URL, OMARCHY_UPSTREAM_URL, themeTreeUrl } from "@/data/upstream";

const MONO =
  "ui-monospace, SFMono-Regular, Menlo, Consolas, 'Liberation Mono', monospace";

export interface ThemeOptions {
  /** Human name, for example "Nord". */
  paletteName: string;
  /** Folder id, for example "nord". */
  paletteId: string;
  styleId: CardStyleId;
  /** File name inside /config/www/omarchy and /local/omarchy. */
  imageFile: string | null;
  opacity: number;
  blur: boolean;
  blurPx: number;
  radius: number;
  /** Where the wallpaper came from, for the README. */
  wallpaperCredit: string;
}

export interface ThemeLook {
  cardHex: string;
  cardAlpha: number;
  cardBackground: string;
  borderWidth: string;
  borderColor: string;
  shadow: string;
  radius: string;
  blur: string;
  fontFamily: string;
  headerBackground: string;
  headerBorder: string;
  headerHeight: string;
  gap: string;
  text: string;
  textSecondary: string;
  accent: string;
  onAccent: string;
  sidebar: string;
  background: string;
  error: string;
  warning: string;
  success: string;
  info: string;
  divider: string;
  terminal: boolean;
  waybar: boolean;
}

export interface BuiltTheme {
  name: string;
  fileSlug: string;
  variables: Record<string, string>;
  look: ThemeLook;
  cardMod: { theme: string; card?: string; root?: string } | null;
  needsCardMod: boolean;
  cardModReasons: string[];
  styleName: string;
  inspiration: string;
}

export function quoteYaml(value: string): string {
  return `"${value.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
}

export function wallpaperExportName(themeId: string, sourceName: string): string {
  const base = sourceName.split(/[/\\]/).pop() ?? "background";
  const cleaned = base
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, "-")
    .replace(/^-+/, "")
    .replace(/-+/g, "-")
    .slice(-64);
  return `${themeId}--${cleaned || "background"}`;
}

function pick(palette: Palette, keys: string[], fallback: string): string {
  for (const key of keys) {
    const hex = asHex(palette[key]);
    if (hex) return hex;
  }
  return fallback;
}

function solidOrAlpha(hex: string, alpha: number): string {
  if (alpha >= 0.999) return hex;
  return rgba(hex, alpha);
}

export function buildTheme(palette: Palette, options: ThemeOptions): BuiltTheme {
  const style = getCardStyle(options.styleId);
  if (!style) throw new Error(`Unknown card style: ${options.styleId}`);

  const light = palette.mode === "light";
  const accent = pick(palette, ["accent", "blue", "color4", "cyan", "color6"], "#3d7ea6");
  const background = pick(palette, ["background", "color0"], light ? "#f4f1ea" : "#141414");
  const darker = pick(palette, ["darker_background", "dark_background", "background"], background);
  const darkBg = pick(palette, ["dark_background", "background"], background);
  const lighter = pick(palette, ["lighter_background", "selection", "background"], background);
  const foreground = pick(palette, ["foreground", "color7"], light ? "#1c1c1c" : "#f2f2f2");
  const bright = pick(palette, ["bright_foreground", "foreground"], foreground);
  const muted = pick(palette, ["muted", "dark_foreground", "color8"], foreground);
  const lightFg = pick(palette, ["light_foreground", "foreground"], foreground);
  const darkFg = pick(palette, ["dark_foreground", "muted"], muted);

  const text = bright;
  const textSecondary =
    lightFg.toLowerCase() !== text.toLowerCase() ? lightFg : darkFg;
  const onAccent = bestOnColor(accent);
  const error = pick(palette, ["red", "color1"], "#c44949");
  const warning = pick(palette, ["yellow", "color3"], "#c4922a");
  const success = pick(palette, ["green", "color2"], "#3d8f5a");
  const info = pick(palette, ["cyan", "color6", "blue", "color4"], accent);

  const opacity = clamp(options.opacity, 0.05, 1);
  const radius = clamp(Math.round(options.radius), 0, 40);
  const blurPx = clamp(Math.round(options.blurPx), 0, 48);
  const gap = style.defaults.gap;

  let cardHex = lighter;
  if (style.id === "minimal") cardHex = background;
  if (style.id === "terminal" || style.id === "neon") cardHex = darker;
  if (style.id === "outlined" || style.id === "tiled" || style.id === "waybar") cardHex = background;
  if (style.id === "matte") {
    cardHex = asHex(mixColor(background, foreground, light ? "4%" : "7%")) ?? background;
  }
  if (style.id === "solid" || style.id === "nexus" || style.id === "frosted") cardHex = lighter;

  const cardAlpha = opacity;
  const cardSolid = solidOrAlpha(cardHex, cardAlpha);
  let cardBackground = cardSolid;
  if (style.id === "nexus") {
    const sheen = light ? "rgba(255, 255, 255, 0.72)" : "rgba(255, 255, 255, 0.1)";
    const fade = light ? "rgba(255, 255, 255, 0.15)" : "rgba(255, 255, 255, 0.02)";
    cardBackground = `linear-gradient(180deg, ${sheen}, ${fade}), ${cardSolid}`;
  }

  const hairline = light ? "rgba(23, 38, 42, 0.14)" : "rgba(255, 255, 255, 0.16)";
  let borderWidth = "0px";
  let borderColor = "transparent";
  if (style.id === "outlined") {
    borderWidth = "2px";
    borderColor = accent;
  } else if (style.id === "tiled" || style.id === "terminal" || style.id === "neon") {
    borderWidth = "1px";
    borderColor = accent;
  } else if (style.id === "nexus") {
    borderWidth = "1px";
    borderColor = hairline;
  } else if (style.id === "frosted") {
    borderWidth = "1px";
    borderColor = hairline;
  }

  const soft = light ? "rgba(23, 38, 42, 0.08)" : "rgba(0, 0, 0, 0.28)";
  let shadow = "none";
  if (style.id === "solid") shadow = `0 1px 2px ${soft}, 0 8px 18px ${soft}`;
  if (style.id === "matte") shadow = `0 16px 36px ${soft}`;
  if (style.id === "nexus") {
    const inset = light ? "rgba(255, 255, 255, 0.7)" : "rgba(255, 255, 255, 0.16)";
    shadow = `inset 0 1px 0 ${inset}, 0 12px 28px ${soft}`;
  }
  if (style.id === "neon") {
    shadow = `0 0 0 1px ${accent}, 0 0 18px ${rgba(accent, 0.45)}`;
  }

  const headerSolid = style.id === "waybar" || style.id === "terminal" || style.id === "neon";
  const headerBackground = headerSolid ? darker : rgba(darker, light ? 0.9 : 0.82);
  const headerBorder =
    style.id === "waybar" || style.id === "terminal"
      ? `2px solid ${accent}`
      : style.id === "neon"
        ? `1px solid ${accent}`
        : "0 solid transparent";
  const headerHeight = style.id === "waybar" ? "42px" : "56px";

  const look: ThemeLook = {
    cardHex,
    cardAlpha,
    cardBackground,
    borderWidth,
    borderColor,
    shadow,
    radius: `${radius}px`,
    blur: options.blur ? `blur(${blurPx}px)` : "none",
    fontFamily: style.id === "terminal" ? MONO : "inherit",
    headerBackground,
    headerBorder,
    headerHeight,
    gap: `${gap}px`,
    text,
    textSecondary,
    accent,
    onAccent,
    sidebar: style.id === "terminal" ? darker : darkBg,
    background,
    error,
    warning,
    success,
    info,
    divider: rgba(muted, 0.55),
    terminal: style.id === "terminal",
    waybar: style.id === "waybar",
  };

  const name = `Omarchy ${options.paletteName} - ${style.name}`;
  const fileSlug = `omarchy-${options.paletteId}-${style.id}`;

  const variables: Record<string, string> = {
    "primary-color": accent,
    "accent-color": info === accent ? pick(palette, ["cyan", "color6", "blue"], accent) : info,
    "primary-background-color": background,
    "secondary-background-color": lighter,
    "card-background-color": cardSolid,
    "ha-card-background": cardBackground,
    "ha-card-border-radius": look.radius,
    "ha-card-border-width": borderWidth,
    "ha-card-border-color": borderColor,
    "ha-card-box-shadow": shadow,
    "primary-text-color": text,
    "secondary-text-color": textSecondary,
    "text-primary-color": onAccent,
    "disabled-text-color": muted,
    "divider-color": look.divider,
    "app-header-background-color": headerBackground,
    "app-header-text-color": text,
    "app-header-selection-bar-color": accent,
    "sidebar-background-color": look.sidebar,
    "sidebar-text-color": foreground,
    "sidebar-icon-color": textSecondary,
    "sidebar-selected-text-color": text,
    "sidebar-selected-icon-color": accent,
    "sidebar-selected-background-color": pick(palette, ["selection", "lighter_background"], lighter),
    "error-color": error,
    "warning-color": warning,
    "success-color": success,
    "info-color": info,
    "state-icon-color": accent,
    "state-icon-active-color": accent,
    "state-on-color": accent,
    "switch-checked-color": accent,
    "switch-checked-button-color": onAccent,
    "switch-unchecked-color": muted,
    "slider-color": accent,
    "slider-track-color": muted,
    "masonry-view-card-margin": look.gap,
    "ha-view-sections-column-gap": look.gap,
    "ha-view-sections-row-gap": look.gap,
    "lovelace-background": options.imageFile
      ? `center / cover no-repeat fixed url("/local/omarchy/${options.imageFile}")`
      : background,
  };

  if (style.id === "terminal") {
    variables["primary-font-family"] = MONO;
    variables["ha-font-family-body"] = MONO;
    variables["ha-font-family-heading"] = MONO;
    variables["ha-font-family-code"] = MONO;
    variables["paper-font-common-base_-_font-family"] = MONO;
  }

  const plan = cardModPlan(style, options.blur);
  let card: string | undefined;
  let root: string | undefined;

  if (options.blur) {
    card = [
      "ha-card {",
      `  background: ${cardSolid} !important;`,
      `  backdrop-filter: blur(${blurPx}px);`,
      `  -webkit-backdrop-filter: blur(${blurPx}px);`,
      "}",
    ].join("\n");
  }

  if (style.id === "waybar") {
    root = [
      ".header {",
      `  background: ${headerBackground} !important;`,
      `  color: ${text} !important;`,
      `  border-bottom: 2px solid ${accent} !important;`,
      "  box-shadow: none !important;",
      "  min-height: 42px !important;",
      "}",
    ].join("\n");
  }

  const cardMod = plan.needed ? { theme: name, card, root } : null;

  return {
    name,
    fileSlug,
    variables,
    look,
    cardMod,
    needsCardMod: plan.needed,
    cardModReasons: plan.reasons,
    styleName: style.name,
    inspiration: style.inspiration,
  };
}

export function themeToYaml(theme: BuiltTheme, paletteId: string): string {
  const lines = [
    `# ${theme.name}`,
    "# Generated by Omarchy Theme Builder, a free tool by Top End Smart Homes.",
    `# Palette: Omarchy theme "${paletteId}" (${OMARCHY_REPO_URL}).`,
    `# Card style: ${theme.styleName}. ${theme.inspiration}`,
  ];
  if (theme.needsCardMod) {
    lines.push(`# card-mod is required for: ${theme.cardModReasons.join(" ")}`);
    lines.push(`# https://github.com/thomasloven/lovelace-card-mod`);
  } else {
    lines.push("# This file uses Home Assistant theme variables only.");
  }
  lines.push(`${quoteYaml(theme.name)}:`);
  for (const [key, value] of Object.entries(theme.variables)) {
    lines.push(`  ${key}: ${quoteYaml(value)}`);
  }
  if (theme.cardMod) {
    lines.push(`  card-mod-theme: ${quoteYaml(theme.cardMod.theme)}`);
    if (theme.cardMod.card) {
      lines.push("  card-mod-card: |");
      lines.push(indent(theme.cardMod.card, 4));
    }
    if (theme.cardMod.root) {
      lines.push("  card-mod-root: |");
      lines.push(indent(theme.cardMod.root, 4));
    }
  }
  return `${lines.join("\n")}\n`;
}

function indent(block: string, spaces: number): string {
  const pad = " ".repeat(spaces);
  return block
    .replace(/\s+$/, "")
    .split("\n")
    .map((line) => (line.length ? pad + line : line))
    .join("\n");
}

export function buildInstallReadme(theme: BuiltTheme, paletteId: string, wallpaperCredit: string): string {
  const image = theme.variables["lovelace-background"].includes("/local/omarchy/")
    ? theme.variables["lovelace-background"].match(/\/local\/omarchy\/([^")]+)/)?.[1]
    : null;
  const yamlName = `${theme.fileSlug}.yaml`;
  const cardMod = theme.needsCardMod
    ? [
        "## Frosted glass and card-mod",
        "",
        "This export includes card-mod rules. Install card-mod from HACS before you expect the blur or the header bar to appear:",
        "",
        CARD_MOD_URL,
        "",
        ...theme.cardModReasons.map((reason) => `- ${reason}`),
        "",
        "Without card-mod, the colours, radius, borders, and shadows in the YAML still apply. Only the pieces listed above are skipped.",
        "",
        `The value of \`card-mod-theme\` has to stay exactly \`${theme.name}\`.`,
        "",
      ]
    : [
        "## card-mod",
        "",
        "This export does not need card-mod. It is ordinary Home Assistant theme variables.",
        "",
      ];

  return [
    `# ${theme.name}`,
    "",
    "Generated by Omarchy Theme Builder, a free tool by Top End Smart Homes.",
    "More dashboards and smart home kits at topendsmarthomes.com.au:",
    teshUrl("/", "export-readme"),
    "",
    "## What is in this zip",
    "",
    `- \`themes/${yamlName}\` — the theme`,
    image ? `- \`www/omarchy/${image}\` — the wallpaper` : "- No wallpaper file. The theme uses a solid background colour.",
    "",
    "Palettes come from Omarchy (MIT):",
    `${OMARCHY_REPO_URL} (the older ${OMARCHY_UPSTREAM_URL} address redirects here).`,
    `Theme \`${paletteId}\` at commit \`${OMARCHY_COMMIT}\`.`,
    themeTreeUrl(paletteId),
    "Theme authors are the Omarchy project and the people who designed this palette.",
    wallpaperCredit,
    "",
    `Card style: ${theme.styleName}. ${theme.inspiration}`,
    "",
    "## Install",
    "",
    `1. Copy \`themes/${yamlName}\` to your Home Assistant config at \`config/themes/${yamlName}\`. Create \`config/themes\` if it is not there.`,
    image
      ? `2. Copy \`www/omarchy/${image}\` to \`config/www/omarchy/${image}\`. Create the folders if you need to. Home Assistant serves \`config/www\` at \`/local\`, so the picture is \`/local/omarchy/${image}\`.`
      : "2. There is no picture to copy.",
    "3. Add this to \`configuration.yaml\` if it is not there already:",
    "",
    "```yaml",
    "frontend:",
    "  themes: !include_dir_merge_named themes",
    "```",
    "",
    "4. Restart Home Assistant, or reload themes from Developer tools.",
    `5. Open your profile (the bottom of the sidebar) and choose **${theme.name}** under Theme.`,
    "",
    ...cardMod,
    "## Credit",
    "",
    "Omarchy palettes and wallpapers stay with their authors. This zip does not claim the wallpaper as a new work.",
    "Wallpaper files are fetched when you export. They are not stored in the theme builder repository.",
    "",
  ].join("\n");
}

function clamp(n: number, min: number, max: number): number {
  if (Number.isNaN(n)) return min;
  return Math.min(max, Math.max(min, n));
}
