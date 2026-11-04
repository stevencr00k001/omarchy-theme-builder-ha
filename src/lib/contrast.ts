import { asHex, rgbChannels } from "@/lib/colors";

function linearize(channel: number): number {
  const s = channel / 255;
  return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
}

export function relativeLuminance(hex: string): number {
  const { r, g, b } = rgbChannels(hex);
  return 0.2126 * linearize(r) + 0.7152 * linearize(g) + 0.0722 * linearize(b);
}

/** WCAG contrast ratio, 1 to 21. */
export function contrastRatio(a: string, b: string): number {
  const l1 = relativeLuminance(a);
  const l2 = relativeLuminance(b);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

export function bestOnColor(background: string): "#000000" | "#ffffff" {
  return contrastRatio("#000000", background) >= contrastRatio("#ffffff", background)
    ? "#000000"
    : "#ffffff";
}

export function blendHex(foreground: string, background: string, alpha: number): string {
  const fg = rgbChannels(foreground);
  const bg = rgbChannels(background);
  const mix = (from: number, to: number) => Math.round(from * alpha + to * (1 - alpha));
  const byte = (n: number) => n.toString(16).padStart(2, "0");
  return `#${byte(mix(fg.r, bg.r))}${byte(mix(fg.g, bg.g))}${byte(mix(fg.b, bg.b))}`;
}

export function cardContrast(
  text: string,
  card: string,
  alpha: number,
  backdrop: string,
): number {
  return contrastRatio(text, blendHex(card, backdrop, alpha));
}

/** Smallest opacity of `card` over `backdrop` that reaches `target` contrast. */
export function opacityForContrast(
  text: string,
  card: string,
  backdrop: string,
  target = 4.5,
): number {
  if (!asHex(text) || !asHex(card) || !asHex(backdrop)) return 1;
  if (cardContrast(text, card, 1, backdrop) < target) return 1;
  let lo = 0;
  let hi = 1;
  for (let i = 0; i < 16; i += 1) {
    const mid = (lo + hi) / 2;
    if (cardContrast(text, card, mid, backdrop) >= target) hi = mid;
    else lo = mid;
  }
  return Math.min(1, Math.round((hi + 0.02) * 100) / 100);
}

export type ContrastLevel = "good" | "fair" | "poor";

export function contrastLevel(ratio: number): ContrastLevel {
  if (ratio >= 4.5) return "good";
  if (ratio >= 3) return "fair";
  return "poor";
}
