from __future__ import annotations

import hashlib
import uuid
from datetime import datetime, timezone
from typing import Optional

from khora import store
from khora.models import RawCapture


def _stable_hash(text: str) -> str:
    return hashlib.sha256(text.encode("utf-8")).hexdigest()


def add(text: str, source: str = "cli", timestamp: Optional[datetime] = None) -> RawCapture:
    if timestamp is None:
        timestamp = datetime.now(timezone.utc)
    capture = RawCapture(
        id=uuid.uuid4().hex,
        timestamp=timestamp,
        source=source,
        text=text,
        hash=_stable_hash(text),
    )
    store.save_capture(capture)
    return capture


def get(capture_id: str) -> Optional[RawCapture]:
    return store.fetch_capture(capture_id)
