from typing import Any
from pydantic import BaseModel


class TareaHecha(BaseModel):
    todoist_id: str
    titulo: str
    area: str | None = None
    completada_en: str | None = None


AREA_KEY = "\u00c1rea / Proyecto"


def _text(prop):
    if not prop:
        return ""
    parts = prop.get("title") or prop.get("rich_text") or []
    return "".join(p.get("plain_text", "") for p in parts)


def _estado(prop):
    st = (prop or {}).get("status") or {}
    return st.get("name", "")


def _area(prop):
    sel = (prop or {}).get("select") or {}
    return sel.get("name")


def parse_completadas(payload):
    out = []
    vistos = set()
    for page in (payload or {}).get("results", []):
        props = page.get("properties", {})
        if _estado(props.get("Estado")) != "Hecho":
            continue
        tid = _text(props.get("Todoist ID")).strip()
        if not tid or tid in vistos:
            continue
        vistos.add(tid)
        out.append(
            TareaHecha(
                todoist_id=tid,
                titulo=_text(props.get("Tarea")).strip(),
                area=_area(props.get(AREA_KEY)),
                completada_en=page.get("last_edited_time"),
            )
        )
    return out


def build_query(cursor: str | None = None, area="CoMind", page_size=100) -> dict[str, Any]:
    body: dict[str, Any] = {
        "filter": {
            "and": [
                {"property": "Estado", "status": {"equals": "Hecho"}},
                {"property": "\u00c1rea / Proyecto", "select": {"equals": area}},
            ]
        },
        "sorts": [{"timestamp": "last_edited_time", "direction": "ascending"}],
        "page_size": page_size,
    }
    if cursor:
        body["start_cursor"] = cursor
    return body


def next_cursor(payload):
    if payload.get("has_more"):
        return payload.get("next_cursor")
    return None


def _post(
    path: str,
    body: dict[str, Any],
    token: str,
    timeout: int = 20,
    intentos: int = 4,
) -> dict[str, Any]:
    import json
    import time
    import urllib.error
    import urllib.request

    url = "https://api.notion.com/v1" + path
    data = json.dumps(body).encode("utf-8")
    codes = {429, 500, 502, 503, 504}
    ultimo = ""
    for intento in range(intentos):
        req = urllib.request.Request(url, data=data, method="POST")
        req.add_header("Authorization", "Bearer " + token)
        req.add_header("Notion-Version", "2022-06-28")
        req.add_header("Content-Type", "application/json")
        try:
            with urllib.request.urlopen(req, timeout=timeout) as resp:
                cargado: Any = json.loads(resp.read())
                return cargado
        except urllib.error.HTTPError as e:
            if e.code in codes and intento < intentos - 1:
                time.sleep(2 ** intento)
                ultimo = "HTTP " + str(e.code)
                continue
            raise
        except urllib.error.URLError as e:
            if intento < intentos - 1:
                time.sleep(2 ** intento)
                ultimo = str(e.reason)
                continue
            raise
    raise RuntimeError("sin respuesta: " + ultimo)


def leer_completadas(
    token: str,
    db_id: str,
    area: str = "CoMind",
    transport: Any = None,
    max_paginas: int = 20,
) -> list[TareaHecha]:
    enviar: Any = _post if transport is None else transport
    cursor: str | None = None
    acumulado: list[TareaHecha] = []
    vistos: set[str] = set()
    for _ in range(max_paginas):
        body = build_query(cursor=cursor, area=area)
        payload = enviar("/databases/" + db_id + "/query", body, token)
        for tarea in parse_completadas(payload):
            if tarea.todoist_id not in vistos:
                vistos.add(tarea.todoist_id)
                acumulado.append(tarea)
        cursor = next_cursor(payload)
        if cursor is None:
            break
    return acumulado
