"""Fail-closed configuration helpers for local and Streamlit Cloud execution."""

from __future__ import annotations

import os
from typing import Any

import streamlit as st


def setting(name: str, default: Any = None) -> Any:
    """Read an environment variable first, then Streamlit secrets without leaking values."""
    environment_value = os.environ.get(name)
    if environment_value is not None:
        return environment_value
    try:
        return st.secrets.get(name, default)
    except FileNotFoundError:
        return default


def boolean_setting(name: str, default: bool = False) -> bool:
    value = setting(name, default)
    if isinstance(value, bool):
        return value
    return str(value).strip().lower() in {"1", "true", "yes", "on"}
