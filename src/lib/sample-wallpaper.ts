import { rgbChannels } from "@/lib/colors";
import { blendHex, contrastRatio } from "@/lib/contrast";

export interface SampledContrast {
  p10: number;
  median: number;
}

/** Sample the wallpaper and score text contrast after the card colour is laid over it. */
export async function sampleWallpaperContrast(
  src: string,
  cardHex: string,
  alpha: number,
  textHex: string,
): Promise<SampledContrast | null> {
  const image = new Image();
  image.crossOrigin = "anonymous";
  const loaded = await new Promise<boolean>((resolve) => {
    image.onload = () => resolve(true);
    image.onerror = () => resolve(false);
    image.src = src;
  });
  if (!loaded) return null;

  const width = 48;
  const height = 27;
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context) return null;

  try {
    context.drawImage(image, 0, 0, width, height);
    const data = context.getImageData(0, 0, width, height).data;
    const card = rgbChannels(cardHex);
    const ratios: number[] = [];
    for (let i = 0; i < data.length; i += 4) {
      const pixel = `#${byte(data[i])}${byte(data[i + 1])}${byte(data[i + 2])}`;
      const blended = blendHex(
        `#${byte(card.r)}${byte(card.g)}${byte(card.b)}`,
        pixel,
        alpha,
      );
      ratios.push(contrastRatio(textHex, blended));
    }
    ratios.sort((a, b) => a - b);
    return {
      p10: ratios[Math.floor(ratios.length * 0.1)] ?? 1,
      median: ratios[Math.floor(ratios.length * 0.5)] ?? 1,
    };
  } catch {
    return null;
  }
}

function byte(n: number): string {
  return n.toString(16).padStart(2, "0");
}
