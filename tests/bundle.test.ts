import { readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import bundleJson from "@/data/themes.json";
import { OMARCHY_COMMIT } from "@/data/upstream";
import type { PaletteBundle } from "@/lib/bundle";
import { CARD_STYLES } from "@/lib/card-styles";
import { resolvePalette } from "@/lib/colors";
import { buildTheme } from "@/lib/ha-theme";

const bundle = bundleJson as unknown as PaletteBundle;

function walk(dir: string, found: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    if (name === "node_modules" || name === ".next" || name === ".git" || name === "out") continue;
    const path = join(dir, name);
    if (statSync(path).isDirectory()) walk(path, found);
    else found.push(path);
  }
  return found;
}

describe("bundled Omarchy palettes", () => {
  it("pins wallpaper URLs to the upstream commit and ships no wallpaper files", () => {
    expect(bundle.source.commit).toBe(OMARCHY_COMMIT);
    expect(bundle.themes.length).toBeGreaterThanOrEqual(20);
    for (const theme of bundle.themes) {
      expect(theme.colors.background || theme.colors.color0 || theme.colors.bg).toBeTruthy();
      expect(theme.backgrounds.length).toBeGreaterThan(0);
      for (const background of theme.backgrounds) {
        expect(background.url).toContain("raw.githubusercontent.com");
        expect(background.url).toContain(OMARCHY_COMMIT);
        expect(background.url).toContain(`/themes/${theme.id}/backgrounds/`);
        expect(background.repoPath.startsWith("themes/")).toBe(true);
      }
      const resolved = resolvePalette(theme.colors);
      const built = buildTheme(resolved, {
        paletteName: theme.name,
        paletteId: theme.id,
        styleId: "frosted",
        imageFile: "example.webp",
        opacity: 0.6,
        blur: true,
        blurPx: 16,
        radius: 16,
        wallpaperCredit: "test",
      });
      expect(built.variables["primary-color"]).toMatch(/^#[0-9a-f]{6}$/);
      expect(built.variables["lovelace-background"]).toContain("/local/omarchy/example.webp");
    }
  });

  it("maps every palette with every card style", () => {
    for (const theme of bundle.themes) {
      const resolved = resolvePalette(theme.colors);
      for (const style of CARD_STYLES) {
        const built = buildTheme(resolved, {
          paletteName: theme.name,
          paletteId: theme.id,
          styleId: style.id,
          imageFile: null,
          opacity: style.defaults.opacity,
          blur: style.defaults.blur,
          blurPx: style.defaults.blurPx,
          radius: style.defaults.radius,
          wallpaperCredit: "test",
        });
        expect(built.variables["primary-background-color"]).toMatch(/^#[0-9a-f]{6}$/);
        expect(built.needsCardMod).toBe(style.cardMod === "always" || style.defaults.blur);
      }
    }
  });

  it("does not keep Omarchy wallpaper binaries in the repo", () => {
    const images = walk(process.cwd()).filter((path) =>
      /\.(webp|jpe?g)$/i.test(path),
    );
    expect(images).toEqual([]);
  });
});
