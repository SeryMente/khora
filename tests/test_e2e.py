from datetime import datetime, timezone
from khora import inbox, search, review

def test_capturar_buscar_repasar(tmp_store):
    ahora = datetime(2026, 6, 12, 9, 0, tzinfo=timezone.utc)
    c = inbox.add("idea: capa ejecutiva sobre PKG", timestamp=ahora)
    assert search.find("ejecutiva")[0].id == c.id
    assert c.id in [x.id for x in review.today(now=ahora)]
