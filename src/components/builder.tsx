"use client";

import { useEffect, useMemo, useState } from "react";
import bundleJson from "@/data/themes.json";
import { OMARCHY_COMMIT, themeTreeUrl } from "@/data/upstream";
import { CARD_STYLES, cardModPlan, getCardStyle } from "@/lib/card-styles";
import type { PaletteBundle } from "@/lib/bundle";
import { asHex, resolvePalette } from "@/lib/colors";
import { cardContrast, contrastLevel, opacityForContrast } from "@/lib/contrast";
import { fetchImageBytes } from "@/lib/export-zip";
import { buildTheme, themeToYaml, wallpaperExportName } from "@/lib/ha-theme";
import { teshUrl } from "@/lib/links";
import { sampleWallpaperContrast, type SampledContrast } from "@/lib/sample-wallpaper";
import { isPinnedWallpaperUrl } from "@/lib/wallpaper-url";
import { encodeShare, resolveShare, type ShareState } from "@/lib/share";
import { DashboardPreview } from "@/components/dashboard-preview";
import {
  isSameOriginFrame,
  resolveEmbeddedHass,
  saveThemeMessage,
  type EmbeddedHass,
} from "@/lib/embedded";
import {
  assertSafeImageFilename,
  assertSafeThemeFilename,
  bytesToBase64,
  replaceExtension,
  rewriteLovelaceBackground,
  shrinkForPush,
} from "@/lib/ha-connect";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";

const bundle = bundleJson as unknown as PaletteBundle;
const FALLBACK_THEME = "tokyo-night";

export function Builder() {
  const themes = bundle.themes;
  const initial = resolveShare("", themes, CARD_STYLES, FALLBACK_THEME);
  const [state, setState] = useState<ShareState>(initial.state);
  const [hydrated, setHydrated] = useState(false);
  const [upload, setUpload] = useState<{ file: File; url: string; name: string } | null>(null);
  const [uploadMissing, setUploadMissing] = useState(false);
  const [filter, setFilter] = useState("");
  const [sample, setSample] = useState<SampledContrast | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [wallpaperBroken, setWallpaperBroken] = useState(false);
  const [embeddedHass, setEmbeddedHass] = useState<EmbeddedHass | null>(null);
  const [applying, setApplying] = useState(false);

  useEffect(() => {
    const resolved = resolveShare(window.location.search, themes, CARD_STYLES, FALLBACK_THEME);
    setState(resolved.state);
    setUploadMissing(resolved.uploadMissing);
    setHydrated(true);
  }, [themes]);

  useEffect(() => {
    if (!hydrated) return;
    const query = encodeShare({ ...state, bg: upload ? "upload" : state.bg });
    window.history.replaceState(null, "", `${window.location.pathname}${query}`);
  }, [hydrated, state, upload]);

  useEffect(() => {
    return () => {
      if (upload) URL.revokeObjectURL(upload.url);
    };
  }, [upload]);

  useEffect(() => {
    let stop = false;
    let interval = 0;
    let stopTimer = 0;
    const look = async () => {
      if (!isSameOriginFrame(window)) return;
      const hass = await resolveEmbeddedHass(window);
      if (stop || !hass) return;
      // Found it: stop polling before setting, so the connection is set once.
      stop = true;
      window.clearInterval(interval);
      window.clearTimeout(stopTimer);
      setEmbeddedHass(hass);
    };
    interval = window.setInterval(() => void look(), 500);
    stopTimer = window.setTimeout(() => window.clearInterval(interval), 8000);
    void look();
    return () => {
      stop = true;
      window.clearInterval(interval);
      window.clearTimeout(stopTimer);
    };
  }, []);

  const theme = themes.find((item) => item.id === state.theme) ?? themes[0];
  const style = getCardStyle(state.style) ?? CARD_STYLES[0];
  const palette = useMemo(() => resolvePalette(theme.colors), [theme]);
  const wallpaper = theme.backgrounds.find((item) => item.file === state.bg) ?? theme.backgrounds[0];
  const previewUrl = upload?.url ?? wallpaper?.url ?? null;
  const imageFile = upload
    ? wallpaperExportName(theme.id, upload.name)
    : wallpaper && !wallpaperBroken
      ? wallpaperExportName(theme.id, wallpaper.file)
      : null;

  const built = useMemo(
    () =>
      buildTheme(palette, {
        paletteName: theme.name,
        paletteId: theme.id,
        styleId: style.id,
        imageFile,
        opacity: state.opacity,
        blur: state.blur,
        blurPx: state.strength,
        radius: state.radius,
        wallpaperCredit: upload
          ? "Wallpaper: uploaded in the builder and packed into this zip. It never left the browser until download."
          : `Wallpaper: ${wallpaper?.repoPath ?? "none"} from Omarchy commit ${OMARCHY_COMMIT}. Not stored in the theme builder repository.`,
      }),
    [palette, theme.name, theme.id, style.id, imageFile, state.opacity, state.blur, state.strength, state.radius, upload, wallpaper?.repoPath],
  );

  const plan = cardModPlan(style, state.blur);
  const flatRatio = cardContrast(built.look.text, built.look.cardHex, built.look.cardAlpha, built.look.background);
  const ratio = sample?.p10 ?? flatRatio;
  const level = contrastLevel(ratio);
  const yaml = themeToYaml(built, theme.id);

  useEffect(() => {
    if (!previewUrl) return;
    let cancel = false;
    const handle = window.setTimeout(() => {
      void sampleWallpaperContrast(previewUrl, built.look.cardHex, built.look.cardAlpha, built.look.text).then(
        (next) => {
          if (!cancel) setSample(next);
        },
      );
    }, 180);
    return () => {
      cancel = true;
      window.clearTimeout(handle);
    };
  }, [previewUrl, built.look.cardHex, built.look.cardAlpha, built.look.text]);

  const visibleThemes = themes.filter((item) => {
    const q = filter.trim().toLowerCase();
    if (!q) return true;
    return item.name.toLowerCase().includes(q) || item.id.includes(q);
  });

  function chooseStyle(id: ShareState["style"]) {
    const next = getCardStyle(id);
    if (!next) return;
    setState((current) => ({
      ...current,
      style: id,
      opacity: next.defaults.opacity,
      blur: next.defaults.blur,
      strength: next.defaults.blurPx,
      radius: next.defaults.radius,
    }));
  }

  function chooseTheme(id: string) {
    const next = themes.find((item) => item.id === id);
    if (!next) return;
    if (upload) URL.revokeObjectURL(upload.url);
    setUpload(null);
    setWallpaperBroken(false);
    setState((current) => ({ ...current, theme: id, bg: next.backgrounds[0]?.file ?? "" }));
  }

  async function currentImage() {
    if (upload) {
      return {
        bytes: new Uint8Array(await upload.file.arrayBuffer()),
        filename: imageFile ?? wallpaperExportName(theme.id, upload.name),
        mime: upload.file.type || "image/jpeg",
      };
    }
    if (!wallpaper || wallpaperBroken || !imageFile) return null;
    const bytes = await fetchImageBytes(wallpaper.url);
    const mime = wallpaper.file.endsWith(".png")
      ? "image/png"
      : wallpaper.file.endsWith(".jpg") || wallpaper.file.endsWith(".jpeg")
        ? "image/jpeg"
        : "image/webp";
    return { bytes, filename: imageFile, mime };
  }

  async function applyEmbedded() {
    if (!embeddedHass) return;
    setApplying(true);
    setError(null);
    try {
      const filename = `${built.fileSlug}.yaml`;
      assertSafeThemeFilename(filename);
      let nextYaml = yaml;
      let imageFilename: string | undefined;
      let imageBase64: string | undefined;
      const image = await currentImage();
      if (image) {
        const shrunk = await shrinkForPush(image.bytes, image.mime);
        imageFilename = replaceExtension(image.filename, shrunk.extension);
        assertSafeImageFilename(imageFilename);
        imageBase64 = bytesToBase64(shrunk.bytes);
        nextYaml = rewriteLovelaceBackground(yaml, imageFilename);
      }
      const dark = palette.mode !== "light";
      await embeddedHass.callWS(
        saveThemeMessage({
          filename,
          yaml: nextYaml,
          imageFilename,
          imageBase64,
          setForUser: true,
          dark,
        }),
      );
      setNotice(`Applied ${built.name} for this user. It stays after a reload.`);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not apply the theme.");
    } finally {
      setApplying(false);
    }
  }

  const swatches = ["color0", "color1", "color2", "color3", "color4", "color5", "color6", "color7"].map(
    (key) => asHex(palette[key]),
  );

  return (
    <div className="mx-auto max-w-[1400px] px-4 py-6">
      <p className="max-w-3xl text-sm text-[#4d5e62] sm:text-base">
        Pick an Omarchy palette, then a card style. The mock dashboard updates before you install
        anything. Download a Home Assistant theme when it looks right. Free, in the browser,{" "}
        <a href={teshUrl("/", "intro")} className="text-[#0b3b3c] underline" rel="noopener noreferrer">
          by Top End Smart Homes
        </a>
        .
      </p>

      <div className="mt-6 grid min-w-0 grid-cols-1 items-start gap-4 sm:gap-6 lg:grid-cols-[minmax(0,240px)_minmax(0,1fr)] xl:grid-cols-[240px_minmax(0,1fr)_320px]">
        <section className="min-w-0 rounded-2xl border border-[#e3dccf] bg-[#fffcf7] p-3 lg:row-span-2 xl:row-span-1 xl:sticky xl:top-4 xl:max-h-[calc(100vh-2rem)] xl:overflow-hidden">
          <h2 className="px-1 text-sm font-semibold">Omarchy theme</h2>
          <Label className="sr-only" htmlFor="theme-filter">
            Filter themes
          </Label>
          <Input
            id="theme-filter"
            value={filter}
            onChange={(event) => setFilter(event.target.value)}
            placeholder="Filter themes"
            className="mt-2"
          />
          <div className="mt-2 flex gap-2 overflow-x-auto overscroll-x-contain pb-1 lg:max-h-[70vh] xl:max-h-[calc(100vh-7rem)] lg:flex-col lg:overflow-x-hidden lg:overflow-y-auto">
            {visibleThemes.map((item) => {
              const resolved = resolvePalette(item.colors);
              const accent = asHex(resolved.accent) ?? asHex(resolved.blue) ?? "#127c78";
              const bg = asHex(resolved.background) ?? "#111";
              const fg = asHex(resolved.foreground) ?? "#fff";
              const selected = item.id === theme.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  data-testid={`theme-${item.id}`}
                  onClick={() => chooseTheme(item.id)}
                  className={`flex min-h-11 w-max shrink-0 items-center gap-2 rounded-xl px-3 py-2 text-left lg:w-full ${selected ? "bg-[#e5f6f3] ring-2 ring-[#127c78]" : "hover:bg-[#f3eee4]"}`}
                >
                  <span className="flex shrink-0">
                    {[bg, accent, fg].map((color) => (
                      <span key={color} className="size-4 first:rounded-l-full last:rounded-r-full" style={{ background: color }} />
                    ))}
                  </span>
                  <span className="shrink-0 lg:min-w-0 lg:flex-1 lg:shrink">
                    <span className="block text-sm font-medium whitespace-nowrap lg:truncate">{item.name}</span>
                    <span className="text-[11px] text-[#4d5e62]">{resolved.mode === "light" ? "Light" : "Dark"}</span>
                  </span>
                </button>
              );
            })}
            {visibleThemes.length === 0 ? (
              <p className="px-2 py-4 text-sm text-[#4d5e62]">No theme matches that filter.</p>
            ) : null}
          </div>
        </section>

        <section className="min-w-0 xl:sticky xl:top-4 xl:self-start">
          <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
            <div>
              <h2 className="text-xl font-semibold tracking-tight">
                {theme.name}
                <span className="text-[#4d5e62]"> · {style.name}</span>
              </h2>
              <p className="text-xs text-[#4d5e62]">
                Palette commit {OMARCHY_COMMIT.slice(0, 8)} ·{" "}
                <a href={themeTreeUrl(theme.id)} className="underline" rel="noopener noreferrer">
                  theme folder
                </a>
              </p>
            </div>
            <div className="flex gap-1">
              {swatches.map((color, index) =>
                color ? (
                  <span key={`${color}-${index}`} className="size-4 rounded-sm border border-black/10" style={{ background: color }} title={`color${index}`} />
                ) : null,
              )}
            </div>
          </div>
          <DashboardPreview
            look={built.look}
            wallpaperUrl={wallpaperBroken ? null : previewUrl}
            styleName={style.name}
            contrastRatio={ratio}
            contrastSource={sample ? "Checked across the wallpaper." : "Checked against the theme background."}
            onWallpaperError={() => setWallpaperBroken(true)}
          />
        </section>

        <section className="min-w-0 space-y-4 lg:col-start-2 xl:col-start-auto">
          <div className="rounded-2xl border border-[#e3dccf] bg-[#fffcf7] p-4">
            <h2 className="text-sm font-semibold">Card style</h2>
            <p className="mt-1 text-xs text-[#4d5e62]">
              Independent of the colour theme. Any style works with any palette.
            </p>
            <div className="mt-3 grid grid-cols-2 gap-2">
              {CARD_STYLES.map((item) => {
                const selected = item.id === style.id;
                const swatch = buildTheme(palette, {
                  paletteName: theme.name,
                  paletteId: theme.id,
                  styleId: item.id,
                  imageFile: null,
                  opacity: item.defaults.opacity,
                  blur: item.defaults.blur,
                  blurPx: item.defaults.blurPx,
                  radius: item.defaults.radius,
                  wallpaperCredit: "",
                });
                return (
                  <button
                    key={item.id}
                    type="button"
                    data-testid={`style-${item.id}`}
                    onClick={() => chooseStyle(item.id)}
                    className={`min-h-11 rounded-xl border p-2 text-left ${selected ? "border-[#127c78] bg-[#e5f6f3]" : "border-[#e3dccf] bg-white"}`}
                  >
                    <span
                      className="mb-2 block h-8"
                      style={{
                        background: swatch.look.cardBackground,
                        border: `${swatch.look.borderWidth} solid ${swatch.look.borderColor}`,
                        boxShadow: swatch.look.shadow,
                        borderRadius: swatch.look.radius,
                      }}
                    />
                    <span className="block text-xs font-semibold">{item.name}</span>
                    <span className="mt-1 block text-[10px] leading-snug text-[#4d5e62]">
                      {item.cardMod === "always"
                        ? "Needs card-mod"
                        : item.cardMod === "when-blur"
                          ? "card-mod if blur is on"
                          : "Theme variables only"}
                    </span>
                  </button>
                );
              })}
            </div>
            <p className="mt-3 text-xs leading-relaxed text-[#4d5e62]">{style.blurb}</p>
            <p className="mt-1 text-xs leading-relaxed text-[#4d5e62]">{style.inspiration}</p>
          </div>

          <div className="rounded-2xl border border-[#e3dccf] bg-[#fffcf7] p-4">
            <h2 className="text-sm font-semibold">Wallpaper</h2>
            <div className="mt-2 flex gap-2 overflow-x-auto pb-1">
              {theme.backgrounds.map((item) => {
                const selected = !upload && item.file === wallpaper?.file;
                return (
                  <button
                    key={item.file}
                    type="button"
                    onClick={() => {
                      if (upload) URL.revokeObjectURL(upload.url);
                      setUpload(null);
                      setWallpaperBroken(false);
                      setState((current) => ({ ...current, bg: item.file }));
                    }}
                    className={`relative h-14 min-h-11 w-20 shrink-0 overflow-hidden rounded-lg border-2 ${selected ? "border-[#127c78]" : "border-transparent"}`}
                    title={item.file}
                  >
                    {isPinnedWallpaperUrl(item.url) ? (
                      // Wallpaper hosts are fixed at runtime and are not next/image remote patterns.
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={item.url} alt="" className="h-full w-full object-cover" />
                    ) : null}
                  </button>
                );
              })}
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <Label htmlFor="upload" className="sr-only">
                Upload a background image
              </Label>
              <Input
                id="upload"
                type="file"
                accept="image/*"
                className="max-w-full text-xs"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (!file) return;
                  if (!file.type.startsWith("image/")) {
                    setError("Choose an image file.");
                    return;
                  }
                  if (upload) URL.revokeObjectURL(upload.url);
                  setWallpaperBroken(false);
                  setUpload({ file, url: URL.createObjectURL(file), name: file.name });
                  setError(null);
                }}
              />
            </div>
            {upload ? (
              <p className="mt-2 text-xs text-[#4d5e62]">
                Using {upload.name}. It stays in this browser until you apply the theme.
                <button
                  type="button"
                  className="ml-2 underline"
                  onClick={() => {
                    URL.revokeObjectURL(upload.url);
                    setUpload(null);
                  }}
                >
                  Remove
                </button>
              </p>
            ) : (
              <p className="mt-2 text-xs text-[#4d5e62]">
                {wallpaper ? wallpaper.file : "This theme has no still wallpaper."} Loaded from Omarchy
                on GitHub, not stored here.
              </p>
            )}
            {uploadMissing ? (
              <p className="mt-2 text-xs text-[#9f2d2d]">
                This link used a private upload. The theme wallpaper is shown instead.
              </p>
            ) : null}
          </div>

          <div className="rounded-2xl border border-[#e3dccf] bg-[#fffcf7] p-4">
            <h2 className="text-sm font-semibold">Fine tuning</h2>
            <div className="mt-4 space-y-4">
              <div>
                <div className="mb-2 flex justify-between text-xs">
                  <Label htmlFor="opacity">Card opacity</Label>
                  <span>{Math.round(state.opacity * 100)}%</span>
                </div>
                <Slider
                  id="opacity"
                  min={10}
                  max={100}
                  step={1}
                  value={[Math.round(state.opacity * 100)]}
                  onValueChange={(value) => {
                    const next = Array.isArray(value) ? value[0] : value;
                    setState((current) => ({ ...current, opacity: next / 100 }));
                  }}
                />
              </div>
              <div className="flex min-h-11 items-center justify-between gap-3">
                <Label htmlFor="blur">Frosted blur</Label>
                <Switch
                  id="blur"
                  checked={state.blur}
                  onCheckedChange={(checked) => setState((current) => ({ ...current, blur: checked }))}
                />
              </div>
              <div className={state.blur ? "" : "opacity-50"}>
                <div className="mb-2 flex justify-between text-xs">
                  <Label htmlFor="strength">Blur strength</Label>
                  <span>{state.strength}px</span>
                </div>
                <Slider
                  id="strength"
                  min={0}
                  max={40}
                  step={1}
                  disabled={!state.blur}
                  value={[state.strength]}
                  onValueChange={(value) => {
                    const next = Array.isArray(value) ? value[0] : value;
                    setState((current) => ({ ...current, strength: next }));
                  }}
                />
              </div>
              <div>
                <div className="mb-2 flex justify-between text-xs">
                  <Label htmlFor="radius">Corner radius</Label>
                  <span>{state.radius}px</span>
                </div>
                <Slider
                  id="radius"
                  min={0}
                  max={32}
                  step={1}
                  value={[state.radius]}
                  onValueChange={(value) => {
                    const next = Array.isArray(value) ? value[0] : value;
                    setState((current) => ({ ...current, radius: next }));
                  }}
                />
              </div>
            </div>

            <div className="mt-4 rounded-xl bg-[#f3eee4] p-3 text-xs leading-relaxed">
              <p className="font-medium">
                Contrast {ratio.toFixed(1)}:1 · {level === "good" ? "Comfortable" : level === "fair" ? "A bit low" : "Hard to read"}
              </p>
              <p className="mt-1 text-[#4d5e62]">
                {sample
                  ? "Measured on the wallpaper, under the card colour."
                  : "Measured against the theme background. The wallpaper sample was not available."}
              </p>
              {level !== "good" ? (
                <Button
                  type="button"
                  variant="outline"
                  className="mt-2"
                  onClick={() => {
                    const suggested = opacityForContrast(
                      built.look.text,
                      built.look.cardHex,
                      built.look.background,
                    );
                    setState((current) => ({
                      ...current,
                      opacity: Math.max(current.opacity, suggested),
                    }));
                  }}
                >
                  Raise card opacity
                </Button>
              ) : null}
            </div>

            <div className="mt-4">
              {plan.needed ? (
                <Badge variant="outline">Needs card-mod from HACS</Badge>
              ) : (
                <Badge variant="secondary">Theme variables only</Badge>
              )}
              <ul className="mt-2 list-disc pl-4 text-xs text-[#4d5e62]">
                {plan.reasons.length ? plan.reasons.map((reason) => <li key={reason}>{reason}</li>) : <li>{style.cardModNote}</li>}
              </ul>
            </div>

            <div className="mt-4">
              <h3 className="text-sm font-semibold">Apply</h3>
              <p className="mt-1 text-xs text-[#4d5e62]">
                Saves the theme in config/themes, reloads themes, and selects it for this account.
                Nothing is sent to Top End Smart Homes.
              </p>
              <Button
                type="button"
                className="mt-2 w-full"
                onClick={() => void applyEmbedded()}
                disabled={!embeddedHass || applying}
              >
                {embeddedHass ? (applying ? "Applying…" : "Apply") : "Waiting for Home Assistant…"}
              </Button>
            </div>
            {notice ? <p className="mt-2 text-xs text-[#0b3b3c]">{notice}</p> : null}
            {error ? <p className="mt-2 text-xs text-[#9f2d2d]">{error}</p> : null}
          </div>
        </section>
      </div>
    </div>
  );
}
