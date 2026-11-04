export interface BundledWallpaper {
  file: string;
  url: string;
  repoPath: string;
}

export interface BundledTheme {
  id: string;
  name: string;
  colors: Record<string, string>;
  backgrounds: BundledWallpaper[];
}

export interface PaletteBundle {
  source: {
    repo: string;
    upstream: string;
    commit: string;
    license: string;
    generatedFrom?: string;
    note: string;
  };
  themes: BundledTheme[];
}
