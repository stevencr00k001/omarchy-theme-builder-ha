# Omarchy Themes for Home Assistant

A Home Assistant sidebar panel by [Top End Smart Homes](https://www.topendsmarthomes.com.au/?utm_source=omarchy-theme-builder&utm_medium=integration&utm_campaign=readme). Pick an [Omarchy](https://github.com/omacom/omarchy) palette, preview it on a mock dashboard, and apply it on your hub.

Wallpapers are not stored in this repository. The panel loads them at runtime from Omarchy's public GitHub files, pinned to a commit. Those images remain the work of their authors. The MIT license covers the code in this repository only.

## Install

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

Administrators then get an **Omarchy Themes** item in the sidebar (`mdi:palette`). **Apply** writes the theme into `config/themes`, the wallpaper into `config/www/omarchy`, calls `frontend.reload_themes`, and stores the choice on the signed-in user with `frontend/set_user_data` so it survives a reload. Nothing is sent to Top End Smart Homes.

`configuration.yaml` still needs:

```yaml
frontend:
  themes: !include_dir_merge_named themes
```

Frosted blur, and the Waybar-style header, need [card-mod](https://github.com/thomasloven/lovelace-card-mod) from HACS. The theme file also includes card-mod rules so standard cards and views keep the colours, borders, and wallpaper. Other styles still work from theme variables alone.

## Card styles

Styles combine with any palette. Selecting one sets a starting opacity, blur, and radius; the sliders still override them.

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

Nexus-style is an original take on soft elevated cards. It does not copy a third-party theme. Outlined and Tiled are original CSS in the spirit of Hyprland borders and gaps. Waybar is an original header treatment in the spirit of the Waybar status bar; Waybar's source is not included. Terminal is an original monospace treatment.

## Develop

```bash
npm install
npm test
python3 -m pip install pytest pyyaml voluptuous
python3 -m pytest tests/python -q
npm run build:panel
```

`npm run build:panel` refreshes the sidebar bundle in `custom_components/omarchy_themes/frontend`.

Palette JSON is generated from Omarchy `colors.toml` files. The pin lives in `src/data/upstream.ts`.

```bash
npm run generate-palettes
```

That reads the upstream repository at the pinned commit and rewrites `src/data/themes.json`. It does not download wallpaper files. To read a local checkout instead:

```bash
OMARCHY_LOCAL=/path/to/omarchy npm run generate-palettes
```

The local tree must be the same commit as `OMARCHY_COMMIT`, because wallpaper URLs are still built from that pin.

## Credit

Omarchy is MIT licensed. Theme authors are the Omarchy project and the people who designed each palette. The older https://github.com/basecamp/omarchy address redirects to https://github.com/omacom/omarchy.

More dashboards and smart home kits: [topendsmarthomes.com.au](https://www.topendsmarthomes.com.au/?utm_source=omarchy-theme-builder&utm_medium=integration&utm_campaign=readme).

## Licence

MIT. See [LICENSE](LICENSE).
