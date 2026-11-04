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
  modes: { light: Record<string, string>; dark: Record<string, string> };
  look: ThemeLook;
  cardMod: { theme: string; card?: string; root?: string } | null;
  needsCardMod: boolean;
  cardModReasons: string[];
  styleName: string;
  inspiration: string;
}

/** Every colour key written into the theme and both mode blocks. */
export const THEME_VARIABLE_KEYS = [
  "primary-color",
  "accent-color",
  "light-primary-color",
  "dark-primary-color",
  "primary-background-color",
  "secondary-background-color",
  "card-background-color",
  "ha-card-background",
  "ha-card-border-radius",
  "ha-card-border-width",
  "ha-card-border-color",
  "ha-card-box-shadow",
  "primary-text-color",
  "secondary-text-color",
  "text-primary-color",
  "text-light-primary-color",
  "disabled-text-color",
  "divider-color",
  "app-header-background-color",
  "app-header-text-color",
  "app-header-edit-background-color",
  "app-header-selection-bar-color",
  "sidebar-background-color",
  "sidebar-text-color",
  "sidebar-icon-color",
  "sidebar-selected-text-color",
  "sidebar-selected-icon-color",
  "sidebar-selected-background-color",
  "error-color",
  "warning-color",
  "success-color",
  "info-color",
  "error-state-color",
  "warning-state-color",
  "success-state-color",
  "info-state-color",
  "state-icon-color",
  "state-icon-active-color",
  "state-icon-unavailable-color",
  "state-on-color",
  "state-off-color",
  "paper-item-icon-color",
  "paper-item-icon-active-color",
  "paper-card-background-color",
  "switch-checked-color",
  "switch-checked-button-color",
  "switch-unchecked-color",
  "switch-unchecked-button-color",
  "slider-color",
  "slider-secondary-color",
  "slider-track-color",
  "slider-bar-color",
  "label-badge-background-color",
  "label-badge-text-color",
  "label-badge-red",
  "label-badge-green",
  "label-badge-blue",
  "label-badge-yellow",
  "label-badge-grey",
  "table-row-background-color",
  "table-row-alternative-background-color",
  "data-table-background-color",
  "input-fill-color",
  "input-ink-color",
  "input-label-ink-color",
  "input-disabled-ink-color",
  "input-disabled-fill-color",
  "input-dropdown-icon-color",
  "markdown-code-background-color",
  "mdc-theme-primary",
  "mdc-theme-on-primary",
  "mdc-theme-secondary",
  "mdc-theme-on-secondary",
  "tile-color",
  "energy-grid-consumption-color",
  "energy-grid-return-color",
  "energy-solar-color",
  "energy-battery-out-color",
  "energy-battery-in-color",
  "energy-gas-color",
  "energy-water-color",
  "masonry-view-card-margin",
  "ha-view-sections-column-gap",
  "ha-view-sections-row-gap",
  "lovelace-background",
  "ha-panel-background",
  "mush-rgb-red",
  "mush-rgb-pink",
  "mush-rgb-purple",
  "mush-rgb-blue",
  "mush-rgb-cyan",
  "mush-rgb-teal",
  "mush-rgb-green",
  "mush-rgb-yellow",
  "mush-rgb-amber",
  "mush-rgb-orange",
  "mush-rgb-grey",
  "mush-rgb-black",
  "mush-rgb-white",
] as const;

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

function rgbList(hex: string): string {
  const value = asHex(hex);
  if (!value) return "0, 0, 0";
  return `${Number.parseInt(value.slice(1, 3), 16)}, ${Number.parseInt(value.slice(3, 5), 16)}, ${Number.parseInt(value.slice(5, 7), 16)}`;
}

function wallpaperBackground(imageFile: string | null, background: string): string {
  if (!imageFile) return background;
  return `center / cover no-repeat fixed url("/local/omarchy/${imageFile}")`;
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
  const accentColor = info === accent ? pick(palette, ["cyan", "color6", "blue"], accent) : info;
  const selection = pick(palette, ["selection", "lighter_background"], lighter);
  const surface = wallpaperBackground(options.imageFile, background);

  const variables = themeVariables({
    accent,
    accentColor,
    background,
    lighter,
    text,
    textSecondary,
    muted,
    onAccent,
    error,
    warning,
    success,
    info,
    cardSolid,
    cardBackground,
    borderWidth,
    borderColor,
    shadow,
    radius: look.radius,
    headerBackground,
    sidebar: look.sidebar,
    foreground,
    selection,
    divider: look.divider,
    gap: look.gap,
    surface,
  });

  if (style.id === "terminal") {
    variables["primary-font-family"] = MONO;
    variables["ha-font-family-body"] = MONO;
    variables["ha-font-family-heading"] = MONO;
    variables["ha-font-family-code"] = MONO;
    variables["paper-font-common-base_-_font-family"] = MONO;
  }

  const modes = light
    ? { light: { ...variables }, dark: invertMode(variables, false) }
    : { dark: { ...variables }, light: invertMode(variables, true) };

  const plan = cardModPlan(style, options.blur);
  const cardLines = [
    "ha-card {",
    "  background: var(--ha-card-background, var(--card-background-color)) !important;",
    "  border-radius: var(--ha-card-border-radius) !important;",
    "  border-width: var(--ha-card-border-width) !important;",
    "  border-style: solid !important;",
    "  border-color: var(--ha-card-border-color) !important;",
    "  box-shadow: var(--ha-card-box-shadow) !important;",
    "  color: var(--primary-text-color) !important;",
  ];
  if (options.blur) {
    cardLines.push(`  backdrop-filter: blur(${blurPx}px);`);
    cardLines.push(`  -webkit-backdrop-filter: blur(${blurPx}px);`);
  }
  cardLines.push("}");
  cardLines.push("hui-tile-card, ha-tile {");
  cardLines.push("  --tile-color: var(--primary-color);");
  cardLines.push("}");
  const card = cardLines.join("\n");

  const rootLines = [
    "hui-view,",
    "hui-sections-view,",
    "hui-panel-view,",
    "hui-masonry-view,",
    "hui-sidebar-view,",
    "hui-root {",
    "  background: var(--lovelace-background, var(--ha-panel-background, var(--primary-background-color))) !important;",
    "}",
  ];
  if (style.id === "waybar") {
    rootLines.push(
      ".header {",
      `  background: ${headerBackground} !important;`,
      `  color: ${text} !important;`,
      `  border-bottom: 2px solid ${accent} !important;`,
      "  box-shadow: none !important;",
      "  min-height: 42px !important;",
      "}",
    );
  }
  const root = rootLines.join("\n");
  const cardMod = { theme: name, card, root };

  return {
    name,
    fileSlug,
    variables,
    modes,
    look,
    cardMod,
    needsCardMod: plan.needed,
    cardModReasons: plan.reasons,
    styleName: style.name,
    inspiration: style.inspiration,
  };
}

function themeVariables(input: {
  accent: string;
  accentColor: string;
  background: string;
  lighter: string;
  text: string;
  textSecondary: string;
  muted: string;
  onAccent: string;
  error: string;
  warning: string;
  success: string;
  info: string;
  cardSolid: string;
  cardBackground: string;
  borderWidth: string;
  borderColor: string;
  shadow: string;
  radius: string;
  headerBackground: string;
  sidebar: string;
  foreground: string;
  selection: string;
  divider: string;
  gap: string;
  surface: string;
}): Record<string, string> {
  return {
    "primary-color": input.accent,
    "accent-color": input.accentColor,
    "light-primary-color": input.lighter,
    "dark-primary-color": input.background,
    "primary-background-color": input.background,
    "secondary-background-color": input.lighter,
    "card-background-color": input.cardSolid,
    "ha-card-background": input.cardBackground,
    "ha-card-border-radius": input.radius,
    "ha-card-border-width": input.borderWidth,
    "ha-card-border-color": input.borderColor,
    "ha-card-box-shadow": input.shadow,
    "primary-text-color": input.text,
    "secondary-text-color": input.textSecondary,
    "text-primary-color": input.onAccent,
    "text-light-primary-color": input.onAccent,
    "disabled-text-color": input.muted,
    "divider-color": input.divider,
    "app-header-background-color": input.headerBackground,
    "app-header-text-color": input.text,
    "app-header-edit-background-color": input.headerBackground,
    "app-header-selection-bar-color": input.accent,
    "sidebar-background-color": input.sidebar,
    "sidebar-text-color": input.foreground,
    "sidebar-icon-color": input.textSecondary,
    "sidebar-selected-text-color": input.text,
    "sidebar-selected-icon-color": input.accent,
    "sidebar-selected-background-color": input.selection,
    "error-color": input.error,
    "warning-color": input.warning,
    "success-color": input.success,
    "info-color": input.info,
    "error-state-color": input.error,
    "warning-state-color": input.warning,
    "success-state-color": input.success,
    "info-state-color": input.info,
    "state-icon-color": input.accent,
    "state-icon-active-color": input.accent,
    "state-icon-unavailable-color": input.muted,
    "state-on-color": input.accent,
    "state-off-color": input.muted,
    "paper-item-icon-color": input.textSecondary,
    "paper-item-icon-active-color": input.accent,
    "paper-card-background-color": input.cardSolid,
    "switch-checked-color": input.accent,
    "switch-checked-button-color": input.onAccent,
    "switch-unchecked-color": input.muted,
    "switch-unchecked-button-color": input.text,
    "slider-color": input.accent,
    "slider-secondary-color": input.accentColor,
    "slider-track-color": input.muted,
    "slider-bar-color": input.accent,
    "label-badge-background-color": input.lighter,
    "label-badge-text-color": input.text,
    "label-badge-red": input.error,
    "label-badge-green": input.success,
    "label-badge-blue": input.accent,
    "label-badge-yellow": input.warning,
    "label-badge-grey": input.muted,
    "table-row-background-color": input.background,
    "table-row-alternative-background-color": input.lighter,
    "data-table-background-color": input.background,
    "input-fill-color": input.cardSolid,
    "input-ink-color": input.text,
    "input-label-ink-color": input.textSecondary,
    "input-disabled-ink-color": input.muted,
    "input-disabled-fill-color": input.lighter,
    "input-dropdown-icon-color": input.textSecondary,
    "markdown-code-background-color": input.lighter,
    "mdc-theme-primary": input.accent,
    "mdc-theme-on-primary": input.onAccent,
    "mdc-theme-secondary": input.accentColor,
    "mdc-theme-on-secondary": input.onAccent,
    "tile-color": input.accent,
    "energy-grid-consumption-color": input.accent,
    "energy-grid-return-color": input.success,
    "energy-solar-color": input.warning,
    "energy-battery-out-color": input.info,
    "energy-battery-in-color": input.accentColor,
    "energy-gas-color": input.error,
    "energy-water-color": input.info,
    "masonry-view-card-margin": input.gap,
    "ha-view-sections-column-gap": input.gap,
    "ha-view-sections-row-gap": input.gap,
    "lovelace-background": input.surface,
    "ha-panel-background": input.surface,
    "mush-rgb-red": rgbList(input.error),
    "mush-rgb-pink": rgbList(input.error),
    "mush-rgb-purple": rgbList(input.accentColor),
    "mush-rgb-blue": rgbList(input.accent),
    "mush-rgb-cyan": rgbList(input.info),
    "mush-rgb-teal": rgbList(input.info),
    "mush-rgb-green": rgbList(input.success),
    "mush-rgb-yellow": rgbList(input.warning),
    "mush-rgb-amber": rgbList(input.warning),
    "mush-rgb-orange": rgbList(input.warning),
    "mush-rgb-grey": rgbList(input.muted),
    "mush-rgb-black": rgbList(input.background),
    "mush-rgb-white": rgbList(input.text),
  };
}

/** The other Home Assistant mode, so unset tokens do not fall back to the stock theme. */
function invertMode(source: Record<string, string>, toLight: boolean): Record<string, string> {
  const background = source["primary-background-color"];
  const text = source["primary-text-color"];
  const paper = asHex(mixColor(toLight ? text : background, toLight ? "#ffffff" : "#101114", "86%")) ?? (toLight ? "#f6f3ee" : "#16181d");
  const ink = asHex(mixColor(toLight ? background : text, toLight ? "#1c1c1c" : "#f4f4f4", "8%")) ?? (toLight ? background : text);
  const card = asHex(mixColor(paper, ink, "7%")) ?? paper;
  const header = asHex(mixColor(paper, ink, "12%")) ?? paper;
  const next: Record<string, string> = { ...source };
  const paint: Record<string, string> = {
    "primary-background-color": paper,
    "secondary-background-color": card,
    "light-primary-color": card,
    "dark-primary-color": ink,
    "card-background-color": card,
    "ha-card-background": card,
    "paper-card-background-color": card,
    "primary-text-color": ink,
    "secondary-text-color": asHex(mixColor(ink, paper, "28%")) ?? ink,
    "sidebar-background-color": header,
    "sidebar-text-color": ink,
    "sidebar-icon-color": asHex(mixColor(ink, paper, "28%")) ?? ink,
    "sidebar-selected-text-color": ink,
    "app-header-background-color": header,
    "app-header-text-color": ink,
    "app-header-edit-background-color": header,
    "input-fill-color": card,
    "input-ink-color": ink,
    "input-label-ink-color": asHex(mixColor(ink, paper, "28%")) ?? ink,
    "input-disabled-fill-color": paper,
    "markdown-code-background-color": card,
    "table-row-background-color": paper,
    "table-row-alternative-background-color": card,
    "data-table-background-color": paper,
    "label-badge-background-color": card,
    "label-badge-text-color": ink,
    "mush-rgb-black": rgbList(ink),
    "mush-rgb-white": rgbList(paper),
  };
  Object.assign(next, paint);
  if (!source["lovelace-background"].includes("url(")) {
    next["lovelace-background"] = paper;
    next["ha-panel-background"] = paper;
  }
  return next;
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
  lines.push("  modes:");
  for (const mode of ["light", "dark"] as const) {
    lines.push(`    ${mode}:`);
    for (const [key, value] of Object.entries(theme.modes[mode])) {
      lines.push(`      ${key}: ${quoteYaml(value)}`);
    }
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
