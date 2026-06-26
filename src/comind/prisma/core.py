"""Prisma: determina el resultado diario con criterio auditable.

Recibe metricas reales (capturas, adherencia) de usage/review.
No inventa datos ni autoelogia."""

from __future__ import annotations

from pydantic import BaseModel, Field


class DailyResult(BaseModel):
    day: str
    captures: int = Field(ge=0)
    adherence_ratio: float = Field(ge=0.0, le=1.0)
    score: float = Field(ge=0.0)
    signals: list[str]


def determinar_resultado(
    day: str,
    captures: int,
    adherence_ratio: float,
) -> DailyResult:
    ratio = max(0.0, min(1.0, adherence_ratio))
    score = float(captures) + ratio
    signals = [f"capturas={captures}", f"adherencia={ratio:.3f}"]
    return DailyResult(
        day=day,
        captures=captures,
        adherence_ratio=ratio,
        score=score,
        signals=signals,
    )
