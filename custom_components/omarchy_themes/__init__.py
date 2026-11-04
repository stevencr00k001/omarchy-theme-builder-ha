"""Companion integration for the Omarchy Theme Builder.

Administrators get an Omarchy Themes sidebar item that embeds the builder.
The same integration writes a theme file and wallpaper, then reloads themes.
Nothing is sent to Top End Smart Homes.
"""

from __future__ import annotations

import voluptuous as vol

from .const import DOMAIN

CONFIG_SCHEMA = vol.Schema({DOMAIN: vol.Schema({})}, extra=vol.ALLOW_EXTRA)

_REGISTERED = "registered"


async def async_setup(hass, config) -> bool:
    """Set up from configuration.yaml, if present."""
    hass.data.setdefault(DOMAIN, {})
    if DOMAIN in config:
        await _async_register(hass)
    return True


async def async_setup_entry(hass, entry) -> bool:
    """Set up from the UI."""
    hass.data.setdefault(DOMAIN, {})
    await _async_register(hass)
    return True


async def async_unload_entry(hass, entry) -> bool:
    """Unload a config entry. Commands stay available if YAML also set them up."""
    return True


async def _async_register(hass) -> None:
    if hass.data[DOMAIN].get(_REGISTERED):
        return
    hass.data[DOMAIN][_REGISTERED] = True
    from .api import async_register

    await async_register(hass)
