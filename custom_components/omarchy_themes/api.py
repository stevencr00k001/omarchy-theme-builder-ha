"""Websocket and service handlers. Imported only when the integration is set up."""

from __future__ import annotations

import voluptuous as vol

from homeassistant.components import websocket_api
from homeassistant.core import HomeAssistant, ServiceCall
from homeassistant.helpers import config_validation as cv

from .const import DOMAIN, VERSION
from .validate import ThemeRejected, decode_image, write_theme_files


async def async_register(hass: HomeAssistant) -> None:
    """Register the websocket commands and the save service."""
    websocket_api.async_register_command(hass, ws_status)
    websocket_api.async_register_command(hass, ws_save)
    hass.services.async_register(
        DOMAIN,
        "save_theme",
        _async_save_service,
        schema=vol.Schema(
            {
                vol.Required("filename"): cv.string,
                vol.Required("yaml"): cv.string,
                vol.Optional("image_filename"): cv.string,
                vol.Optional("image_base64"): cv.string,
                vol.Optional("activate", default=False): cv.boolean,
                vol.Optional("set_for_user", default=False): cv.boolean,
                vol.Optional("dark", default=True): cv.boolean,
            }
        ),
    )


@websocket_api.websocket_command({vol.Required("type"): "omarchy_themes/status"})
@websocket_api.require_admin
@websocket_api.async_response
async def ws_status(
    hass: HomeAssistant,
    connection: websocket_api.ActiveConnection,
    msg: dict,
) -> None:
    """Tell the builder the companion is installed."""
    connection.send_result(
        msg["id"],
        {"installed": True, "domain": DOMAIN, "version": VERSION},
    )


@websocket_api.websocket_command(
    {
        vol.Required("type"): "omarchy_themes/save",
        vol.Required("filename"): str,
        vol.Required("yaml"): str,
        vol.Optional("image_filename"): str,
        vol.Optional("image_base64"): str,
        vol.Optional("activate", default=False): bool,
        vol.Optional("set_for_user", default=False): bool,
        vol.Optional("dark", default=True): bool,
    }
)
@websocket_api.require_admin
@websocket_api.async_response
async def ws_save(
    hass: HomeAssistant,
    connection: websocket_api.ActiveConnection,
    msg: dict,
) -> None:
    """Save a theme for an administrator connected over the websocket."""
    try:
        result = await _async_save(
            hass,
            user_id=connection.user.id,
            filename=msg["filename"],
            yaml_text=msg["yaml"],
            image_filename=msg.get("image_filename"),
            image_base64=msg.get("image_base64"),
            activate=bool(msg.get("activate")),
            set_for_user=bool(msg.get("set_for_user")),
            dark=bool(msg.get("dark", True)),
        )
    except ThemeRejected as err:
        connection.send_error(msg["id"], err.code, str(err))
        return
    connection.send_result(msg["id"], result)


async def _async_save_service(call: ServiceCall) -> None:
    user = await call.hass.auth.async_get_user(call.context.user_id) if call.context.user_id else None
    if user is None or not user.is_admin:
        raise vol.Invalid("An administrator must save the theme.")
    try:
        await _async_save(
            call.hass,
            user_id=user.id,
            filename=call.data["filename"],
            yaml_text=call.data["yaml"],
            image_filename=call.data.get("image_filename"),
            image_base64=call.data.get("image_base64"),
            activate=bool(call.data.get("activate")),
            set_for_user=bool(call.data.get("set_for_user")),
            dark=bool(call.data.get("dark", True)),
        )
    except ThemeRejected as err:
        raise vol.Invalid(str(err)) from err


async def _async_save(
    hass: HomeAssistant,
    *,
    user_id: str,
    filename: str,
    yaml_text: str,
    image_filename: str | None,
    image_base64: str | None,
    activate: bool,
    set_for_user: bool,
    dark: bool,
) -> dict:
    image = decode_image(image_base64) if image_base64 else None
    saved = await hass.async_add_executor_job(
        write_theme_files,
        hass.config.path(),
        filename,
        yaml_text,
        image_filename,
        image,
    )
    await hass.services.async_call("frontend", "reload_themes", blocking=True)
    activated = False
    if activate:
        await hass.services.async_call(
            "frontend",
            "set_theme",
            {"name": saved["theme_name"]},
            blocking=True,
        )
        activated = True
    saved["activated"] = activated
    saved["user_theme"] = False
    if set_for_user:
        await _async_set_theme_for_user(hass, user_id, saved["theme_name"], dark)
        saved["user_theme"] = True
    return saved


async def _async_set_theme_for_user(hass: HomeAssistant, user_id: str, theme_name: str, dark: bool) -> None:
    """Store the theme on this connection's user. The caller cannot name another user."""
    from homeassistant.components.frontend.storage import async_user_store

    store = await async_user_store(hass, user_id)
    await store.async_set_item("theme", {"theme": theme_name, "dark": bool(dark)})
