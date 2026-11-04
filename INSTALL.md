# Install

## Public site

Unzip `omarchy-theme-builder-out.zip`. The site root is the `out/` folder inside it (`index.html` at `out/index.html`). Cloudflare Pages build output directory is `out`. Set `NEXT_PUBLIC_SITE_URL=https://themes.topendsmarthomes.com.au` before building. See `DEPLOY.md` for headers. No `_redirects` file is required.

## Home Assistant sidebar

Unzip `omarchy_themes-integration.zip`.

1. Copy `custom_components/omarchy_themes` to `/config/custom_components/omarchy_themes`. `manifest.json` should sit at `/config/custom_components/omarchy_themes/manifest.json`.
2. Restart Home Assistant.
3. Settings → Devices & services → Add integration → Omarchy Themes.

Administrators then get **Omarchy Themes** in the sidebar (`mdi:palette`). Apply saves the theme for this hub and can select it for the signed-in user only.

HACS: add this repository as a custom repository, category Integration, download Omarchy Themes, restart, then add the integration as above.

Wallpapers are downloaded from Omarchy’s GitHub when the panel opens. They are not in the zip.
