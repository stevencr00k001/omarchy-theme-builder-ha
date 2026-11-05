import { describe, expect, it } from "vitest";
import { themeToYaml, buildTheme } from "@/lib/ha-theme";
import { resolvePalette, parseColorsToml } from "@/lib/colors";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { isPinnedWallpaperUrl } from "@/lib/wallpaper-url";
import {
  REMEMBER_WARNING,
  buildAuthorizeUrl,
  clientIdFromOrigin,
  codeChallenge,
  connectionBlockReason,
  normalizeHaUrl,
  rewriteLovelaceBackground,
  THEME_FILENAME,
  IMAGE_FILENAME,
} from "@/lib/ha-connect";

describe("Home Assistant URL checks", () => {
  it("normalises a hub URL and rejects passwords and odd schemes", () => {
    expect(normalizeHaUrl("home.example")).toEqual({ url: "https://home.example" });
    expect(normalizeHaUrl("http://home.example:8123/lovelace")).toEqual({ url: "http://home.example:8123" });
    expect("error" in normalizeHaUrl("http://user:secret@127.0.0.1:8123")).toBe(true);
    expect("error" in normalizeHaUrl("javascript:alert(1)")).toBe(true);
  });

  it("explains mixed content, including homeassistant.local", () => {
    const local = connectionBlockReason("https:", "http://homeassistant.local:8123");
    expect(local).toContain("HTTPS");
    expect(local).toContain("homeassistant.local");
    expect(local).toContain("HTTPS");
    expect(connectionBlockReason("https:", "https://home.example")).toBeNull();
    expect(connectionBlockReason("http:", "http://homeassistant.local:8123")).toBeNull();
  });
});

describe("IndieAuth URL", () => {
  it("builds an authorize URL with PKCE", async () => {
    const challenge = await codeChallenge("verifier-value");
    expect(challenge).toMatch(/^[A-Za-z0-9_-]+$/);
    const href = buildAuthorizeUrl({
      haUrl: "https://home.example",
      clientId: clientIdFromOrigin("https://hub.example"),
      redirectUri: "https://hub.example/",
      state: "abc",
      codeChallenge: challenge,
    });
    const url = new URL(href);
    expect(url.origin).toBe("https://home.example");
    expect(url.pathname).toBe("/auth/authorize");
    expect(url.searchParams.get("response_type")).toBe("code");
    expect(url.searchParams.get("client_id")).toBe("https://hub.example/");
    expect(url.searchParams.get("redirect_uri")).toBe("https://hub.example/");
    expect(url.searchParams.get("code_challenge_method")).toBe("S256");
    expect(url.searchParams.get("code_challenge")).toBe(challenge);
  });
});

describe("push payload checks", () => {
  it("keeps filenames aligned with the integration and rewrites the wallpaper path", () => {
    expect(THEME_FILENAME.test("omarchy-nord-frosted.yaml")).toBe(true);
    expect(THEME_FILENAME.test("../omarchy-nord.yaml")).toBe(false);
    expect(IMAGE_FILENAME.test("nord--1-city-view.webp")).toBe(true);
    expect(IMAGE_FILENAME.test("a..png")).toBe(true);
    const nord = resolvePalette(parseColorsToml(readFileSync(join(process.cwd(), "tests/fixtures/nord.colors.toml"), "utf8")));
    const theme = buildTheme(nord, {
      paletteName: "Nord",
      paletteId: "nord",
      styleId: "frosted",
      imageFile: "nord--city.webp",
      opacity: 0.5,
      blur: true,
      blurPx: 12,
      radius: 12,
      wallpaperCredit: "test",
    });
    const rewritten = rewriteLovelaceBackground(themeToYaml(theme, "nord"), "nord--city.jpg");
    expect(rewritten).toContain('/local/omarchy/nord--city.jpg');
    expect(rewritten).not.toContain("nord--city.webp");
  });

  it("fetches wallpapers only from the pinned Omarchy commit", () => {
    const pinned =
      "https://raw.githubusercontent.com/omacom/omarchy/cc99764098af5a2ed5cf2245d9059f4d559650f5/themes/nord/backgrounds/1-city-view.webp";
    expect(isPinnedWallpaperUrl(pinned)).toBe(true);
    expect(isPinnedWallpaperUrl("https://example.com/1-city-view.webp")).toBe(false);
    expect(isPinnedWallpaperUrl(pinned.replace("cc99764098af5a2ed5cf2245d9059f4d559650f5", "main"))).toBe(false);
    expect(isPinnedWallpaperUrl(pinned.replace("/backgrounds/", "/../../secrets/"))).toBe(false);
  });

  it("returns false for a malformed percent-encoded path segment", () => {
    const pinned =
      "https://raw.githubusercontent.com/omacom/omarchy/cc99764098af5a2ed5cf2245d9059f4d559650f5/themes/nord/backgrounds/1-city-view.webp";
    expect(isPinnedWallpaperUrl(pinned.replace("1-city-view", "%E0%A4%A"))).toBe(false);
  });

  it("warns before storing a token", () => {
    expect(REMEMBER_WARNING).toContain("local storage");
    expect(REMEMBER_WARNING).toContain("shared computer");
    expect(REMEMBER_WARNING).toContain("never sent to Top End Smart Homes");
    expect(REMEMBER_WARNING).not.toMatch(/@/);
  });
});
