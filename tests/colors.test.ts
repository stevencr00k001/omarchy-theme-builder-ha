import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { asHex, mixColor, parseColorsToml, resolvePalette } from "@/lib/colors";

const fixture = (name: string) => readFileSync(join(process.cwd(), "tests/fixtures", name), "utf8");

describe("parseColorsToml", () => {
  it("reads quoted hex, mode, and ignores comments", () => {
    const colors = parseColorsToml(`
      # comment
      mode = "dark"
      accent = "#81A1C1" # inline
      background = '#2e3440'
    `);
    expect(colors.mode).toBe("dark");
    expect(colors.accent).toBe("#81A1C1");
    expect(colors.background).toBe("#2e3440");
    expect(colors["# comment"]).toBeUndefined();
  });

  it("parses the Nord fixture", () => {
    const colors = parseColorsToml(fixture("nord.colors.toml"));
    expect(colors.accent).toBe("#81a1c1");
    expect(colors.background).toBe("#2e3440");
    expect(colors.red).toBe("#bf616a");
    expect(colors.mode).toBe("dark");
  });
});

describe("resolvePalette", () => {
  it("derives ANSI color0-color15 from a semantic palette", () => {
    const resolved = resolvePalette(parseColorsToml(fixture("nord.colors.toml")));
    expect(asHex(resolved.color0)).toBe("#2e3440");
    expect(asHex(resolved.color1)).toBe(asHex(resolved.red));
    expect(asHex(resolved.color2)).toBe(asHex(resolved.green));
    expect(asHex(resolved.color4)).toBe(asHex(resolved.blue));
    expect(asHex(resolved.color7)).toBe(asHex(resolved.foreground));
    expect(asHex(resolved.color8)).toBe(asHex(resolved.muted));
    expect(asHex(resolved.color15)).toBe(asHex(resolved.bright_foreground));
    expect(resolved.bg).toBe(resolved.background);
    expect(resolved.mode).toBe("dark");
  });

  it("maps a legacy ANSI-only file onto semantic names", () => {
    const resolved = resolvePalette(parseColorsToml(fixture("legacy-ansi.colors.toml")));
    expect(resolved.background).toBe("#1a1b26");
    expect(resolved.color0).toBe("#1a1b26");
    expect(resolved.foreground).toBe("#a9b1d6");
    expect(resolved.red).toBe("#f7768e");
    expect(resolved.blue).toBe("#7aa2f7");
    expect(resolved.muted).toBe("#414868");
    expect(resolved.bright_foreground).toBe("#c0caf5");
    expect(resolved.bg).toBe("#1a1b26");
    expect(resolved.mode).toBe("dark");
    expect(asHex(resolved.accent)).toBe("#7aa2f7");
  });

  it("lets canonical names win over legacy aliases", () => {
    const resolved = resolvePalette(
      parseColorsToml(`
        background = "#010101"
        bg = "#ffffff"
        color0 = "#222222"
        foreground = "#eeeeee"
        color7 = "#111111"
      `),
    );
    expect(resolved.background).toBe("#010101");
    expect(resolved.color0).toBe("#010101");
    expect(resolved.bg).toBe("#010101");
    expect(resolved.foreground).toBe("#eeeeee");
    expect(resolved.color7).toBe("#eeeeee");
  });

  it("detects light mode from background luminance and from light.mode", () => {
    const light = resolvePalette(parseColorsToml(`background = "#ffffff"\nforeground = "#000000"`));
    expect(light.mode).toBe("light");
    const forced = resolvePalette(
      parseColorsToml(`mode = "dark"\nbackground = "#ffffff"\nforeground = "#111111"`),
    );
    expect(forced.mode).toBe("dark");
    const file = resolvePalette(parseColorsToml(`background = "#111111"\nforeground = "#eeeeee"`), {
      lightModeFile: true,
    });
    expect(file.mode).toBe("light");
  });

  it("marks the Catppuccin Latte and White fixtures as light", () => {
    expect(resolvePalette(parseColorsToml(fixture("catppuccin-latte.colors.toml"))).mode).toBe("light");
    expect(resolvePalette(parseColorsToml(fixture("white.colors.toml"))).mode).toBe("light");
  });
});

describe("mixColor", () => {
  it("matches Omarchy's half-up channel mix", () => {
    expect(mixColor("#000000", "#ffffff", "50%")).toBe("#808080");
    expect(mixColor("#ffffff", "#000000", "25%")).toBe("#bfbfbf");
    expect(mixColor("#000000", "#ffffff", 0.5)).toBe("#808080");
  });
});
