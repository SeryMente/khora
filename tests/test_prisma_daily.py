from datetime import datetime, timezone

import pytest

from comind.prisma import daily


def test_adherence_ratio_cuenta_ventana() -> None:
    ref = datetime(2026, 6, 25, tzinfo=timezone.utc)
    days = {"2026-06-25", "2026-06-24", "2026-06-20"}
    assert daily._adherence_ratio(days, ref, 7) == 3 / 7


def test_resultado_de_hoy_usa_fuentes_reales(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    ref = datetime(2026, 6, 25, tzinfo=timezone.utc)
    monkeypatch.setattr(daily.review, "today", lambda now=None: [1, 2])
    monkeypatch.setattr(daily.usage, "days_with_capture", lambda: {"2026-06-25"})
    res = daily.resultado_de_hoy(ref, window=7)
    assert res.captures == 2
    assert res.day == "2026-06-25"
