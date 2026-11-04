# Deploy Omarchy Theme Builder

Production site: `https://themes.topendsmarthomes.com.au`

The static site and the companion integration are separate uploads. The site never proxies Home Assistant traffic.

## Cloudflare Pages

Create a Pages project from this repository.

| Setting | Value |
| --- | --- |
| Production branch | `main` |
| Framework preset | Next.js (Static HTML Export) or None |
| Root directory | `/` |
| Build command | `npm run build` |
| Build output directory | `out` |
| Node.js version | `22` |

Environment variables (Production, and Preview if you want correct social cards there too):

| Name | Value |
| --- | --- |
| `NODE_VERSION` | `22` |
| `NEXT_PUBLIC_SITE_URL` | `https://themes.topendsmarthomes.com.au` |

`NEXT_PUBLIC_SITE_URL` is baked in at build time. It sets `metadataBase`, so `og:image` becomes `https://themes.topendsmarthomes.com.au/og.png`. Changing it later requires a new build.

Custom domain: `themes.topendsmarthomes.com.au`. In the Cloudflare DNS zone for `topendsmarthomes.com.au`, leave the CNAME Pages creates. Enable **Always Use HTTPS**.

### Direct upload

`omarchy-theme-builder-out.zip` contains one folder, `out/`. That folder is the publish directory. Upload its contents (so `index.html` is at the site root), or point the project output directory at `out`.

### Headers

`public/_headers` is copied into `out/_headers`. Pages applies it as-is. No `_redirects` file is required.

| Path | Headers |
| --- | --- |
| `/*` | `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `X-Frame-Options: SAMEORIGIN`, `Permissions-Policy: camera=(), microphone=(), geolocation=()`, `Strict-Transport-Security: max-age=31536000; includeSubDomains; preload` |
| `/_next/static/*` | `Cache-Control: public, max-age=31536000, immutable` |
| `/*.html` | `Cache-Control: public, max-age=0, must-revalidate` |
| `/og.png` | `Cache-Control: public, max-age=86400` |
| `/brand/*` | `Cache-Control: public, max-age=86400` |

There is no Content-Security-Policy. Visitors connect to their own Home Assistant (`https` and `wss`) and the page loads Omarchy wallpapers from `raw.githubusercontent.com`. A CSP would have to allow those destinations. Do not add `connect-src 'self'` only.

There is no redirect file. The app is a single page at `/`. Home Assistant sign-in returns to `https://themes.topendsmarthomes.com.au/` with `code` and `state` query parameters. Do not add a pretty-URL rewrite that strips query strings.

Pages serves `out/404.html` for unknown paths. Do not add a SPA fallback that sends every path to `index.html` unless you also preserve the query string. The IndieAuth client id is the site origin with a trailing slash (`https://themes.topendsmarthomes.com.au/`), so the site must stay on that host at the root.

## Companion integration

`omarchy_themes-integration.zip` contains `hacs.json` and `custom_components/omarchy_themes/`. It does not add a sidebar panel.

### HACS

1. HACS → Integrations → Custom repositories.
2. Add this repository, category **Integration**.
3. Download **Omarchy Themes**.
4. Restart Home Assistant.
5. Settings → Devices & services → Add integration → **Omarchy Themes**.

Or, instead of the UI step, add this to `configuration.yaml` and restart:

```yaml
omarchy_themes:
```

### Manual install

1. Unzip `omarchy_themes-integration.zip`.
2. Copy the folder `custom_components/omarchy_themes` to `/config/custom_components/omarchy_themes` on the Home Assistant machine. You should end up with `/config/custom_components/omarchy_themes/manifest.json`.
3. Restart Home Assistant.
4. Settings → Devices & services → Add integration → **Omarchy Themes**.

Only an administrator can push a theme. The builder writes files through this integration, then calls `frontend.reload_themes`. Choosing “Set as the default theme” also calls `frontend.set_theme`. A theme already selected in a user profile still overrides that default.
