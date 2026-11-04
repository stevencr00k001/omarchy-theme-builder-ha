# Security

Report a vulnerability privately to the repository owner. Do not open a public issue for an unfixed security bug.

This project does not take payments and does not run a server for theme uploads. The public site talks only to the visitor's own Home Assistant and to the pinned Omarchy wallpaper files.

## What we expect

- The `omarchy_themes/save` command is administrator-only.
- Theme files are rewritten with `yaml.safe_dump` and an allow-list of keys.
- Wallpaper writes accept JPEG, PNG, and WebP only, checked by magic bytes, with a size cap.
- Paths cannot leave `config/themes` or `config/www/omarchy`.
- The sidebar panel is administrator-only.
- A remembered access token stays in this browser's local storage and is sent only to the Home Assistant URL the visitor entered.
