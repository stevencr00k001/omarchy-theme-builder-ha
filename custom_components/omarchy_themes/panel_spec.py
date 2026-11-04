"""Sidebar panel description. No Home Assistant imports, so tests can load it."""

SIDEBAR_TITLE = "Omarchy Themes"
SIDEBAR_ICON = "mdi:palette"
FRONTEND_URL_PATH = "omarchy-themes"
STATIC_URL = "/omarchy_themes_static"
COMPONENT_NAME = "iframe"


def panel_registration() -> dict:
    """Arguments for frontend.async_register_built_in_panel, admin only."""
    return {
        "component_name": COMPONENT_NAME,
        "sidebar_title": SIDEBAR_TITLE,
        "sidebar_icon": SIDEBAR_ICON,
        "frontend_url_path": FRONTEND_URL_PATH,
        "config": {"url": f"{STATIC_URL}/index.html"},
        "require_admin": True,
    }
