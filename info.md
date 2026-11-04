# Omarchy Themes

Sidebar panel and theme saver by [Top End Smart Homes](https://www.topendsmarthomes.com.au/?utm_source=omarchy-theme-builder&utm_medium=integration&utm_campaign=info).

After a restart, administrators get an **Omarchy Themes** item in the sidebar. Palettes, all ten card styles, and a live preview are in that panel. Wallpapers load from Omarchy’s GitHub repository when you open it. They are not stored in this integration.

**Apply** writes the theme into `config/themes` and the wallpaper into `config/www/omarchy`, reloads themes, and selects that theme for the signed-in user.

## HACS

1. HACS → Integrations → Custom repositories.
2. Add `https://github.com/stevencr00k001/omarchy-theme-builder-ha`. Category: Integration.
3. Download Omarchy Themes.
4. Restart Home Assistant.
5. Settings → Devices & services → Add integration → Omarchy Themes.

## Manual

1. Copy `custom_components/omarchy_themes` to `/config/custom_components/omarchy_themes`.
2. Restart Home Assistant.
3. Settings → Devices & services → Add integration → Omarchy Themes.

Or add `omarchy_themes:` to `configuration.yaml` and restart.

More dashboards and smart home kits: [topendsmarthomes.com.au](https://www.topendsmarthomes.com.au/?utm_source=omarchy-theme-builder&utm_medium=integration&utm_campaign=info).
