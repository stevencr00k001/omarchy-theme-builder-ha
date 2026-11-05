# Changelog

## 1.1.5
- Fix panel layout at medium widths (e.g. a ~1000–1280px tablet in landscape). Between the `lg` and `xl`
  breakpoints the preview and theme list were `position: sticky` while the controls column sat in a
  second grid row below them, so the controls scrolled up underneath the pinned preview and theme list
  ("a page stuck underneath"). Sticky now applies only in the three-column `xl` layout; at `lg` the
  controls stack under the preview in the second column. Rebuilt the panel.
- Wallpapers that are not PNG, JPEG or WebP (e.g. GIF, AVIF) are re-encoded before upload instead of
  being sent and rejected; an unreadable image now gives a clear error.
- Numeric theme values such as `ha-card-border-width: 1` are accepted; booleans are still rejected.
- Rejection messages now name the offending theme key.
- Each light/dark mode keeps its own background colour when there is no wallpaper.
- A wallpaper that failed to load is left out of the theme, so Apply no longer fails.
- The save service is removed on unload and registered again on reload.
- The save service raises Home Assistant's `Unauthorized` / `ServiceValidationError`.
- The theme is saved on the user once (removed the duplicate `frontend/set_user_data` call), and the
  builder stops polling once it finds Home Assistant.
- Malformed percent-encoded wallpaper URLs are rejected instead of throwing.
- CI: main/PR triggers, read-only permissions, concurrency, lint/typecheck/build steps, a check that the
  committed panel bundle matches the source (fixed Next.js build id), and `ignore: brands` for HACS.

## 1.1.4
- Apply a complete theme and drop the download UI.
