import JSZip from "jszip";
import { isPinnedWallpaperUrl } from "@/lib/wallpaper-url";

export async function fetchImageBytes(url: string): Promise<Uint8Array> {
  if (!isPinnedWallpaperUrl(url)) {
    throw new Error("Refusing to fetch a wallpaper that is not from the pinned Omarchy commit.");
  }
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Wallpaper download failed (${response.status}).`);
  }
  return new Uint8Array(await response.arrayBuffer());
}

export async function buildThemeZip(files: {
  yamlName: string;
  yaml: string;
  imageName: string | null;
  imageBytes: Uint8Array | null;
  readme: string;
}): Promise<Blob> {
  const zip = new JSZip();
  zip.file(`themes/${files.yamlName}`, files.yaml);
  if (files.imageName && files.imageBytes) {
    zip.file(`www/omarchy/${files.imageName}`, files.imageBytes);
  }
  zip.file("README.md", files.readme);
  return zip.generateAsync({ type: "blob" });
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
