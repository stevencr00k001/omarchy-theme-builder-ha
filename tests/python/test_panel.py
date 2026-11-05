"""Panel registration stays admin-only and points at the bundled frontend."""

from __future__ import annotations

import asyncio
import importlib.util
import json
import sys
import types
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
SPEC = ROOT / "custom_components" / "omarchy_themes" / "panel_spec.py"


def load_spec():
    module_spec = importlib.util.spec_from_file_location("omarchy_panel_spec", SPEC)
    module = importlib.util.module_from_spec(module_spec)
    assert module_spec and module_spec.loader
    module_spec.loader.exec_module(module)
    return module


def test_panel_is_an_admin_iframe_named_omarchy_themes() -> None:
    panel = load_spec().panel_registration()
    assert panel["component_name"] == "iframe"
    assert panel["sidebar_title"] == "Omarchy Themes"
    assert panel["sidebar_icon"] == "mdi:palette"
    assert panel["frontend_url_path"] == "omarchy-themes"
    assert panel["require_admin"] is True
    assert panel["config"]["url"] == "/omarchy_themes_static/index.html"


def test_manifest_version_and_hacs_metadata() -> None:
    manifest = json.loads((ROOT / "custom_components" / "omarchy_themes" / "manifest.json").read_text())
    hacs = json.loads((ROOT / "hacs.json").read_text())
    info = (ROOT / "info.md").read_text()
    readme = (ROOT / "README.md").read_text()
    assert manifest["version"] == "1.1.5"
    assert manifest["dependencies"] == ["frontend", "http"]
    assert manifest["codeowners"] == ["@stevencr00k001"]
    assert manifest["documentation"] == "https://github.com/stevencr00k001/omarchy-theme-builder-ha"
    assert manifest["issue_tracker"].endswith("/issues")
    assert manifest["domain"] == "omarchy_themes"
    assert hacs["name"] == "Omarchy Themes"
    assert "custom_components/omarchy_themes" in info
    assert "HACS" in info and "HACS" in readme
    assert "Works with Home Assistant" not in info
    assert "Works with Home Assistant" not in readme
    strings = json.loads(
        (ROOT / "custom_components" / "omarchy_themes" / "strings.json").read_text()
    )
    description = strings["config"]["step"]["user"]["description"]
    assert "{more_info_url}" in description
    assert "http://" not in description and "https://" not in description


class _StaticPathConfig:
    def __init__(self, url_path, path, cache_headers=True):
        self.url_path = url_path
        self.path = path
        self.cache_headers = cache_headers


class _Hass:
    def __init__(self, panels: dict):
        self.data: dict = {}
        self.http = self
        self.panels = panels
        self.static_paths: list[_StaticPathConfig] = []
        self.executor_jobs: list[str] = []

    async def async_add_executor_job(self, func, *args):
        self.executor_jobs.append(func.__name__)
        return func(*args)

    async def async_register_static_paths(self, configs):
        self.static_paths.extend(configs)


def _install_frontend_stub(panels: dict) -> None:
    """Install a frontend stub with the current Home Assistant signature."""

    def async_register_built_in_panel(
        hass,
        component_name,
        sidebar_title=None,
        sidebar_icon=None,
        sidebar_default_visible=True,
        frontend_url_path=None,
        config=None,
        require_admin=False,
        *,
        update=False,
        config_panel_domain=None,
        show_in_sidebar=True,
    ):
        if not isinstance(frontend_url_path, str):
            raise TypeError(
                "cannot use dict as a dict key (unhashable type: dict)"
            )
        if not update and frontend_url_path in panels:
            raise ValueError(f"Overwriting panel {frontend_url_path}")
        panels[frontend_url_path] = {
            "component_name": component_name,
            "sidebar_title": sidebar_title,
            "sidebar_icon": sidebar_icon,
            "sidebar_default_visible": sidebar_default_visible,
            "frontend_url_path": frontend_url_path,
            "config": config,
            "require_admin": require_admin,
            "update": update,
            "config_panel_domain": config_panel_domain,
            "show_in_sidebar": show_in_sidebar,
        }

    def async_remove_panel(hass, frontend_url_path, *, warn_if_unknown=True):
        panels.pop(frontend_url_path, None)

    def async_panel_exists(hass, frontend_url_path):
        return frontend_url_path in panels

    ha = types.ModuleType("homeassistant")
    ha.__path__ = []  # type: ignore[attr-defined]
    components = types.ModuleType("homeassistant.components")
    components.__path__ = []  # type: ignore[attr-defined]
    http = types.ModuleType("homeassistant.components.http")
    frontend = types.ModuleType("homeassistant.components.frontend")
    http.StaticPathConfig = _StaticPathConfig
    frontend.async_register_built_in_panel = async_register_built_in_panel
    frontend.async_remove_panel = async_remove_panel
    frontend.async_panel_exists = async_panel_exists
    ha.components = components
    components.http = http
    components.frontend = frontend
    sys.modules["homeassistant"] = ha
    sys.modules["homeassistant.components"] = components
    sys.modules["homeassistant.components.http"] = http
    sys.modules["homeassistant.components.frontend"] = frontend


def _load_integration():
    sys.path.insert(0, str(ROOT / "custom_components"))
    commands: list[str] = []

    api = types.ModuleType("omarchy_themes.api")

    async def async_register(hass):
        commands.append("commands")

    def async_unregister(hass):
        commands.append("unregister")

    api.async_register = async_register
    api.async_unregister = async_unregister
    sys.modules["omarchy_themes.api"] = api
    import omarchy_themes as integration
    from omarchy_themes import frontend_panel

    return frontend_panel, integration, commands


def test_register_panel_uses_keyword_arguments_and_reload() -> None:
    panels: dict = {}
    _install_frontend_stub(panels)
    _frontend_panel, integration, commands = _load_integration()
    hass = _Hass(panels)

    async def scenario():
        await integration.async_setup_entry(hass, None)
        registered = panels["omarchy-themes"]
        assert registered["component_name"] == "iframe"
        assert registered["sidebar_title"] == "Omarchy Themes"
        assert registered["sidebar_icon"] == "mdi:palette"
        assert registered["frontend_url_path"] == "omarchy-themes"
        assert registered["sidebar_default_visible"] is True
        assert registered["config"] == {"url": "/omarchy_themes_static/index.html"}
        assert registered["require_admin"] is True
        assert registered["update"] is True
        assert commands == ["commands"]
        assert hass.executor_jobs == ["bundled_frontend_dir"]
        assert len(hass.static_paths) == 1
        assert hass.static_paths[0].url_path == "/omarchy_themes_static"
        assert hass.static_paths[0].cache_headers is False
        assert hass.static_paths[0].path.endswith("/frontend")

        assert await integration.async_unload_entry(hass, None) is True
        assert "omarchy-themes" not in panels
        assert commands == ["commands", "unregister"]
        assert hass.data[integration.DOMAIN][integration._COMMANDS] is False

        await integration.async_setup_entry(hass, None)
        assert panels["omarchy-themes"]["frontend_url_path"] == "omarchy-themes"
        assert panels["omarchy-themes"]["require_admin"] is True
        assert panels["omarchy-themes"]["update"] is True
        # A reload registers the save service again.
        assert commands == ["commands", "unregister", "commands"]
        assert len(hass.static_paths) == 1

        hass.data[integration.DOMAIN][integration._YAML] = True
        assert await integration.async_unload_entry(hass, None) is True
        assert panels["omarchy-themes"]["frontend_url_path"] == "omarchy-themes"

    asyncio.run(scenario())
