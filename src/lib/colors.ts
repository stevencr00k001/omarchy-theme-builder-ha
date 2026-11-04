/**
 * Resolve an Omarchy colors.toml palette the way `omarchy-theme-color` does
 * (semantic names, legacy bg/fg aliases, and ANSI color0–color15).
 * The cascade follows bin/omarchy-theme-color at the pinned commit.
 */

export type Palette = Record<string, string>;

const KEY_OK = /^[A-Za-z0-9_-]+$/;
const VALUE_OK = /^[A-Za-z0-9#(),._+/%\ -]*$/;

export function parseColorsToml(source: string): Palette {
  const colors: Palette = {};

  for (const rawLine of source.split(/\r?\n/)) {
    const eq = rawLine.indexOf("=");
    if (eq === -1) continue;

    const key = rawLine.slice(0, eq).replace(/["' ]/g, "");
    if (!key || key.startsWith("#") || !KEY_OK.test(key)) continue;

    let value = rawLine.slice(eq + 1);
    if (/["']/.test(value)) {
      const mark = value.match(/["']/);
      if (!mark || mark.index === undefined) continue;
      const quote = mark[0];
      const start = mark.index + 1;
      const end = value.indexOf(quote, start);
      if (end === -1) continue;
      value = value.slice(start, end);
    } else {
      value = value.trim();
    }

    if (!VALUE_OK.test(value)) continue;
    colors[key] = value;
  }

  return colors;
}

export function asHex(value: string | undefined | null): string | null {
  if (!value) return null;
  const v = value.trim();

  if (/^#[0-9a-fA-F]{3}$/.test(v)) {
    const body = v
      .slice(1)
      .split("")
      .map((c) => c + c)
      .join("");
    return `#${body.toLowerCase()}`;
  }
  if (/^#[0-9a-fA-F]{6}$/.test(v)) return `#${v.slice(1).toLowerCase()}`;
  if (/^#[0-9a-fA-F]{8}$/.test(v)) return `#${v.slice(1, 7).toLowerCase()}`;

  const packed = v.match(/^rgba?\(([0-9a-fA-F]{6})([0-9a-fA-F]{2})?\)$/i);
  if (packed) return `#${packed[1].toLowerCase()}`;

  const channels = v.match(/^rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/i);
  if (channels) {
    const clamp = (n: number) => Math.max(0, Math.min(255, n));
    return `#${toByte(clamp(Number(channels[1])))}${toByte(clamp(Number(channels[2])))}${toByte(clamp(Number(channels[3])))}`;
  }

  return null;
}

function toByte(n: number): string {
  return n.toString(16).padStart(2, "0");
}

function parseAmount(amount: number | string): number {
  if (typeof amount === "number") {
    let a = amount;
    if (a > 1) a = a / 100;
    return Math.min(1, Math.max(0, a));
  }
  const trimmed = amount.trim();
  let a: number;
  if (trimmed.endsWith("%")) a = Number.parseFloat(trimmed) / 100;
  else {
    a = Number.parseFloat(trimmed);
    if (a > 1) a = a / 100;
  }
  if (Number.isNaN(a)) return 0;
  return Math.min(1, Math.max(0, a));
}

/** Mix two hex colours. Amount is a fraction (0.3) or a percentage ("30%"). */
export function mixColor(startHex: string, endHex: string, amount: number | string): string {
  const start = asHex(startHex);
  const end = asHex(endHex);
  if (!start || !end) {
    throw new Error(`mixColor needs hex colours, got "${startHex}" and "${endHex}"`);
  }
  const a = parseAmount(amount);
  const sr = Number.parseInt(start.slice(1, 3), 16);
  const sg = Number.parseInt(start.slice(3, 5), 16);
  const sb = Number.parseInt(start.slice(5, 7), 16);
  const er = Number.parseInt(end.slice(1, 3), 16);
  const eg = Number.parseInt(end.slice(3, 5), 16);
  const eb = Number.parseInt(end.slice(5, 7), 16);
  const channel = (from: number, to: number) => Math.floor(from * (1 - a) + to * a + 0.5);
  return `#${toByte(channel(sr, er))}${toByte(channel(sg, eg))}${toByte(channel(sb, eb))}`;
}

function fill(colors: Palette, key: string, value: string | undefined) {
  if (!colors[key] && value) colors[key] = value;
}

function sumChannels(hex: string): number {
  return (
    Number.parseInt(hex.slice(1, 3), 16) +
    Number.parseInt(hex.slice(3, 5), 16) +
    Number.parseInt(hex.slice(5, 7), 16)
  );
}

export function resolvePalette(raw: Palette, options?: { lightModeFile?: boolean }): Palette {
  const colors: Palette = { ...raw };

  const legacyShort: [string, string][] = [
    ["background", "bg"],
    ["dark_background", "dark_bg"],
    ["darker_background", "darker_bg"],
    ["lighter_background", "lighter_bg"],
    ["foreground", "fg"],
    ["dark_foreground", "dark_fg"],
    ["light_foreground", "light_fg"],
    ["bright_foreground", "bright_fg"],
  ];
  for (const [canonical, legacy] of legacyShort) fill(colors, canonical, colors[legacy]);

  fill(colors, "background", colors.color0);
  fill(colors, "foreground", colors.color7);
  if (colors.background) colors.color0 = colors.background;
  if (colors.foreground) colors.color7 = colors.foreground;

  const legacyAnsi: [string, string][] = [
    ["red", "color1"],
    ["green", "color2"],
    ["yellow", "color3"],
    ["blue", "color4"],
    ["magenta", "color5"],
    ["cyan", "color6"],
    ["bright_red", "color9"],
    ["bright_green", "color10"],
    ["bright_yellow", "color11"],
    ["bright_blue", "color12"],
    ["bright_magenta", "color13"],
    ["bright_cyan", "color14"],
  ];
  for (const [semantic, ansi] of legacyAnsi) fill(colors, semantic, colors[ansi]);
  fill(colors, "magenta", colors.purple);
  fill(colors, "bright_magenta", colors.bright_purple);

  fill(colors, "light_foreground", colors.color7 || colors.foreground);
  fill(colors, "bright_foreground", colors.color15 || colors.foreground);
  if (colors.bright_foreground) colors.cursor = colors.bright_foreground;
  fill(colors, "lighter_background", colors.color0 || colors.background);
  fill(colors, "dark_foreground", colors.color8 || colors.foreground);
  fill(colors, "muted", colors.color8 || colors.dark_foreground);
  fill(
    colors,
    "selection",
    colors.selection_background || colors.color8 || colors.color0 || colors.background,
  );
  fill(colors, "selection_background", colors.selection);
  fill(colors, "selection_foreground", colors.bright_foreground);
  fill(colors, "orange", colors.yellow);

  if (!colors.brown && asHex(colors.orange)) {
    colors.brown = mixColor(colors.orange, "#000000", "50%");
  }

  if (!colors.dark_background && asHex(colors.background)) {
    colors.dark_background = mixColor(colors.background, "#000000", "25%");
  }
  if (!colors.darker_background && asHex(colors.background)) {
    colors.darker_background = mixColor(colors.background, "#000000", "50%");
  }

  const brighten: [string, string][] = [
    ["bright_red", "red"],
    ["bright_yellow", "yellow"],
    ["bright_green", "green"],
    ["bright_cyan", "cyan"],
    ["bright_blue", "blue"],
    ["bright_magenta", "magenta"],
  ];
  for (const [bright, base] of brighten) {
    if (!colors[bright] && asHex(colors[base])) {
      colors[bright] = mixColor(colors[base], "#ffffff", "20%");
    }
  }
  fill(colors, "purple", colors.magenta);
  fill(colors, "bright_purple", colors.bright_magenta);

  const ansiFromSemantic: [string, string][] = [
    ["color0", "background"],
    ["color1", "red"],
    ["color2", "green"],
    ["color3", "yellow"],
    ["color4", "blue"],
    ["color5", "magenta"],
    ["color6", "cyan"],
    ["color7", "foreground"],
    ["color8", "muted"],
    ["color9", "bright_red"],
    ["color10", "bright_green"],
    ["color11", "bright_yellow"],
    ["color12", "bright_blue"],
    ["color13", "bright_magenta"],
    ["color14", "bright_cyan"],
    ["color15", "bright_foreground"],
  ];
  for (const [ansi, semantic] of ansiFromSemantic) fill(colors, ansi, colors[semantic]);

  for (const [canonical, legacy] of legacyShort) {
    if (colors[canonical]) colors[legacy] = colors[canonical];
  }

  if (!colors.mode) colors.mode = colors.theme_type || "";
  if (!colors.mode) {
    const background = asHex(colors.background);
    if (options?.lightModeFile) colors.mode = "light";
    else if (background) colors.mode = sumChannels(background) > 382 ? "light" : "dark";
    else colors.mode = "dark";
  }
  colors.theme_type = colors.mode;

  return colors;
}

export function rgbChannels(hex: string): { r: number; g: number; b: number } {
  const normalized = asHex(hex);
  if (!normalized) throw new Error(`Not a hex colour: ${hex}`);
  return {
    r: Number.parseInt(normalized.slice(1, 3), 16),
    g: Number.parseInt(normalized.slice(3, 5), 16),
    b: Number.parseInt(normalized.slice(5, 7), 16),
  };
}

export function rgba(hex: string, alpha: number): string {
  const { r, g, b } = rgbChannels(hex);
  const a = Math.round(Math.min(1, Math.max(0, alpha)) * 1000) / 1000;
  return `rgba(${r}, ${g}, ${b}, ${a})`;
}
