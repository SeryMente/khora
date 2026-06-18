from datetime import datetime, timezone

from comind import usage


def test_registra_dias_con_captura(tmp_store):
    d1 = datetime(2026, 6, 13, 9, 0, tzinfo=timezone.utc)
    d2 = datetime(2026, 6, 14, 9, 0, tzinfo=timezone.utc)
    usage.record_capture(now=d1)
    usage.record_capture(now=d1)
    usage.record_capture(now=d2)
    assert usage.days_with_capture() == {"2026-06-13", "2026-06-14"}
