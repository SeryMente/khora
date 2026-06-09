from __future__ import annotations

from comind import store
from comind.models import RawCapture
from datetime import datetime, timezone


def find(query: str) -> list[RawCapture]:
    """Search for captures by text content (case-insensitive)."""
    all_captures = store.fetch_all_captures()
    query_lower = query.lower()
    return [c for c in all_captures if query_lower in c.text.lower()]


def today(now: datetime | None = None) -> list[RawCapture]:
    """Return captures from today."""
    if now is None:
        now = datetime.now(timezone.utc)

    today_date = now.date()
    all_captures = store.fetch_all_captures()

    return [c for c in all_captures if c.timestamp.date() == today_date]