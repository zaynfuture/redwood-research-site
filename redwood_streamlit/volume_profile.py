"""Assemble the self-contained Redwood volume profile viewer."""

from __future__ import annotations

import json
from pathlib import Path
import re


_ASSETS = Path(__file__).resolve().parents[1] / "assets" / "volume-profile"
_SCRIPTS = ("model.js", "chart.js", "app.js")
_LOCALES = {"en": "en", "zh": "zh-CN", "zh-CN": "zh-CN", "zh-TW": "zh-TW"}


def _embedded_json(value: object) -> str:
    """Encode values in a nonexecutable script data block, including raw HTML delimiters."""
    return (
        json.dumps(value, ensure_ascii=True, allow_nan=False, separators=(",", ":"))
        .replace("<", "\\u003c")
        .replace(">", "\\u003e")
        .replace("&", "\\u0026")
    )


def build_volume_profile_html(initial: object | None = None, *, language: str = "zh") -> str:
    """Render a complete HTML document; the hosted route always uses the checked-in demo."""
    template = (_ASSETS / "index.html").read_text(encoding="utf-8")
    css = (_ASSETS / "style.css").read_text(encoding="utf-8")
    css += "\n" + (_ASSETS / "site-header.css").read_text(encoding="utf-8")
    scripts = "\n".join(
        "<script>\n" + (_ASSETS / filename).read_text(encoding="utf-8") + "\n</script>"
        for filename in _SCRIPTS
    )
    if initial is None:
        initial = json.loads((_ASSETS / "demo.json").read_text(encoding="utf-8"))
    directory = json.loads((_ASSETS / "symbols.json").read_text(encoding="utf-8"))

    slots = {
        "<!-- PROFILE_STYLE -->": "<style>\n" + css + "\n</style>",
        "<!-- PROFILE_INITIAL -->": (
            '<script id="profile-initial" type="application/json">'
            + _embedded_json(initial) + "</script>"
        ),
        "<!-- SYMBOL_DIRECTORY -->": (
            '<script id="symbol-directory" type="application/json">'
            + _embedded_json(directory) + "</script>"
        ),
        "<!-- PROFILE_SCRIPTS -->": scripts,
    }
    if any(template.count(slot) != 1 for slot in slots):
        raise ValueError("Invalid volume profile viewer template")
    locale = _LOCALES.get(language, "en")
    template = re.sub(r'(<html\b[^>]*?\blang=")[^"]*(")', rf"\g<1>{locale}\2", template, count=1)
    return re.sub("|".join(re.escape(marker) for marker in slots), lambda match: slots[match[0]], template)
