import { readFileSync } from "node:fs";
import { afterEach, describe, expect, it } from "vitest";
import { publicPath } from "@/lib/public-path";

describe("publicPath", () => {
  const previous = process.env.NEXT_PUBLIC_BASE_PATH;

  afterEach(() => {
    if (previous === undefined) delete process.env.NEXT_PUBLIC_BASE_PATH;
    else process.env.NEXT_PUBLIC_BASE_PATH = previous;
  });

  it("keeps a root path when the site is hosted at the origin", () => {
    delete process.env.NEXT_PUBLIC_BASE_PATH;
    expect(publicPath("/brand/tesh-logo.png")).toBe("/brand/tesh-logo.png");
  });

  it("prefixes the Home Assistant panel static path", () => {
    process.env.NEXT_PUBLIC_BASE_PATH = "/omarchy_themes_static";
    expect(publicPath("/brand/tesh-logo.png")).toBe(
      "/omarchy_themes_static/brand/tesh-logo.png",
    );
  });
});

describe("panel font fallback", () => {
  it("keeps a sans-serif stack when the web font variable is missing", () => {
    const css = readFileSync("src/app/globals.css", "utf8");
    expect(css).toContain("var(--font-geist-sans, ui-sans-serif)");
    expect(css).toContain("sans-serif");
    const layout = readFileSync("src/app/layout.tsx", "utf8");
    expect(layout).toContain("viewportFit: \"cover\"");
    expect(layout).toContain("geist.variable");
    expect(layout.indexOf("geist.variable")).toBeLessThan(layout.indexOf("<body"));
  });
});
