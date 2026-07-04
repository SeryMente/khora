from datetime import datetime, timezone, timedelta
from khora import inbox, review

def test_today_filtra_por_fecha(tmp_store):
    ahora = datetime(2026, 6, 9, 10, 0, tzinfo=timezone.utc)
    inbox.add("de hoy", timestamp=ahora)
    inbox.add("de ayer", timestamp=ahora - timedelta(days=1))
    hoy = review.today(now=ahora)
    assert [c.text for c in hoy] == ["de hoy"]
