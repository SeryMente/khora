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
