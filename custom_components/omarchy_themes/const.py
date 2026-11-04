"""Constants for the Omarchy Themes companion integration."""

DOMAIN = "omarchy_themes"
VERSION = "1.1.0"

# Stay under Home Assistant's default 4 MiB websocket message limit after base64.
MAX_YAML_BYTES = 200_000
MAX_IMAGE_BYTES = 2_500_000

THEME_FILENAME = r"^omarchy-[a-z0-9]+(?:-[a-z0-9]+)*\.yaml$"
IMAGE_FILENAME = r"^[a-z0-9][a-z0-9._-]{0,80}\.(?:webp|png|jpe?g)$"
THEME_NAME = r"^[A-Za-z0-9][A-Za-z0-9 _.'-]{0,78}[A-Za-z0-9.]$|^[A-Za-z0-9]$"

TESH_URL = (
    "https://www.topendsmarthomes.com.au/"
    "?utm_source=omarchy-theme-builder&utm_medium=integration&utm_campaign=config-flow"
)
