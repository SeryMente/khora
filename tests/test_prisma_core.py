from comind.prisma import DailyResult, determinar_resultado


def test_resultado_combina_senales_reales() -> None:
    res = determinar_resultado("2026-06-25", 3, 0.5)
    assert isinstance(res, DailyResult)
    assert res.captures == 3
    assert res.score == 3.5
    assert "capturas=3" in res.signals


def test_adherencia_se_acota() -> None:
    res = determinar_resultado("2026-06-25", 0, 2.0)
    assert res.adherence_ratio == 1.0
    assert res.score == 1.0
