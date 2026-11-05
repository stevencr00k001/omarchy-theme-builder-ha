"""Companion integration for the Omarchy Theme Builder.

Administrators get an Omarchy Themes sidebar item that embeds the builder.
The same integration writes a theme file and wallpaper, then reloads themes.
Nothing is sent to Top End Smart Homes.
"""

from __future__ import annotations

import voluptuous as vol

from .const import DOMAIN

CONFIG_SCHEMA = vol.Schema({DOMAIN: vol.Schema({})}, extra=vol.ALLOW_EXTRA)

_COMMANDS = "commands"
_YAML = "yaml"


async def async_setup(hass, config) -> bool:
    """Set up from configuration.yaml, if present."""
    hass.data.setdefault(DOMAIN, {})
    if DOMAIN in config:
        hass.data[DOMAIN][_YAML] = True
        await _async_register(hass)
    return True


async def async_setup_entry(hass, entry) -> bool:
    """Set up from the UI."""
    hass.data.setdefault(DOMAIN, {})
    await _async_register(hass)
    return True


async def async_unload_entry(hass, entry) -> bool:
    """Remove the sidebar panel. YAML setup keeps the panel in place."""
    if not hass.data.get(DOMAIN, {}).get(_YAML):
        from .frontend_panel import async_remove_frontend

        async_remove_frontend(hass)
        from .api import async_unregister

        async_unregister(hass)
        # Let a reload register the service again.
        hass.data[DOMAIN][_COMMANDS] = False
    return True


async def _async_register(hass) -> None:
    if not hass.data[DOMAIN].get(_COMMANDS):
        from .api import async_register

        await async_register(hass)
        hass.data[DOMAIN][_COMMANDS] = True
    from .frontend_panel import async_register_frontend

    await async_register_frontend(hass)
