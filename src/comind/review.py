from datetime import datetime, timezone

from comind import store
from comind.models import RawCapture


def today(now: datetime | None = None) -> list[RawCapture]:
    """Return captures from today."""
    if now is None:
        now = datetime.now(timezone.utc)
    
    today_date = now.date()
    all_captures = store.fetch_all_captures()
    
    return [c for c in all_captures if c.timestamp.date() == today_date]
