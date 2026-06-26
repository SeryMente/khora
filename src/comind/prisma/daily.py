"""Puente Prisma: arma el resultado del dia con datos REALES.

Lee capturas (review.today) y adherencia (usage.days_with_capture)
sobre una ventana. No crea fuentes nuevas de verdad."""

from __future__ import annotations

from datetime import datetime, timedelta, timezone

from comind import review, usage
from comind.prisma.core import DailyResult, determinar_resultado


def _adherence_ratio(days: set[str], ref: datetime, window: int) -> float:
    recent = {
        (ref - timedelta(days=offset)).date().isoformat()
        for offset in range(window)
    }
    hits = len(days & recent)
    return hits / window if window > 0 else 0.0


def resultado_de_hoy(now: datetime | None = None, window: int = 7) -> DailyResult:
    ref = now if now is not None else datetime.now(timezone.utc)
    captures = len(review.today(ref))
    ratio = _adherence_ratio(usage.days_with_capture(), ref, window)
    return determinar_resultado(ref.date().isoformat(), captures, ratio)
