import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { CARD_STYLES } from "@/lib/card-styles";
import { parseColorsToml, resolvePalette } from "@/lib/colors";
import { contrastRatio } from "@/lib/contrast";
import {
  buildInstallReadme,
  buildTheme,
  quoteYaml,
  themeToYaml,
  wallpaperExportName,
  type ThemeOptions,
} from "@/lib/ha-theme";

const fixture = (name: string) => readFileSync(join(process.cwd(), "tests/fixtures", name), "utf8");

function options(patch: Partial<ThemeOptions> = {}): ThemeOptions {
  return {
    paletteName: "Nord",
    paletteId: "nord",
    styleId: "frosted",
    imageFile: "nord--1-city-view.webp",
    opacity: 0.58,
    blur: true,
    blurPx: 20,
    radius: 18,
    wallpaperCredit: "Wallpaper: themes/nord/backgrounds/1-city-view.webp",
    ...patch,
  };
}

const nord = () => resolvePalette(parseColorsToml(fixture("nord.colors.toml")));
const latte = () => resolvePalette(parseColorsToml(fixture("catppuccin-latte.colors.toml")));

describe("colors.toml to Home Assistant", () => {
  it("maps Nord semantic colours onto the frontend theme variables", () => {
    const theme = buildTheme(nord(), options());
    expect(theme.variables["primary-color"]).toBe("#81a1c1");
    expect(theme.variables["accent-color"]).toBe("#88c0d0");
    expect(theme.variables["primary-background-color"]).toBe("#2e3440");
    expect(theme.variables["secondary-background-color"]).toBe("#3b4252");
    expect(theme.variables["primary-text-color"]).toBe("#d8dee9");
    expect(theme.variables["error-color"]).toBe("#bf616a");
    expect(theme.variables["warning-color"]).toBe("#ebcb8b");
    expect(theme.variables["success-color"]).toBe("#a3be8c");
    expect(theme.variables["info-color"]).toBe("#88c0d0");
    expect(theme.variables["app-header-background-color"]).toContain("rgba(");
    expect(theme.variables["divider-color"]).toContain("rgba(");
    expect(theme.variables["lovelace-background"]).toBe(
      'center / cover no-repeat fixed url("/local/omarchy/nord--1-city-view.webp")',
    );
    expect(theme.variables["ha-card-border-radius"]).toBe("18px");
    expect(theme.variables["card-background-color"]).toContain("rgba(");
    expect(theme.variables["ha-card-background"]).toBe(theme.variables["card-background-color"]);
  });

  it("falls back to ANSI blue when a legacy palette has no accent", () => {
    const resolved = resolvePalette(
      parseColorsToml(`
        color0 = "#111111"
        color4 = "#3366ff"
        color7 = "#eeeeee"
      `),
    );
    const theme = buildTheme(resolved, options({ styleId: "solid", blur: false, opacity: 1 }));
    expect(theme.variables["primary-color"]).toBe("#3366ff");
  });

  it("uses a light palette's own text colour", () => {
    const theme = buildTheme(latte(), options({ paletteName: "Catppuccin Latte", paletteId: "catppuccin-latte", styleId: "solid", blur: false, opacity: 1 }));
    expect(theme.variables["primary-color"]).toBe("#1e66f5");
    expect(theme.variables["primary-text-color"]).toBe("#4c4f69");
    expect(theme.variables["primary-background-color"]).toBe("#eff1f5");
  });
});

describe("card styles", () => {
  it("keeps style structure stable across palettes", () => {
    const left = buildTheme(nord(), options({ styleId: "outlined", blur: false }));
    const right = buildTheme(
      latte(),
      options({
        paletteName: "Catppuccin Latte",
        paletteId: "catppuccin-latte",
        styleId: "outlined",
        blur: false,
      }),
    );
    expect(left.variables["primary-color"]).not.toBe(right.variables["primary-color"]);
    expect(left.variables["ha-card-border-width"]).toBe("2px");
    expect(right.variables["ha-card-border-width"]).toBe("2px");
    expect(left.variables["ha-card-border-color"]).toBe(left.variables["primary-color"]);
    expect(right.variables["ha-card-border-color"]).toBe(right.variables["primary-color"]);
    expect(left.needsCardMod).toBe(false);
    expect(right.needsCardMod).toBe(false);
    expect(left.variables["ha-view-sections-column-gap"]).toBe("16px");
  });

  it("adds card-mod blur only when blur is on", () => {
    const frosted = buildTheme(nord(), options());
    expect(frosted.needsCardMod).toBe(true);
    expect(frosted.cardMod?.theme).toBe(frosted.name);
    expect(frosted.cardMod?.card).toContain("backdrop-filter: blur(20px)");
    expect(frosted.cardMod?.card).toContain("-webkit-backdrop-filter");

    const flat = buildTheme(nord(), options({ blur: false }));
    expect(flat.needsCardMod).toBe(false);
    expect(flat.cardMod).toBeNull();

    const solid = buildTheme(nord(), options({ styleId: "solid", blur: false, opacity: 1 }));
    expect(solid.needsCardMod).toBe(false);
    expect(themeToYaml(solid, "nord")).not.toContain("card-mod");

    const solidBlur = buildTheme(nord(), options({ styleId: "solid", blur: true, blurPx: 8 }));
    expect(solidBlur.needsCardMod).toBe(true);
    expect(solidBlur.cardMod?.card).toContain("backdrop-filter: blur(8px)");
  });

  it("exports terminal, waybar, neon, tiled, and nexus without borrowing third-party CSS", () => {
    const terminal = buildTheme(nord(), options({ styleId: "terminal", blur: false, radius: 0, opacity: 1 }));
    expect(terminal.variables["ha-font-family-body"]).toContain("ui-monospace");
    expect(terminal.variables["ha-card-border-radius"]).toBe("0px");
    expect(terminal.variables["ha-card-border-color"]).toBe("#81a1c1");
    expect(terminal.needsCardMod).toBe(false);
    expect(terminal.look.fontFamily).toContain("ui-monospace");

    const waybar = buildTheme(nord(), options({ styleId: "waybar", blur: false }));
    expect(waybar.needsCardMod).toBe(true);
    expect(waybar.cardMod?.root).toContain(".header");
    expect(waybar.cardMod?.root).toContain("#81a1c1");
    expect(waybar.cardMod?.root?.length ?? 0).toBeLessThan(500);

    const neon = buildTheme(nord(), options({ styleId: "neon", blur: false }));
    expect(neon.needsCardMod).toBe(false);
    expect(neon.variables["ha-card-box-shadow"]).toContain("#81a1c1");
    expect(neon.look.shadow).toBe(neon.variables["ha-card-box-shadow"]);

    const tiled = buildTheme(nord(), options({ styleId: "tiled", blur: false }));
    expect(tiled.variables["masonry-view-card-margin"]).toBe("18px");
    expect(tiled.variables["ha-card-border-width"]).toBe("1px");
    expect(tiled.needsCardMod).toBe(false);

    const nexus = buildTheme(nord(), options({ styleId: "nexus", blur: false }));
    expect(nexus.needsCardMod).toBe(false);
    expect(nexus.variables["ha-card-background"]).toContain("linear-gradient");
    expect(nexus.look.cardBackground).toBe(nexus.variables["ha-card-background"]);
  });

  it("builds every style from the Nord fixture", () => {
    for (const style of CARD_STYLES) {
      const theme = buildTheme(nord(), options({ styleId: style.id, ...style.defaults, blurPx: style.defaults.blurPx }));
      expect(theme.name).toContain(style.name);
      expect(theme.variables["primary-color"]).toBe("#81a1c1");
      expect(theme.look.radius).toBe(theme.variables["ha-card-border-radius"]);
      const yaml = themeToYaml(theme, "nord");
      expect(yaml).toContain(`"${theme.name}":`);
      if (theme.needsCardMod) {
        expect(yaml).toContain(`card-mod-theme: "${theme.name}"`);
      }
    }
  });
});

describe("yaml and readme", () => {
  it("quotes strings and documents install plus card-mod", () => {
    expect(quoteYaml(`say "hi" \\ now`)).toBe(`"say \\"hi\\" \\\\ now"`);
    const theme = buildTheme(nord(), options());
    const yaml = themeToYaml(theme, "nord");
    expect(yaml).toContain('primary-color: "#81a1c1"');
    expect(yaml).toContain("card-mod-card: |");
    expect(yaml).not.toContain("!include");

    const readme = buildInstallReadme(theme, "nord", theme.inspiration);
    expect(readme).toContain("frontend:");
    expect(readme).toContain("themes: !include_dir_merge_named themes");
    expect(readme).toContain("config/www/omarchy/");
    expect(readme).toContain("profile");
    expect(readme).toContain("card-mod");
    expect(readme).toContain("utm_source=omarchy-theme-builder");
    expect(readme).toContain("utm_medium=app");
    expect(readme).toContain("utm_campaign=export-readme");
    expect(readme).toContain("topendsmarthomes.com.au");
    expect(readme).not.toMatch(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i);
  });

  it("omits the card-mod section when the style does not need it", () => {
    const theme = buildTheme(nord(), options({ styleId: "minimal", blur: false, opacity: 1 }));
    const readme = buildInstallReadme(theme, "nord", "Wallpaper: none");
    expect(readme).toContain("does not need card-mod");
    expect(themeToYaml(theme, "nord")).not.toContain("card-mod-theme");
  });

  it("sanitises wallpaper file names", () => {
    expect(wallpaperExportName("nord", "1 City View.WEBP")).toBe("nord--1-city-view.webp");
    expect(wallpaperExportName("rose-pine", "../etc/passwd.png")).toBe("rose-pine--passwd.png");
  });
});

describe("contrast", () => {
  it("scores black on white as 21:1", () => {
    expect(contrastRatio("#000000", "#ffffff")).toBeCloseTo(21, 0);
    expect(contrastRatio("#111111", "#111111")).toBeCloseTo(1, 5);
  });
});
