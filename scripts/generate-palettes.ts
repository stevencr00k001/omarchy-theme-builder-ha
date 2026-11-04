/**
 * Rebuild src/data/themes.json from Omarchy colors.toml files.
 *
 * Wallpapers are not downloaded. The JSON stores raw GitHub URLs pinned to
 * OMARCHY_COMMIT in src/data/upstream.ts.
 *
 *   npm run generate-palettes
 *   OMARCHY_LOCAL=/path/to/omarchy npm run generate-palettes
 */
import { execSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { displayName } from "../src/data/theme-names";
import {
  OMARCHY_COMMIT,
  OMARCHY_REPO,
  OMARCHY_REPO_URL,
  OMARCHY_UPSTREAM_URL,
  wallpaperUrl,
} from "../src/data/upstream";
import { parseColorsToml } from "../src/lib/colors";

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = join(HERE, "../src/data/themes.json");
const IMAGE = /\.(webp|png|jpe?g|gif|avif)$/i;

interface Wallpaper {
  file: string;
  url: string;
  repoPath: string;
}

interface ThemeRecord {
  id: string;
  name: string;
  colors: Record<string, string>;
  backgrounds: Wallpaper[];
}

const headers = {
  Accept: "application/vnd.github+json",
  "User-Agent": "omarchy-theme-builder",
};

async function loadRemote(): Promise<ThemeRecord[]> {
  const treeUrl = `https://api.github.com/repos/${OMARCHY_REPO}/git/trees/${OMARCHY_COMMIT}?recursive=1`;
  const response = await fetch(treeUrl, { headers });
  if (!response.ok) {
    throw new Error(`GitHub tree request failed (${response.status}).`);
  }
  const body = (await response.json()) as {
    truncated?: boolean;
    tree?: { path: string; type: string }[];
  };
  if (body.truncated || !body.tree) {
    throw new Error("GitHub tree was truncated; pin a smaller lookup or use OMARCHY_LOCAL.");
  }

  const colors = new Map<string, string>();
  const backgrounds = new Map<string, string[]>();
  for (const item of body.tree) {
    if (item.type !== "blob") continue;
    const colorMatch = item.path.match(/^themes\/([^/]+)\/colors\.toml$/);
    if (colorMatch) colors.set(colorMatch[1], item.path);
    const backgroundMatch = item.path.match(/^themes\/([^/]+)\/backgrounds\/(.+)$/);
    if (!backgroundMatch || backgroundMatch[2].startsWith("intros/")) continue;
    if (!IMAGE.test(backgroundMatch[2])) continue;
    const list = backgrounds.get(backgroundMatch[1]) ?? [];
    list.push(backgroundMatch[2]);
    backgrounds.set(backgroundMatch[1], list);
  }

  const themes: ThemeRecord[] = [];
  for (const id of [...colors.keys()].sort()) {
    const rawUrl = `https://raw.githubusercontent.com/${OMARCHY_REPO}/${OMARCHY_COMMIT}/themes/${id}/colors.toml`;
    const file = await fetch(rawUrl, { headers });
    if (!file.ok) throw new Error(`Could not read ${rawUrl} (${file.status}).`);
    const text = await file.text();
    themes.push(toRecord(id, text, backgrounds.get(id) ?? []));
  }
  return themes;
}

function loadLocal(root: string): ThemeRecord[] {
  const themesDir = join(root, "themes");
  const listed = execSync("git ls-tree -r --name-only HEAD", {
    cwd: root,
    encoding: "utf8",
  });
  const backgrounds = new Map<string, string[]>();
  for (const path of listed.split("\n")) {
    const match = path.match(/^themes\/([^/]+)\/backgrounds\/(.+)$/);
    if (!match || match[2].startsWith("intros/")) continue;
    if (!IMAGE.test(match[2])) continue;
    const list = backgrounds.get(match[1]) ?? [];
    list.push(match[2]);
    backgrounds.set(match[1], list);
  }

  const ids = readdirSync(themesDir)
    .filter((name) => existsSync(join(themesDir, name, "colors.toml")))
    .sort();
  return ids.map((id) =>
    toRecord(id, readFileSync(join(themesDir, id, "colors.toml"), "utf8"), backgrounds.get(id) ?? []),
  );
}

function toRecord(id: string, toml: string, files: string[]): ThemeRecord {
  const colors = parseColorsToml(toml);
  if (!colors.background && !colors.color0 && !colors.bg) {
    throw new Error(`${id} colors.toml has no background colour.`);
  }
  const backgrounds = [...files].sort((a, b) => a.localeCompare(b, undefined, { numeric: true })).map(
    (file) => ({
      file,
      url: wallpaperUrl(id, file),
      repoPath: `themes/${id}/backgrounds/${file}`,
    }),
  );
  return { id, name: displayName(id), colors, backgrounds };
}

async function main() {
  const local = process.env.OMARCHY_LOCAL;
  let themes: ThemeRecord[];
  let via = `https://github.com/${OMARCHY_REPO} @ ${OMARCHY_COMMIT}`;
  if (local) {
    themes = loadLocal(local);
    via = `${local} (commit pin ${OMARCHY_COMMIT})`;
  } else {
    try {
      themes = await loadRemote();
    } catch (error) {
      const fallback = "/tmp/omarchy-src";
      if (existsSync(join(fallback, ".git"))) {
        console.warn(`Remote fetch failed (${error instanceof Error ? error.message : error}). Using ${fallback}.`);
        themes = loadLocal(fallback);
        via = `${fallback} after a remote failure; URLs still pin ${OMARCHY_COMMIT}`;
      } else {
        throw error;
      }
    }
  }

  if (themes.length < 10) {
    throw new Error(`Expected the built-in theme set, found ${themes.length}.`);
  }

  const bundle = {
    source: {
      repo: OMARCHY_REPO_URL,
      upstream: OMARCHY_UPSTREAM_URL,
      commit: OMARCHY_COMMIT,
      license: "MIT",
      generatedFrom: via,
      note: "Palette values are parsed from Omarchy colors.toml (MIT). Wallpaper files are not in this repository; urls point at raw.githubusercontent.com for the pinned commit.",
    },
    themes,
  };
  writeFileSync(OUT, `${JSON.stringify(bundle, null, 2)}\n`);
  console.log(`Wrote ${themes.length} themes to ${OUT}`);
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
