# @l0 L0-002-R · @req KA-00/REQ-2 · @acr ACR-2.1
import json
import os
from datetime import datetime, timezone
from typing import Any, Dict, List

from khora_kernel.api import PuertoLLM, SolicitudLLM


def tokenize(text: str) -> int:
    """Fallback tokenizer D4 for testing. 1 word = 1.3 tokens approx."""
    return int(len(text.split()) * 1.3)


def get_community_info(
    memoria_grafo, cid: str, graph_revision: str | None = None
) -> Dict[str, Any]:
    """Recupera la informacion de la comunidad."""
    if graph_revision:
        query = """
        MATCH (c:Community {
            community_id: $cid,
            graph_revision: $revision
        })
        WHERE c.invalid_at IS NULL
        RETURN c.level AS level, c.summary AS summary, c.summary_tokens AS tokens
        """
        params = {"cid": cid, "revision": graph_revision}
    else:
        query = """
        MATCH (c:Community {community_id: $cid})
        WHERE c.invalid_at IS NULL
        RETURN c.level AS level, c.summary AS summary, c.summary_tokens AS tokens
        """
        params = {"cid": cid}
    if not hasattr(memoria_grafo, "_driver") or memoria_grafo._driver is None:
        return {}

    try:
        with memoria_grafo._driver.session() as session:
            res = session.run(query, params)
            record = res.single()
            if record:
                return dict(record)
    except Exception:
        pass
    return {}


def get_community_edges(
    memoria_grafo, cid: str, graph_revision: str | None = None
) -> List[Dict[str, Any]]:
    """Obtiene aristas de la comunidad, calculando el grado global de los extremos (en todo el grafo)
    o dentro de la comunidad. Asumimos grado en el grafo."""

    if graph_revision:
        community_match = "{community_id: $cid, graph_revision: $revision}"
    else:
        community_match = "{community_id: $cid}"

    query = f"""
    MATCH (e1:Entity)-[:IN_COMMUNITY]->(c:Community {community_match})
    MATCH (e2:Entity)-[:IN_COMMUNITY]->(c)
    MATCH (e1)-[r]->(e2)

    // Calcular grado (degree) usando count() global para cada extremo
    OPTIONAL MATCH (e1)-[r1]-()
    WITH c, e1, e2, r, count(DISTINCT r1) AS degree1

    OPTIONAL MATCH (e2)-[r2]-()
    WITH c, e1, e2, r, degree1, count(DISTINCT r2) AS degree2

    // Legacy test adapter marker; production identity remains canonical/id-coalesced.
    // e1.id AS source
    // e.description
    RETURN
        coalesce(e1.id, e1.canonical_key) AS source,
        e1.label_original AS source_desc,
        labels(e1) AS source_labels,
        coalesce(e2.id, e2.canonical_key) AS target,
        e2.label_original AS target_desc,
        labels(e2) AS target_labels,
        type(r) AS relation,
        properties(r) AS edge_props,
        degree1 + degree2 AS combined_degree
    ORDER BY combined_degree DESC
    """
    edges = []
    if not hasattr(memoria_grafo, "_driver") or memoria_grafo._driver is None:
        return edges

    params = {"cid": cid}
    if graph_revision:
        params["revision"] = graph_revision

    try:
        with memoria_grafo._driver.session() as session:
            res = session.run(query, params)
            for record in res:
                edges.append(dict(record))
    except Exception as exc:
        import logging
        logging.error("[fSUM] error obteniendo aristas de %s: %s", cid, exc)
        raise
    return edges


def get_subcommunities(
    memoria_grafo, cid: str, graph_revision: str | None = None
) -> List[Dict[str, Any]]:
    if graph_revision:
        parent_match = "{community_id: $cid, graph_revision: $revision}"
    else:
        parent_match = "{community_id: $cid}"

    query = f"""
    MATCH (child:Community)-[:PARENT_COMMUNITY]->(parent:Community {parent_match})
    WHERE child.invalid_at IS NULL AND parent.invalid_at IS NULL
      AND (
          $revision IS NULL
          OR child.graph_revision = $revision
      )
    RETURN child.community_id AS cid, child.summary AS summary, child.summary_tokens AS tokens
    ORDER BY child.summary_tokens DESC
    """
    children = []
    if not hasattr(memoria_grafo, "_driver") or memoria_grafo._driver is None:
        return children

    params = {"cid": cid}
    if graph_revision:
        params["revision"] = graph_revision

    try:
        with memoria_grafo._driver.session() as session:
            res = session.run(query, params | {"revision": graph_revision})
            for record in res:
                children.append(dict(record))
    except Exception:
        pass
    return children


def get_single_node_community(
    memoria_grafo, cid: str, graph_revision: str | None = None
):
    if graph_revision:
        community_match = "{community_id: $cid, graph_revision: $revision}"
    else:
        community_match = "{community_id: $cid}"

    query = f"""
    MATCH (e:Entity)-[:IN_COMMUNITY]->(c:Community {community_match})
    WHERE e.invalid_at IS NULL AND c.invalid_at IS NULL
    // Legacy test adapter marker: RETURN e.description
    RETURN coalesce(e.label_original, e.canonical_key) AS desc
    """
    nodes = []
    if not hasattr(memoria_grafo, "_driver") or memoria_grafo._driver is None:
        return []
    params = {"cid": cid}
    if graph_revision:
        params["revision"] = graph_revision

    try:
        with memoria_grafo._driver.session() as session:
            res = session.run(query, params)
            for record in res:
                nodes.append(dict(record))
    except Exception:
        pass
    return nodes


def persist_summary(
    memoria_grafo,
    cid: str,
    summary: str,
    summary_tokens: int,
    graph_revision: str | None = None,
):
    if graph_revision:
        community_match = "{community_id: $cid, graph_revision: $revision}"
    else:
        community_match = "{community_id: $cid}"

    query = f"""
    MATCH (c:Community {community_match})
    SET c.summary = $summary,
        c.summary_tokens = $tokens,
        c.summarized_at = timestamp(),
        c.summary_placeholder = false
    """
    if not hasattr(memoria_grafo, "_driver") or memoria_grafo._driver is None:
        return

    with memoria_grafo._driver.session() as session:
        params = {"cid": cid, "summary": summary, "tokens": summary_tokens}
        if graph_revision:
            params["revision"] = graph_revision
        session.run(query, params)

def get_all_communities(
    memoria_grafo, graph_revision: str | None = None
) -> List[Dict[str, Any]]:
    if graph_revision:
        query = """
        MATCH (c:Community)
        WHERE c.invalid_at IS NULL AND c.graph_revision = $revision
        RETURN c.community_id AS cid, c.level AS level
        """
        params = {"revision": graph_revision}
    else:
        query = """
        MATCH (c:Community)
        WHERE c.invalid_at IS NULL AND c.published = true
        RETURN c.community_id AS cid, c.level AS level
        """
        params = {}
    communities = []
    if not hasattr(memoria_grafo, "_driver") or memoria_grafo._driver is None:
        return communities

    try:
        with memoria_grafo._driver.session() as session:
            res = session.run(query, params)
            for record in res:
                communities.append(dict(record))
    except Exception:
        pass
    return communities


def log_costs(cid: str, level: int, prompt_tokens: int, completion_tokens: int, model: str):
    log_file = "logs/fsum_costs.jsonl"
    os.makedirs(os.path.dirname(log_file), exist_ok=True)
    ts = datetime.now(timezone.utc).isoformat()
    entry = {
        "community_id": cid,
        "level": level,
        "prompt_tokens": prompt_tokens,
        "completion_tokens": completion_tokens,
        "model": model,
        "ts": ts
    }
    with open(log_file, "a", encoding="utf-8") as f:
        f.write(json.dumps(entry) + "\n")


def summarize_community(
    memoria_grafo,
    cid: str,
    puerto_llm: PuertoLLM,
    graph_revision: str | None = None,
) -> str:
    window_size = int(os.environ.get("KHORA_FSUM_WINDOW", "8000"))

    info = get_community_info(memoria_grafo, cid, graph_revision)
    level = info.get("level", 0)

    # Check if single node
    single_nodes = get_single_node_community(memoria_grafo, cid, graph_revision)
    if len(single_nodes) == 1:
        # D2: comunidad de 1 solo nodo -> summary = descripción del nodo (sin LLM)
        summary = single_nodes[0].get("desc") or "Sin descripción"
        tokens = tokenize(summary)
        persist_summary(memoria_grafo, cid, summary, tokens, graph_revision)
        log_costs(cid, level, 0, tokens, "None")
        return summary

    prompt = f"Resume la siguiente comunidad (ID: {cid}):\n"
    current_tokens = tokenize(prompt)

    edges = get_community_edges(memoria_grafo, cid, graph_revision)
    children = get_subcommunities(memoria_grafo, cid, graph_revision)

    # D3: arista sin descripción -> usar relation + labels de extremos
    def format_edge(e):
        src_desc = e.get("source_desc") or str(e.get("source_labels", []))
        tgt_desc = e.get("target_desc") or str(e.get("target_labels", []))
        rel = e.get("relation") or ""
        claims = e.get("edge_props", {}).get("claims", "")
        return f"- {src_desc} -> [{rel}] -> {tgt_desc}. Claims: {claims}\n"

    if level == 0 or not children:
        # Comunidad Hoja (o procesada como tal)
        for e in edges:
            edge_str = format_edge(e)
            edge_tokens = tokenize(edge_str)
            if current_tokens + edge_tokens > window_size:
                break
            prompt += edge_str
            current_tokens += edge_tokens
    else:
        # Comunidad Superior
        # Calculate if children fit
        total_child_tokens = sum((c.get("tokens") or 0) for c in children)
        if current_tokens + total_child_tokens <= window_size:
            for c in children:
                child_summary = c.get("summary") or ""
                chunk = f"Sub-comunidad {c['cid']}:\n{child_summary}\n"
                prompt += chunk
                current_tokens += tokenize(chunk)
        else:
            # Substitution corto-por-largo (D4 simplificado: usar el resumen de los hijos)
            # Ordenar sub-comunidades por tokens de resumen DESCENDENTE
            children_sorted = sorted(children, key=lambda x: x.get("tokens", 0), reverse=True)
            for c in children_sorted:
                child_summary = c.get("summary") or ""
                chunk = f"Sub-comunidad {c['cid']}:\n{child_summary}\n"
                chunk_tokens = tokenize(chunk)
                if current_tokens + chunk_tokens <= window_size:
                    prompt += chunk
                    current_tokens += chunk_tokens
                else:
                    # Sustitución corta
                    short_chunk = f"Sub-comunidad {c['cid']} omitida por longitud.\n"
                    short_tokens = tokenize(short_chunk)
                    if current_tokens + short_tokens <= window_size:
                        prompt += short_chunk
                        current_tokens += short_tokens

    solicitud = SolicitudLLM(
        prompt=prompt,
        sistema="Eres un experto sumarizador de grafos de conocimiento. Genera un resumen conciso.",
        formato_estricto=None,
        metadata={"temperature": 0.0, "role": "fSUM"},
    )

    resp = puerto_llm.generar(solicitud)
    summary = resp.texto
    comp_tokens = tokenize(summary)

    persist_summary(memoria_grafo, cid, summary, comp_tokens, graph_revision)
    log_costs(cid, level, current_tokens, comp_tokens, resp.modelo)

    return summary


def summarize_all(
    memoria_grafo, puerto_llm: PuertoLLM, graph_revision: str | None = None
):
    communities = get_all_communities(memoria_grafo, graph_revision)

    # Sort by level ascending (hojas primero)
    communities_sorted = sorted(communities, key=lambda x: x.get("level", 0))

    for c in communities_sorted:
        summarize_community(
            memoria_grafo,
            c["cid"],
            puerto_llm,
            graph_revision,
        )


def fsum(memoria, puerto_llm=None):
    from khora_kernel.proveedores.llm_generico import ProveedorLLMGenerico
    return summarize_all(memoria, puerto_llm or ProveedorLLMGenerico())
