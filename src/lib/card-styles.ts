/**
 * Card styles are independent of the Omarchy palette.
 * Each one is original CSS for this project. Inspiration is credited in `inspiration`
 * and is not a copy of Hyprland, Waybar, card-mod examples beyond the documented API,
 * or any third-party Home Assistant theme.
 */

export const CARD_STYLE_IDS = [
  "frosted",
  "nexus",
  "solid",
  "outlined",
  "terminal",
  "waybar",
  "neon",
  "minimal",
  "matte",
  "tiled",
] as const;

export type CardStyleId = (typeof CARD_STYLE_IDS)[number];

export interface StyleDefaults {
  opacity: number;
  blur: boolean;
  blurPx: number;
  radius: number;
  gap: number;
}

export interface CardStyle {
  id: CardStyleId;
  name: string;
  blurb: string;
  inspiration: string;
  /** always: the style's signature needs card-mod. when-blur: only the blur does. never: theme variables are enough. */
  cardMod: "always" | "when-blur" | "never";
  cardModNote: string;
  defaults: StyleDefaults;
}

export const CARD_STYLES: CardStyle[] = [
  {
    id: "frosted",
    name: "Frosted glass",
    blurb: "Translucent cards with a backdrop blur over the wallpaper.",
    inspiration:
      "Glassmorphism, in the spirit of a blurred desktop. The CSS was written for this project.",
    cardMod: "when-blur",
    cardModNote: "Blur needs card-mod from HACS.",
    defaults: { opacity: 0.58, blur: true, blurPx: 20, radius: 18, gap: 12 },
  },
  {
    id: "nexus",
    name: "Nexus-style",
    blurb: "Soft, airy cards with a light sheen, a hairline edge, and a deep shadow.",
    inspiration:
      "Inspired by the elevated card look people call Nexus-style. This CSS is original and does not copy a third-party theme.",
    cardMod: "never",
    cardModNote: "Theme variables only.",
    defaults: { opacity: 0.94, blur: false, blurPx: 16, radius: 24, gap: 14 },
  },
  {
    id: "solid",
    name: "Solid",
    blurb: "Opaque cards and a quiet shadow. The wallpaper stays in the gaps.",
    inspiration: "A plain Home Assistant card. Original CSS.",
    cardMod: "never",
    cardModNote: "Theme variables only.",
    defaults: { opacity: 1, blur: false, blurPx: 12, radius: 12, gap: 10 },
  },
  {
    id: "outlined",
    name: "Outlined",
    blurb: "An accent border and room between cards, like windows on a tiled desktop.",
    inspiration:
      "Inspired by Hyprland window borders and gaps, the compositor Omarchy uses. Original CSS, not taken from Hyprland.",
    cardMod: "never",
    cardModNote: "Theme variables only.",
    defaults: { opacity: 0.92, blur: false, blurPx: 12, radius: 10, gap: 16 },
  },
  {
    id: "terminal",
    name: "Terminal",
    blurb: "Monospace type, square corners, and a hard accent border.",
    inspiration:
      "Inspired by terminal interfaces such as the ones Omarchy themes. Original CSS.",
    cardMod: "never",
    cardModNote: "Theme variables only.",
    defaults: { opacity: 1, blur: false, blurPx: 0, radius: 0, gap: 10 },
  },
  {
    id: "waybar",
    name: "Waybar",
    blurb: "A short header bar with an accent rule. Cards stay calm underneath.",
    inspiration:
      "Inspired by Waybar, the status bar Omarchy ships. Original CSS. Waybar's source is not included.",
    cardMod: "always",
    cardModNote: "The header bar needs card-mod from HACS (card-mod-root).",
    defaults: { opacity: 0.97, blur: false, blurPx: 12, radius: 8, gap: 10 },
  },
  {
    id: "neon",
    name: "Neon glow",
    blurb: "An accent edge and a soft glow taken from the palette.",
    inspiration: "Original glow treatment using the theme accent.",
    cardMod: "never",
    cardModNote: "Theme variables only. The glow is a card shadow.",
    defaults: { opacity: 0.86, blur: false, blurPx: 16, radius: 14, gap: 14 },
  },
  {
    id: "minimal",
    name: "Minimal",
    blurb: "No shadow and no border. Type and colour carry the layout.",
    inspiration: "Original flat treatment.",
    cardMod: "never",
    cardModNote: "Theme variables only.",
    defaults: { opacity: 1, blur: false, blurPx: 0, radius: 6, gap: 8 },
  },
  {
    id: "matte",
    name: "Matte",
    blurb: "Fully opaque, chalky cards with a diffuse shadow and no hard edge.",
    inspiration: "Original matte treatment.",
    cardMod: "never",
    cardModNote: "Theme variables only.",
    defaults: { opacity: 1, blur: false, blurPx: 0, radius: 18, gap: 14 },
  },
  {
    id: "tiled",
    name: "Tiled",
    blurb: "Gap-separated tiles with a thin accent edge.",
    inspiration:
      "Inspired by Hyprland's tiled windows and gaps. Original CSS, not taken from Hyprland.",
    cardMod: "never",
    cardModNote: "Theme variables only.",
    defaults: { opacity: 0.95, blur: false, blurPx: 0, radius: 4, gap: 18 },
  },
];

export function getCardStyle(id: string): CardStyle | undefined {
  return CARD_STYLES.find((style) => style.id === id);
}

export function cardModPlan(
  style: CardStyle,
  blur: boolean,
): { needed: boolean; reasons: string[] } {
  const reasons: string[] = [];
  if (style.cardMod === "always") reasons.push(style.cardModNote);
  if (blur) {
    reasons.push("Backdrop blur needs card-mod from HACS (backdrop-filter on the cards).");
  }
  return { needed: reasons.length > 0, reasons };
}
