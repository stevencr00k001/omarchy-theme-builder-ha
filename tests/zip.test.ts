import JSZip from "jszip";
import { describe, expect, it } from "vitest";
import { buildThemeZip } from "@/lib/export-zip";

describe("theme zip", () => {
  it("contains the theme YAML, wallpaper, and install readme", async () => {
    const blob = await buildThemeZip({
      yamlName: "omarchy-nord-frosted.yaml",
      yaml: '\"Omarchy Nord - Frosted glass\":\n  primary-color: \"#81a1c1\"\n',
      imageName: "nord--city.webp",
      imageBytes: new Uint8Array([1, 2, 3, 4]),
      readme: "Install into config/themes and config/www.\n",
    });
    const zip = await JSZip.loadAsync(await blob.arrayBuffer());
    const names = Object.keys(zip.files)
      .filter((name) => !name.endsWith("/"))
      .sort();
    expect(names).toEqual([
      "README.md",
      "themes/omarchy-nord-frosted.yaml",
      "www/omarchy/nord--city.webp",
    ]);
    const yaml = await zip.file("themes/omarchy-nord-frosted.yaml")!.async("string");
    expect(yaml).toContain("primary-color");
    const image = await zip.file("www/omarchy/nord--city.webp")!.async("uint8array");
    expect(Array.from(image)).toEqual([1, 2, 3, 4]);
  });
});
