"""Single-step setup so the companion shows in Devices & services."""

from __future__ import annotations

from homeassistant.config_entries import ConfigFlow, ConfigFlowResult

from .const import DOMAIN, TESH_URL


class OmarchyThemesConfigFlow(ConfigFlow, domain=DOMAIN):
    """Confirm adding the companion. There is nothing to configure."""

    VERSION = 1

    async def async_step_user(self, user_input: dict | None = None) -> ConfigFlowResult:
        if self._async_current_entries():
            return self.async_abort(reason="single_instance_allowed")
        if user_input is not None:
            return self.async_create_entry(title="Omarchy Themes", data={})
        return self.async_show_form(
            step_id="user",
            description_placeholders={"more_info_url": TESH_URL},
        )
