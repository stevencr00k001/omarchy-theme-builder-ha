# Omarchy Theme Builder for Home Assistant

A free, static web app by [Top End Smart Homes](https://www.topendsmarthomes.com.au/?utm_source=omarchy-theme-builder&utm_medium=app&utm_campaign=readme). Pick a built-in [Omarchy](https://github.com/omacom/omarchy) palette, or your own wallpaper, and preview it on a mock Home Assistant dashboard. Card style is separate from the palette: frosted glass, a Nexus-style sheen, solid, outlined, terminal, Waybar, neon, minimal, matte, or tiled. Then download a theme you can install on your own hub.

Wallpapers are not stored in this repository. The app loads them at runtime from Omarchy's public GitHub files, pinned to a commit. Those images remain the work of their authors. The MIT license covers the code in this repository only. Uploaded pictures stay in the browser until you export.

## Run locally

```bash
npm install
npm run dev
```

Open http://127.0.0.1:4317

```bash
npm test
python3 -m pip install pytest pyyaml voluptuous
python3 -m pytest tests/python -q
npm run build
```

`npm run build` writes a static site to `out/`.

## Deploy to Cloudflare Pages

- Build command: `npm run build`
- Output directory: `out`
- Node.js 22
- Optional environment variable: `NEXT_PUBLIC_SITE_URL` set to the public URL of this app, so Open Graph images resolve to the right host

No server, database, or API key is required.

## Inside Home Assistant

The same builder is bundled into the `omarchy_themes` integration and shown to administrators as a sidebar item, **Omarchy Themes** (`mdi:palette`). Wallpapers are still loaded from Omarchy’s GitHub repository at view time. They are not stored in the integration.

In that panel there is no sign-in step. **Apply** uses the account you are already logged in with, writes the theme, reloads themes, and can select the theme for that user only. Copy YAML and the zip download stay available. The public site at `https://themes.topendsmarthomes.com.au` is unchanged and still uses Connect to Home Assistant.

### HACS

1. HACS → Integrations → Custom repositories.
2. Add `https://github.com/stevencr00k001/omarchy-theme-builder-ha`. Category: Integration.
3. Download Omarchy Themes.
4. Restart Home Assistant.
5. Settings → Devices & services → Add integration → Omarchy Themes.

### Manual

1. Copy `custom_components/omarchy_themes` to `/config/custom_components/omarchy_themes`.
2. Restart Home Assistant.
3. Settings → Devices & services → Add integration → Omarchy Themes.

You can instead add `omarchy_themes:` to `configuration.yaml` and restart.

Rebuild the bundled panel after UI changes with `npm run build:panel`, then rebuild the public site with `npm run build` so `out/` stays the root-hosted site.

## Connect to Home Assistant

Export offers two choices. **Download zip** and **Copy YAML** stay as they are. **Connect to Home Assistant** pushes the theme from this browser straight to your hub. There is no Top End Smart Homes server in that path.

Sign-in uses Home Assistant’s IndieAuth flow: the page sends you to your hub, you approve access, and the browser exchanges the code at your hub’s `/auth/token` endpoint (that endpoint allows browser requests). You can instead paste a long-lived access token from your profile. The token stays in memory. **Remember on this browser** stores it in local storage; leave that off on a shared computer.

Home Assistant has no built-in API to write theme files. The push uses the companion integration in `custom_components/omarchy_themes` (domain `omarchy_themes`). It checks the theme name, filename, image type, and size, rejects path traversal, writes `config/themes` and `config/www/omarchy`, calls `frontend.reload_themes`, and can call `frontend.set_theme`. Only an administrator can do this. It does not add a sidebar panel.

If the integration is missing, the app says so and shows how to add it:

1. In HACS, add this repository as a custom repository with category Integration, then download Omarchy Themes.
2. Restart Home Assistant.
3. Add the Omarchy Themes integration under Settings, Devices & services. Or add `omarchy_themes:` to `configuration.yaml` and restart.

### Limitations

- An HTTPS page cannot call `http://homeassistant.local` or any other `http://` hub. The browser blocks that mixed content. Use your hub's HTTPS address, or download the YAML.
- The browser must be able to reach the hub. A cloud-hosted copy of this app cannot see a hub that is only on your LAN unless you use a remote HTTPS URL.
- Direct push scales a wallpaper down when it would exceed Home Assistant’s websocket size (about 4 MB). The zip keeps the original file.
- `frontend.set_theme` sets the default theme. A theme selected in your profile still wins until you change it.
- Signing in needs this app at the site root, because the IndieAuth client id is the site origin.

## Install a theme in Home Assistant

The zip explains this again. In short:

1. Copy `themes/omarchy-<palette>-<style>.yaml` to `config/themes/`.
2. Copy `www/omarchy/<image>` to `config/www/omarchy/`.
3. In `configuration.yaml`:

```yaml
frontend:
  themes: !include_dir_merge_named themes
```

4. Restart Home Assistant, or reload themes.
5. Open your profile and select the theme.

Frosted blur, and the Waybar-style header, need [card-mod](https://github.com/thomasloven/lovelace-card-mod) from HACS. The app marks those styles. Other styles are ordinary theme variables. Turning blur on for any style adds a card-mod block.

## Card styles

Styles combine with any palette. Selecting one sets a starting opacity, blur, and radius; the sliders still override them. The preview uses the same values as the YAML.

| Style | What it changes | card-mod |
| --- | --- | --- |
| Frosted glass | Translucent cards and backdrop blur | Required while blur is on |
| Nexus-style | Soft sheen, hairline, deep shadow | No |
| Solid | Opaque cards, quiet shadow | No |
| Outlined | Accent border and wider gaps | No |
| Terminal | Monospace font, square corners, hard border | No |
| Waybar | Short header bar with an accent rule | Yes, for the header |
| Neon glow | Accent edge and glow shadow | No |
| Minimal | No border, no shadow | No |
| Matte | Opaque chalky cards, diffuse shadow | No |
| Tiled | Thin accent edge and tile gaps | No |

Nexus-style is an original take on the soft elevated cards people describe that way. It does not copy a third-party theme. Outlined and Tiled are original CSS in the spirit of Hyprland borders and gaps. Waybar is an original header treatment in the spirit of the Waybar status bar; Waybar's source is not included. Terminal is an original monospace treatment.

## Regenerate palettes

Palette JSON is generated from Omarchy `colors.toml` files. The pin lives in `src/data/upstream.ts`.

```bash
npm run generate-palettes
```

That reads the upstream repository at the pinned commit and rewrites `src/data/themes.json`. It does not download wallpaper files. To read a local checkout instead:

```bash
OMARCHY_LOCAL=/path/to/omarchy npm run generate-palettes
```

The local tree must be the same commit as `OMARCHY_COMMIT`, because wallpaper URLs are still built from that pin.

## Share links

The address bar stores the theme, card style, wallpaper file name, opacity, blur, blur strength, and radius. Copy it with **Share preview link**. Uploaded images are not in the URL.

## Credit

Omarchy is MIT licensed. Theme authors are the Omarchy project and the people who designed each palette. The older https://github.com/basecamp/omarchy address redirects to https://github.com/omacom/omarchy.

More dashboards and smart home kits: [topendsmarthomes.com.au](https://www.topendsmarthomes.com.au/?utm_source=omarchy-theme-builder&utm_medium=app&utm_campaign=readme).

## Licence

MIT. See [LICENSE](LICENSE).
