"""Panel registration stays admin-only and points at the bundled frontend."""

from __future__ import annotations

import importlib.util
import json
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
    assert manifest["version"] == "1.1.0"
    assert manifest["codeowners"] == ["@stevencr00k001"]
    assert manifest["documentation"] == "https://github.com/stevencr00k001/omarchy-theme-builder-ha"
    assert manifest["issue_tracker"].endswith("/issues")
    assert manifest["domain"] == "omarchy_themes"
    assert hacs["name"] == "Omarchy Themes"
    assert "custom_components/omarchy_themes" in info
    assert "HACS" in info and "HACS" in readme
    assert "Works with Home Assistant" not in info
    assert "Works with Home Assistant" not in readme
