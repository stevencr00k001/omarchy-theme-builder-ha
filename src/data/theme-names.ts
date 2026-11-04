/** Display names used by the Omarchy manual, plus themes added after that page. */
const THEME_NAMES: Record<string, string> = {
  catppuccin: "Catppuccin",
  "catppuccin-latte": "Catppuccin Latte",
  ethereal: "Ethereal",
  everforest: "Everforest",
  "flexoki-light": "Flexoki Light",
  gruvbox: "Gruvbox",
  hackerman: "Hackerman",
  "jade-horse": "Jade Horse",
  kanagawa: "Kanagawa",
  "last-horizon": "Last Horizon",
  lumon: "Lumon",
  lupine: "Lupine",
  "matte-black": "Matte Black",
  miasma: "Miasma",
  nord: "Nord",
  "retro-82": "Retro 82",
  ristretto: "Ristretto",
  "rose-pine": "Rose Pine",
  solitude: "Solitude",
  starship: "Starship",
  "tokyo-night": "Tokyo Night",
  vantablack: "Vantablack",
  white: "White",
};

export function displayName(id: string): string {
  return (
    THEME_NAMES[id] ??
    id.replace(/(^|-)([a-z0-9])/g, (_, boundary: string, char: string) =>
      boundary ? ` ${char.toUpperCase()}` : char.toUpperCase(),
    )
  );
}
