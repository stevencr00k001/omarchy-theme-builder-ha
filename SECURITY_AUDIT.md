# Security audit

Date: 2026-11-04. Scope: full git history of this working tree, current source, production `out/`, the bundled panel, and the previous store zips. Nothing was published and nothing was pushed.

## Scan

- gitleaks 8.24.2 scanned all 5 commits. Result: no leaks.
- A separate pass over every text blob in history looked for emails, phone numbers, business numbers, private IPv4 ranges, Nabu Casa hosts, token assignments, home-directory paths, and live payment-key shapes.
- No `.map` source maps are in the tree or the production build (`productionBrowserSourceMaps` is off).
- No emails, phone numbers, street addresses, or business numbers are in the source.

The only history hit worth removing from a public clone was a unit test that used a private LAN address as a fake hub. That string is gone from the current tree, including this note. Package version numbers matched a loose private-IP pattern and are not addresses. Minified framework code contained digit runs that are not phone numbers.

The development history still contains that old test string. The public bundle is therefore a clean tree with no `.git` directory, not a copy of this history.

## Fixes

- `omarchy_themes/save` stays administrator-only. `require_admin` wraps the handler. The service rejects non-admins.
- Theme filenames stay on `omarchy-<slug>.yaml`. Wallpaper names cannot contain a path. Writes refuse symlinks and any path that resolves outside `config/themes` or `config/www/omarchy`.
- Wallpapers are JPEG, PNG, or WebP only, checked by magic bytes, capped at 2.5 MB. SVG, GIF, and AVIF are rejected.
- Theme YAML is parsed with `safe_load`, restricted to an allow-list of keys, stripped of `url(`, imports, and markup, then rewritten with `safe_dump`. The saved wallpaper path is set by the integration, not taken from an arbitrary URL in the file.
- There is no shell and no `eval`.
- The sidebar panel is the built-in iframe panel, `require_admin` true, icon `mdi:palette`. Static files are only the bundled `frontend/` directory inside this integration.
- “Use this theme for me only” sets `frontend` user data for `connection.user.id`. The message cannot name another user. It does not call `frontend.set_theme`.
- Share links accept only a theme slug, a known card style, and a wallpaper filename. Anything else is ignored.
- Wallpaper fetches are allowed only for `https://raw.githubusercontent.com/omacom/omarchy/<pinned commit>/themes/<id>/backgrounds/<image>`.
- A long-lived token is kept in memory. Local storage is used only when “Remember on this browser” is on. Token requests go only to the hub URL the visitor entered.
- External links use `rel="noopener noreferrer"`. There is no analytics script.
- The standalone `_headers` file sets `script-src 'self'` plus hashes of Next’s inline boot scripts, `frame-ancestors 'none'`, and `object-src 'none'`. `connect-src` also allows `https:` and `wss:` so a visitor can reach their own hub. `style-src` allows inline styles because the preview sets colours in element style attributes. The panel bundle does not include `_headers`, so Home Assistant can still frame it.
- Direct dependencies are pinned. PostCSS is 8.5.32. Vitest is 4.1.12. `npm audit` reports no high or critical issues (18 remaining are low or moderate, in dev tooling). Python test dependencies are pinned in `requirements-dev.txt`. `pip-audit` could not be installed here because this image has no `python3-venv`.
- HACS metadata: `hacs.json`, manifest version `1.1.0`, `issue_tracker`, code owner `@stevencr00k001`, documentation `https://github.com/stevencr00k001/omarchy-theme-builder-ha`, `info.md`, and a GitHub Actions workflow for tests, hassfest, and HACS validation.

## Tests after the fixes

- Vitest: 40 passed.
- pytest: 10 passed.
- `npm run lint` and `tsc --noEmit` passed.
- hassfest and the HACS action were not executed here. They run in GitHub Actions after the repository exists.
