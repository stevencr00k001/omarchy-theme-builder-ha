# Install on Home Assistant

Omarchy Themes is installed as a custom integration. It is not a separately hosted site.

1. Add this GitHub repository in HACS as a custom integration, or copy `custom_components/omarchy_themes` to `/config/custom_components/omarchy_themes`.
2. Restart Home Assistant.
3. Add the Omarchy Themes integration.
4. Open **Omarchy Themes** in the sidebar and press **Apply**.

Apply writes `config/themes`, reloads themes, and saves the choice for the signed-in user.

Rebuild the sidebar bundle after UI changes with `npm run build:panel`.

More dashboards and smart home kits: [topendsmarthomes.com.au](https://www.topendsmarthomes.com.au/?utm_source=omarchy-theme-builder&utm_medium=integration&utm_campaign=deploy).
