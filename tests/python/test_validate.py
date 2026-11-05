"""Tests for the companion integration's file checks. No Home Assistant install required."""

from __future__ import annotations

import base64
import sys
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "custom_components"))

from omarchy_themes.validate import (  # noqa: E402
    ThemeRejected,
    decode_image,
    resolve_inside,
    validate_image_bytes,
    validate_image_filename,
    validate_theme_filename,
    validate_theme_yaml,
    write_theme_files,
)

PNG = b"\x89PNG\r\n\x1a\n" + b"\x00" * 24
JPEG = b"\xff\xd8\xff" + b"\x00" * 24


def theme_yaml(image: str | None = "nord--city.webp") -> str:
    background = ""
    if image:
        background = (
            '  lovelace-background: "center / cover no-repeat fixed url(\\"/local/omarchy/'
            + image
            + '\\")"\n'
        )
    return (
        '"Omarchy Nord - Frosted glass":\n'
        '  primary-color: "#81a1c1"\n'
        + background
    )


def test_filenames_accept_builder_names_and_reject_paths() -> None:
    assert validate_theme_filename("omarchy-nord-frosted.yaml") == "omarchy-nord-frosted.yaml"
    assert validate_image_filename("nord--1-city-view.webp") == "nord--1-city-view.webp"
    for bad in ("../omarchy-nord.yaml", "/tmp/omarchy-nord.yaml", "omarchy-nord.yaml/../x.yaml", "themes/omarchy-nord.yaml", "omarchy-Nord.yaml"):
        with pytest.raises(ThemeRejected):
            validate_theme_filename(bad)
    for bad in ("../x.png", "a..png", "photo.bmp", "folder/photo.png", ".hidden.png"):
        with pytest.raises(ThemeRejected):
            validate_image_filename(bad)


def test_resolve_inside_stays_in_the_directory(tmp_path: Path) -> None:
    root = tmp_path / "themes"
    root.mkdir()
    path = resolve_inside(root, "omarchy-nord-frosted.yaml")
    assert path.parent == root.resolve()
    with pytest.raises(ThemeRejected) as caught:
        resolve_inside(root, "../secrets.yaml")
    assert caught.value.code == "path_rejected"


def test_image_magic_must_match_the_extension() -> None:
    assert validate_image_bytes(PNG, "wall.png") == "png"
    assert validate_image_bytes(JPEG, "wall.jpg") == "jpeg"
    with pytest.raises(ThemeRejected) as caught:
        validate_image_bytes(JPEG, "wall.png")
    assert caught.value.code == "invalid_image"
    with pytest.raises(ThemeRejected):
        validate_image_bytes(b"not an image", "wall.png")


def test_decode_rejects_garbage_and_oversize_payloads() -> None:
    encoded = base64.b64encode(PNG).decode()
    assert decode_image(encoded).startswith(b"\x89PNG")
    with pytest.raises(ThemeRejected):
        decode_image("!!!!")
    huge = base64.b64encode(b"\x89PNG\r\n\x1a\n" + b"0" * 3_000_000).decode()
    with pytest.raises(ThemeRejected) as caught:
        decode_image(huge)
    assert caught.value.code == "too_large"


def test_yaml_requires_one_theme_and_the_saved_wallpaper() -> None:
    name, dumped = validate_theme_yaml(theme_yaml(), "nord--city.webp")
    assert name == "Omarchy Nord - Frosted glass"
    assert "primary-color" in dumped
    assert "/local/omarchy/nord--city.webp" in dumped
    assert "!!" not in dumped
    _name, forced = validate_theme_yaml(theme_yaml("other.webp"), "nord--city.webp")
    assert "/local/omarchy/nord--city.webp" in forced
    assert "other.webp" not in forced
    with pytest.raises(ThemeRejected):
        validate_theme_yaml('!!python/object/apply:os.system ["echo"]\n', None)
    with pytest.raises(ThemeRejected):
        validate_theme_yaml("one: {a: 1}\ntwo: {a: 2}\n", None)


def test_write_theme_files_creates_only_the_expected_paths(tmp_path: Path) -> None:
    saved = write_theme_files(
        tmp_path,
        "omarchy-nord-frosted.yaml",
        theme_yaml(),
        "nord--city.webp",
        _webp(),
    )
    assert saved["theme_name"] == "Omarchy Nord - Frosted glass"
    assert (tmp_path / "themes" / "omarchy-nord-frosted.yaml").is_file()
    assert (tmp_path / "www" / "omarchy" / "nord--city.webp").is_file()
    assert not (tmp_path / "secrets.yaml").exists()


def test_modes_and_card_variables_survive_validation() -> None:
    raw = theme_yaml() + (
        '  ha-card-background: "rgba(59, 66, 82, 0.58)"\n'
        '  ha-panel-background: "#2e3440"\n'
        '  tile-color: "#81a1c1"\n'
        '  mush-rgb-blue: "129, 161, 193"\n'
        "  modes:\n"
        "    light:\n"
        '      primary-background-color: "#eceff4"\n'
        '      primary-text-color: "#2e3440"\n'
        "    dark:\n"
        '      primary-background-color: "#2e3440"\n'
        '      primary-text-color: "#d8dee9"\n'
    )
    _name, dumped = validate_theme_yaml(raw, "nord--city.webp")
    assert "modes:" in dumped
    assert "ha-card-background" in dumped
    assert "tile-color" in dumped
    assert "mush-rgb-blue" in dumped
    assert dumped.count("/local/omarchy/nord--city.webp") >= 3


def test_rejects_unknown_keys_and_non_images() -> None:
    bad = theme_yaml() + '  shell: "rm -rf /"\n'
    with pytest.raises(ThemeRejected):
        validate_theme_yaml(bad, "nord--city.webp")
    with pytest.raises(ThemeRejected):
        validate_image_bytes(b"GIF89a" + b"\x00" * 8, "wall.gif")
    with pytest.raises(ThemeRejected):
        validate_image_filename("icon.svg")
    with pytest.raises(ThemeRejected):
        validate_image_bytes(b"<svg xmlns='http://www.w3.org/2000/svg'/>", "icon.png")


def test_write_rejects_a_path_escape(tmp_path: Path) -> None:
    with pytest.raises(ThemeRejected):
        write_theme_files(tmp_path, "../omarchy-nord.yaml", theme_yaml(None), None, None)


def _webp() -> bytes:
    return b"RIFF" + b"\x00\x00\x00\x00" + b"WEBP" + b"\x00" * 8


def _body(lines: str) -> str:
    return '"Omarchy Nord - Frosted glass":\n  primary-color: "#81a1c1"\n  lovelace-background: "#2e3440"\n' + lines


def test_numeric_values_are_kept_as_text() -> None:
    _, dumped = validate_theme_yaml(_body("  ha-card-border-width: 1\n  ha-card-border-radius: 12.5\n"), None)
    assert "ha-card-border-width: '1'" in dumped
    assert "ha-card-border-radius: '12.5'" in dumped


def test_boolean_values_are_rejected() -> None:
    with pytest.raises(ThemeRejected):
        validate_theme_yaml(_body("  ha-card-border-width: yes\n"), None)


@pytest.mark.parametrize(
    ("line", "key"),
    [
        ('  shell: "rm -rf /"\n', "shell"),
        ('  primary-color: "url(http://x)"\n', "primary-color"),  # overrides the earlier value
        ('  ha-card-background: "a\\nb"\n', "ha-card-background"),
    ],
)
def test_rejection_names_the_key(line: str, key: str) -> None:
    with pytest.raises(ThemeRejected) as err:
        validate_theme_yaml(_body(line), None)
    assert f'"{key}"' in str(err.value)


def _modes(light_bg: str) -> str:
    return (
        "  modes:\n"
        "    light:\n"
        '      primary-color: "#5e81ac"\n'
        f'      lovelace-background: "{light_bg}"\n'
        "    dark:\n"
        '      primary-color: "#81a1c1"\n'
        '      lovelace-background: "#2e3440"\n'
    )


def test_modes_keep_their_own_background_without_a_wallpaper() -> None:
    import yaml

    _, dumped = validate_theme_yaml(_body(_modes("#eceff4")), None)
    theme = next(iter(yaml.safe_load(dumped).values()))
    assert theme["lovelace-background"] == "#2e3440"
    assert theme["modes"]["light"]["lovelace-background"] == "#eceff4"
    assert theme["modes"]["light"]["ha-panel-background"] == "#eceff4"
    assert theme["modes"]["dark"]["lovelace-background"] == "#2e3440"


def test_modes_share_the_wallpaper_surface() -> None:
    import yaml

    _, dumped = validate_theme_yaml(_body(_modes("#eceff4")), "nord--city.webp")
    theme = next(iter(yaml.safe_load(dumped).values()))
    for mode in ("light", "dark"):
        assert "url(" in theme["modes"][mode]["lovelace-background"]
        assert theme["modes"][mode]["ha-panel-background"] == theme["lovelace-background"]
