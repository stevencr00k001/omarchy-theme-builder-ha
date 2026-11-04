import { describe, expect, it } from "vitest";
import { CARD_STYLES } from "@/lib/card-styles";
import { teshUrl, UTM_MEDIUM, UTM_SOURCE } from "@/lib/links";
import { encodeShare, resolveShare, type ShareState } from "@/lib/share";

const themes = [
  { id: "tokyo-night", backgrounds: [{ file: "0-liftoff.webp" }, { file: "1-winding-road.webp" }] },
  { id: "nord", backgrounds: [{ file: "1-city-view.webp" }] },
];

describe("share links", () => {
  it("round-trips theme, style, wallpaper, and sliders", () => {
    const state: ShareState = {
      theme: "nord",
      bg: "1-city-view.webp",
      style: "terminal",
      opacity: 0.8,
      blur: false,
      strength: 4,
      radius: 0,
    };
    const again = resolveShare(encodeShare(state), themes, CARD_STYLES, "tokyo-night");
    expect(again.uploadMissing).toBe(false);
    expect(again.state).toEqual(state);
  });

  it("applies a style's defaults when the link only names the style", () => {
    const resolved = resolveShare("?theme=nord&style=outlined", themes, CARD_STYLES, "tokyo-night");
    const outlined = CARD_STYLES.find((style) => style.id === "outlined")!;
    expect(resolved.state.style).toBe("outlined");
    expect(resolved.state.opacity).toBe(outlined.defaults.opacity);
    expect(resolved.state.blur).toBe(outlined.defaults.blur);
    expect(resolved.state.radius).toBe(outlined.defaults.radius);
    expect(resolved.state.bg).toBe("1-city-view.webp");
  });

  it("drops injected theme and wallpaper parameters", () => {
    const resolved = resolveShare(
      "?theme=nord%3Cscript%3E&style=frosted&bg=..%2F..%2Fsecrets.png&opacity=2&blur=no",
      themes,
      CARD_STYLES,
      "tokyo-night",
    );
    expect(resolved.state.theme).toBe("tokyo-night");
    expect(resolved.state.bg).toBe("0-liftoff.webp");
    expect(resolved.state.opacity).toBeLessThanOrEqual(1);
    expect(resolved.state.blur).toBe(true);
  });

  it("ignores an unknown theme or style and notes a private upload", () => {
    const resolved = resolveShare("?theme=nope&style=nope&bg=upload", themes, CARD_STYLES, "tokyo-night");
    expect(resolved.state.theme).toBe("tokyo-night");
    expect(resolved.state.style).toBe("frosted");
    expect(resolved.uploadMissing).toBe(true);
    expect(resolved.state.bg).toBe("0-liftoff.webp");
  });
});

describe("TESH links", () => {
  it("adds placement-specific UTM parameters", () => {
    const kits = new URL(teshUrl("/kits", "export-kits"));
    expect(kits.origin).toBe("https://www.topendsmarthomes.com.au");
    expect(kits.pathname).toBe("/kits");
    expect(kits.searchParams.get("utm_source")).toBe(UTM_SOURCE);
    expect(kits.searchParams.get("utm_medium")).toBe(UTM_MEDIUM);
    expect(kits.searchParams.get("utm_campaign")).toBe("export-kits");

    const home = new URL(teshUrl("/", "header"));
    expect(home.pathname).toBe("/");
    expect(home.searchParams.get("utm_campaign")).toBe("header");

    const tutorials = new URL(teshUrl("/tutorials", "export-tutorials"));
    expect(tutorials.pathname).toBe("/tutorials");
    expect(tutorials.searchParams.get("utm_campaign")).toBe("export-tutorials");
  });
});
