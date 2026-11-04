"""Validate theme files before they are written under /config.

This module does not import Home Assistant so it can be tested on its own.
"""

from __future__ import annotations

import base64
import os
import re
from pathlib import Path

import yaml

from .const import IMAGE_FILENAME, MAX_IMAGE_BYTES, MAX_YAML_BYTES, THEME_FILENAME, THEME_NAME

_THEME_FILENAME = re.compile(THEME_FILENAME)
_IMAGE_FILENAME = re.compile(IMAGE_FILENAME)
_THEME_NAME = re.compile(THEME_NAME)
_UNSAFE_VALUE = re.compile(r"url\s*\(|@import|expression\s*\(|javascript:|<|>|\x00", re.I)
_HEX_COLOR = re.compile(r"^#[0-9a-fA-F]{6}$")

ALLOWED_THEME_KEYS = frozenset(
    {
        "primary-color",
        "accent-color",
        "primary-background-color",
        "secondary-background-color",
        "card-background-color",
        "ha-card-background",
        "ha-card-border-radius",
        "ha-card-border-width",
        "ha-card-border-color",
        "ha-card-box-shadow",
        "primary-text-color",
        "secondary-text-color",
        "text-primary-color",
        "disabled-text-color",
        "divider-color",
        "app-header-background-color",
        "app-header-text-color",
        "app-header-selection-bar-color",
        "sidebar-background-color",
        "sidebar-text-color",
        "sidebar-icon-color",
        "sidebar-selected-text-color",
        "sidebar-selected-icon-color",
        "sidebar-selected-background-color",
        "error-color",
        "warning-color",
        "success-color",
        "info-color",
        "state-icon-color",
        "state-icon-active-color",
        "state-on-color",
        "switch-checked-color",
        "switch-checked-button-color",
        "switch-unchecked-color",
        "slider-color",
        "slider-track-color",
        "masonry-view-card-margin",
        "ha-view-sections-column-gap",
        "ha-view-sections-row-gap",
        "lovelace-background",
        "primary-font-family",
        "ha-font-family-body",
        "ha-font-family-heading",
        "ha-font-family-code",
        "paper-font-common-base_-_font-family",
        "card-mod-theme",
        "card-mod-card",
        "card-mod-root",
    }
)
_CSS_KEYS = frozenset({"card-mod-card", "card-mod-root"})


class ThemeRejected(Exception):
    """The payload is not safe to write."""

    def __init__(self, code: str, message: str) -> None:
        self.code = code
        super().__init__(message)


def validate_theme_filename(filename: str) -> str:
    """Return a single safe theme filename, or reject it."""
    name = _plain_filename(filename, "invalid_filename")
    if not _THEME_FILENAME.fullmatch(name):
        raise ThemeRejected(
            "invalid_filename",
            "Theme filename must look like omarchy-nord-frosted.yaml.",
        )
    return name


def validate_image_filename(filename: str) -> str:
    """Return a single safe wallpaper filename, or reject it."""
    name = _plain_filename(filename, "invalid_image")
    if not _IMAGE_FILENAME.fullmatch(name):
        raise ThemeRejected(
            "invalid_image",
            "Wallpaper filename must be a single image name such as nord-city.webp.",
        )
    return name


def _plain_filename(filename: str, code: str) -> str:
    if not isinstance(filename, str) or not filename or filename != filename.strip():
        raise ThemeRejected(code, "Filename is missing.")
    if "\x00" in filename or "/" in filename or "\\" in filename or ".." in filename:
        raise ThemeRejected(code, "Filename cannot include a path.")
    if filename.startswith("."):
        raise ThemeRejected(code, "Filename cannot be hidden.")
    return filename


def resolve_inside(root: Path, filename: str) -> Path:
    """Resolve one file name inside root and reject escapes and symlinks."""
    if filename != Path(filename).name:
        raise ThemeRejected("path_rejected", "That path is outside the config folder.")
    root_resolved = root.resolve(strict=False)
    candidate = root_resolved / filename
    if candidate.is_symlink():
        raise ThemeRejected("path_rejected", "Refusing to write through a symlink.")
    candidate_resolved = candidate.resolve(strict=False)
    try:
        candidate_resolved.relative_to(root_resolved)
    except ValueError as err:
        raise ThemeRejected("path_rejected", "That path is outside the config folder.") from err
    if candidate_resolved.parent != root_resolved:
        raise ThemeRejected("path_rejected", "That path is outside the config folder.")
    return candidate_resolved


def decode_image(payload: str) -> bytes:
    """Decode a base64 image and enforce the size cap."""
    if not isinstance(payload, str) or not payload.strip():
        raise ThemeRejected("invalid_image", "Wallpaper data is missing.")
    raw = payload.strip()
    if raw.startswith("data:"):
        raw = raw.split(",", 1)[-1]
    try:
        data = base64.b64decode(raw, validate=True)
    except Exception as err:
        raise ThemeRejected("invalid_image", "Wallpaper data is not valid base64.") from err
    if len(data) > MAX_IMAGE_BYTES:
        raise ThemeRejected(
            "too_large",
            "Wallpaper is too large to push. Download the zip instead, or use a smaller image.",
        )
    if not data:
        raise ThemeRejected("invalid_image", "Wallpaper data is empty.")
    return data


def sniff_image(data: bytes) -> str | None:
    """Return png, jpeg, or webp from magic bytes. SVG and other types are rejected."""
    if data.startswith(b"\x89PNG\r\n\x1a\n"):
        return "png"
    if data.startswith(b"\xff\xd8\xff"):
        return "jpeg"
    if len(data) >= 12 and data[:4] == b"RIFF" and data[8:12] == b"WEBP":
        return "webp"
    return None


def validate_image_bytes(data: bytes, filename: str) -> str:
    """Confirm the bytes are a JPEG, PNG, or WebP matching the filename."""
    kind = sniff_image(data)
    if kind is None:
        raise ThemeRejected("invalid_image", "Wallpaper must be a JPEG, PNG, or WebP image.")
    extension = filename.rsplit(".", 1)[-1].lower()
    expected = {"png": "png", "jpg": "jpeg", "jpeg": "jpeg", "webp": "webp"}.get(extension)
    if expected is None or kind != expected:
        raise ThemeRejected("invalid_image", "Wallpaper contents do not match the filename.")
    return kind


def validate_theme_yaml(text: str, image_filename: str | None) -> tuple[str, str]:
    """Parse theme YAML and return the theme name plus a safe_dump of allowed keys."""
    if not isinstance(text, str) or not text.strip():
        raise ThemeRejected("invalid_yaml", "Theme YAML is empty.")
    encoded = text.encode("utf-8")
    if len(encoded) > MAX_YAML_BYTES:
        raise ThemeRejected("too_large", "Theme YAML is too large.")
    try:
        parsed = yaml.safe_load(text)
    except yaml.YAMLError as err:
        raise ThemeRejected("invalid_yaml", "Theme YAML could not be parsed.") from err
    if not isinstance(parsed, dict) or not parsed:
        raise ThemeRejected("invalid_yaml", "Theme YAML must contain one theme.")
    if len(parsed) != 1:
        raise ThemeRejected("invalid_yaml", "Theme YAML must contain exactly one theme.")
    name, body = next(iter(parsed.items()))
    if not isinstance(name, str) or not _THEME_NAME.fullmatch(name):
        raise ThemeRejected("invalid_yaml", "Theme name contains characters that are not allowed.")
    if not isinstance(body, dict) or not body:
        raise ThemeRejected("invalid_yaml", "Theme variables must be a mapping.")
    cleaned: dict[str, str] = {}
    for key, value in body.items():
        if key not in ALLOWED_THEME_KEYS:
            raise ThemeRejected("invalid_yaml", "A theme variable is not allowed.")
        if key == "lovelace-background":
            continue
        cleaned[key] = _clean_value(key, value)
    if image_filename:
        cleaned["lovelace-background"] = (
            f'center / cover no-repeat fixed url("/local/omarchy/{image_filename}")'
        )
    elif "lovelace-background" in body:
        background = body["lovelace-background"]
        if not isinstance(background, str) or not _HEX_COLOR.fullmatch(background):
            raise ThemeRejected("invalid_yaml", "Without a wallpaper, the background must be a hex colour.")
        cleaned["lovelace-background"] = background.lower()
    dumped = yaml.safe_dump({name: cleaned}, sort_keys=False, allow_unicode=False)
    if "!!" in dumped:
        raise ThemeRejected("invalid_yaml", "Theme YAML could not be written safely.")
    return name, dumped


def _clean_value(key: str, value: object) -> str:
    if not isinstance(value, str) or not value or "\x00" in value:
        raise ThemeRejected("invalid_yaml", "Theme variables must be plain text.")
    limit = 8000 if key in _CSS_KEYS else 2000
    if len(value) > limit or _UNSAFE_VALUE.search(value):
        raise ThemeRejected("invalid_yaml", "A theme variable contains text that is not allowed.")
    if key not in _CSS_KEYS and "\n" in value:
        raise ThemeRejected("invalid_yaml", "A theme variable contains text that is not allowed.")
    return value


def write_theme_files(
    config_dir: Path,
    filename: str,
    yaml_text: str,
    image_filename: str | None,
    image: bytes | None,
) -> dict[str, str]:
    """Validate and write the theme, and the wallpaper when one was sent."""
    safe_theme = validate_theme_filename(filename)
    safe_image = validate_image_filename(image_filename) if image_filename else None
    if (safe_image is None) != (image is None):
        raise ThemeRejected("invalid_image", "Send the wallpaper filename and its bytes together.")
    if image is not None and safe_image is not None:
        validate_image_bytes(image, safe_image)
    theme_name, dumped = validate_theme_yaml(yaml_text, safe_image)

    themes_dir = Path(config_dir) / "themes"
    theme_path = resolve_inside(themes_dir, safe_theme)
    themes_dir.mkdir(parents=True, exist_ok=True)
    _replace_text(theme_path, dumped)

    saved_image = ""
    if image is not None and safe_image is not None:
        image_dir = Path(config_dir) / "www" / "omarchy"
        image_path = resolve_inside(image_dir, safe_image)
        image_dir.mkdir(parents=True, exist_ok=True)
        _replace_bytes(image_path, image)
        saved_image = safe_image

    return {"theme_name": theme_name, "filename": safe_theme, "image_filename": saved_image}


def _replace_text(path: Path, text: str) -> None:
    temporary = path.with_name(path.name + ".tmp")
    temporary.write_text(text, encoding="utf-8")
    os.replace(temporary, path)


def _replace_bytes(path: Path, data: bytes) -> None:
    temporary = path.with_name(path.name + ".tmp")
    temporary.write_bytes(data)
    os.replace(temporary, path)
