"""Serve the bundled builder and add the admin sidebar item."""

from __future__ import annotations

import logging
from pathlib import Path

from .panel_spec import STATIC_URL, panel_registration

_LOGGER = logging.getLogger(__name__)
FRONTEND_DIR = Path(__file__).parent / "frontend"


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
    directory = bundled_frontend_dir()
    if directory is None:
        _LOGGER.error(
            "Omarchy Themes frontend bundle is missing at %s. The sidebar panel was not added.",
            FRONTEND_DIR,
        )
        return

    await _async_register_static(hass, STATIC_URL, str(directory))
    spec = panel_registration()
    from homeassistant.components import frontend

    frontend.async_register_built_in_panel(
        hass,
        spec["component_name"],
        spec["sidebar_title"],
        spec["sidebar_icon"],
        spec["frontend_url_path"],
        spec["config"],
        spec["require_admin"],
    )


async def _async_register_static(hass, url_path: str, directory: str) -> None:
    try:
        from homeassistant.components.http import StaticPathConfig

        await hass.http.async_register_static_paths(
            [StaticPathConfig(url_path, directory, False)]
        )
    except ImportError:
        hass.http.register_static_path(url_path, directory, False)
