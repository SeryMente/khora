from __future__ import annotations

from comind import store
from comind.models import RawCapture


def find(query: str) -> list[RawCapture]:
    """Search for captures by text content (case-insensitive)."""
    all_captures = store.fetch_all_captures()
    query_lower = query.lower()
    return [c for c in all_captures if query_lower in c.text.lower()]