"""Serve the bundled builder and add the admin sidebar item."""

from __future__ import annotations

import logging
from pathlib import Path

from .const import DOMAIN
from .panel_spec import FRONTEND_URL_PATH, STATIC_URL, panel_registration

_LOGGER = logging.getLogger(__name__)
FRONTEND_DIR = Path(__file__).parent / "frontend"
_STATIC_PATHS = "static_paths"


def bundled_frontend_dir() -> Path | None:
    """Return the bundled frontend directory only when it stays inside this integration."""
    package_root = Path(__file__).resolve().parent
    directory = (package_root / "frontend").resolve()
    try:
        directory.relative_to(package_root)
    except ValueError:
        return None
    if directory.name != "frontend" or not (directory / "index.html").is_file():
        return None
    for item in directory.rglob("*"):
        if item.is_symlink() and not item.resolve().is_relative_to(directory):
            return None
    return directory


async def async_register_frontend(hass) -> None:
    """Register static files and the iframe panel when the bundle is present."""
    directory = await hass.async_add_executor_job(bundled_frontend_dir)
    if directory is None:
        _LOGGER.error(
            "Omarchy Themes frontend bundle is missing at %s. The sidebar panel was not added.",
            FRONTEND_DIR,
        )
        return

    state = hass.data.setdefault(DOMAIN, {})
    if not state.get(_STATIC_PATHS):
        from homeassistant.components.http import StaticPathConfig

        await hass.http.async_register_static_paths(
            [StaticPathConfig(STATIC_URL, str(directory), cache_headers=False)]
        )
        state[_STATIC_PATHS] = True

    spec = panel_registration()
    from homeassistant.components import frontend

    frontend.async_register_built_in_panel(
        hass=hass,
        component_name=spec["component_name"],
        sidebar_title=spec["sidebar_title"],
        sidebar_icon=spec["sidebar_icon"],
        frontend_url_path=spec["frontend_url_path"],
        config=spec["config"],
        require_admin=spec["require_admin"],
        update=True,
    )


def async_remove_frontend(hass) -> None:
    """Remove the sidebar panel so a later setup can add it again."""
    from homeassistant.components import frontend

    if frontend.async_panel_exists(hass, FRONTEND_URL_PATH):
        frontend.async_remove_panel(hass, FRONTEND_URL_PATH)
