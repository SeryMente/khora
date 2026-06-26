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
