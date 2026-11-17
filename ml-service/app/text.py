"""Text helpers shared by training and inference (single source of truth)."""
from __future__ import annotations

import re

_WS = re.compile(r"\s+")


def normalize(text: str) -> str:
    return _WS.sub(" ", text or "").strip()


def ticket_text(title: str, description: str) -> str:
    """Title is repeated once so short, information-dense titles carry weight."""
    title, description = normalize(title), normalize(description)
    return f"{title}. {title}. {description}".strip()
