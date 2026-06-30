import json
from pathlib import Path

from comind.notion_link import parse_completadas


def _payload():
    p = Path("data/fixtures/notion_completadas.json")
    return json.loads(p.read_text(encoding="utf-8"))


def test_solo_hechas_y_dedupe():
    tareas = parse_completadas(_payload())
    ids = [t.todoist_id for t in tareas]
    assert ids == ["111", "222"]
    assert len(ids) == len(set(ids))


def test_campos_basicos():
    tareas = parse_completadas(_payload())
    primera = tareas[0]
    assert primera.titulo == "Meditar 10 min"
    assert primera.area == "CoMind"
    assert primera.completada_en == "2026-06-25T12:00:00.000Z"


def test_payload_vacio():
    assert parse_completadas({}) == []


def test_build_query_filtra_hecho_y_area():
    from comind.notion_link import build_query

    body = build_query()
    cond = body["filter"]["and"]
    assert {"property": "Estado", "status": {"equals": "Hecho"}} in cond
    assert {"property": "\u00c1rea / Proyecto", "select": {"equals": "CoMind"}} in cond
    assert "start_cursor" not in body


def test_build_query_con_cursor():
    from comind.notion_link import build_query

    assert build_query(cursor="abc")["start_cursor"] == "abc"


def test_next_cursor():
    from comind.notion_link import next_cursor

    assert next_cursor({"has_more": True, "next_cursor": "x"}) == "x"
    assert next_cursor({"has_more": False, "next_cursor": "x"}) is None


def test_leer_completadas_pagina_y_dedupe():
    from comind.notion_link import leer_completadas

    base = _payload()["results"]
    p1 = {"results": base[:2], "has_more": True, "next_cursor": "cur2"}
    p2 = {"results": base[2:], "has_more": False, "next_cursor": None}
    paginas = [p1, p2]
    llamadas = []

    def fake(path, body, token):
        llamadas.append((path, body, token))
        return paginas[len(llamadas) - 1]

    res = leer_completadas("tok", "db", transport=fake)
    assert [t.todoist_id for t in res] == ["111", "222"]
    assert len(llamadas) == 2
    assert llamadas[1][1]["start_cursor"] == "cur2"


def test_leer_completadas_una_pagina():
    from comind.notion_link import leer_completadas

    una = {"results": _payload()["results"], "has_more": False, "next_cursor": None}
    llamadas = []

    def fake(path, body, token):
        llamadas.append(path)
        return una

    res = leer_completadas("tok", "db", transport=fake)
    assert [t.todoist_id for t in res] == ["111", "222"]
    assert len(llamadas) == 1
