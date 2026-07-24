# @l0 L0-002-R · @req KA-00/REQ-2 · @acr ACR-2.1
import json
import os
from datetime import datetime
from typing import Any, Dict, List

from khora_kernel.api import PuertoLLM, SolicitudLLM


def tokenize(text: str) -> int:
    """Fallback tokenizer D4 for testing. 1 word = 1.3 tokens approx."""
    return int(len(text.split()) * 1.3)


def get_community_info(memoria_neo4j, cid: str) -> Dict[str, Any]:
    """Recupera la informacion de la comunidad."""
    query = """
    MATCH (c:Community {community_id: $cid})
    RETURN c.level AS level, c.summary AS summary, c.summary_tokens AS tokens
    """
    if not hasattr(memoria_neo4j, "_driver") or memoria_neo4j._driver is None:
        return {}

    try:
        with memoria_neo4j._driver.session() as session:
            res = session.run(query, {"cid": cid})
            record = res.single()
            if record:
                return dict(record)
    except Exception:
        pass
    return {}


def get_community_edges(memoria_neo4j, cid: str) -> List[Dict[str, Any]]:
    """Obtiene aristas de la comunidad, calculando el grado global de los extremos (en todo el grafo)
    o dentro de la comunidad. Asumimos grado en el grafo."""

    query = """
    MATCH (e1:Entity)-[:IN_COMMUNITY]->(c:Community {community_id: $cid})
    MATCH (e2:Entity)-[:IN_COMMUNITY]->(c)
    MATCH (e1)-[r]->(e2)

    // Calcular grado (degree) usando count() global para cada extremo
    OPTIONAL MATCH (e1)-[r1]-()
    WITH c, e1, e2, r, count(DISTINCT r1) AS degree1

    OPTIONAL MATCH (e2)-[r2]-()
    WITH c, e1, e2, r, degree1, count(DISTINCT r2) AS degree2

    RETURN
        e1.id AS source,
        e1.description AS source_desc,
        labels(e1) AS source_labels,
        e2.id AS target,
        e2.description AS target_desc,
        labels(e2) AS target_labels,
        type(r) AS relation,
        properties(r) AS edge_props,
        degree1 + degree2 AS combined_degree
    ORDER BY combined_degree DESC
    """
    edges = []
    if not hasattr(memoria_neo4j, "_driver") or memoria_neo4j._driver is None:
        return edges

    try:
        with memoria_neo4j._driver.session() as session:
            res = session.run(query, {"cid": cid})
            for record in res:
                edges.append(dict(record))
    except Exception:
        pass
    return edges


def get_subcommunities(memoria_neo4j, cid: str) -> List[Dict[str, Any]]:
    query = """
    MATCH (child:Community)-[:PARENT_COMMUNITY]->(parent:Community {community_id: $cid})
    RETURN child.community_id AS cid, child.summary AS summary, child.summary_tokens AS tokens
    ORDER BY child.summary_tokens DESC
    """
    children = []
    if not hasattr(memoria_neo4j, "_driver") or memoria_neo4j._driver is None:
        return children

    try:
        with memoria_neo4j._driver.session() as session:
            res = session.run(query, {"cid": cid})
            for record in res:
                children.append(dict(record))
    except Exception:
        pass
    return children


def get_single_node_community(memoria_neo4j, cid: str):
    query = """
    MATCH (e:Entity)-[:IN_COMMUNITY]->(c:Community {community_id: $cid})
    RETURN e.description AS desc
    """
    nodes = []
    if not hasattr(memoria_neo4j, "_driver") or memoria_neo4j._driver is None:
        return []
    try:
        with memoria_neo4j._driver.session() as session:
            res = session.run(query, {"cid": cid})
            for record in res:
                nodes.append(dict(record))
    except Exception:
        pass
    return nodes


def persist_summary(memoria_neo4j, cid: str, summary: str, summary_tokens: int):
    query = """
    MATCH (c:Community {community_id: $cid})
    SET c.summary = $summary,
        c.summary_tokens = $tokens,
        c.summarized_at = timestamp(),
        c.summary_placeholder = false
    """
    if not hasattr(memoria_neo4j, "_driver") or memoria_neo4j._driver is None:
        return

    try:
        with memoria_neo4j._driver.session() as session:
            session.run(query, {"cid": cid, "summary": summary, "tokens": summary_tokens})
    except Exception:
        pass

def get_all_communities(memoria_neo4j) -> List[Dict[str, Any]]:
    query = """
    MATCH (c:Community)
    RETURN c.community_id AS cid, c.level AS level
    """
    communities = []
    if not hasattr(memoria_neo4j, "_driver") or memoria_neo4j._driver is None:
        return communities

    try:
        with memoria_neo4j._driver.session() as session:
            res = session.run(query)
            for record in res:
                communities.append(dict(record))
    except Exception:
        pass
    return communities


def log_costs(cid: str, level: int, prompt_tokens: int, completion_tokens: int, model: str):
    log_file = "logs/fsum_costs.jsonl"
    os.makedirs(os.path.dirname(log_file), exist_ok=True)
    ts = datetime.utcnow().isoformat() + "Z"
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


def summarize_community(memoria_neo4j, cid: str, puerto_llm: PuertoLLM) -> str:
    window_size = int(os.environ.get("KHORA_FSUM_WINDOW", "8000"))

    info = get_community_info(memoria_neo4j, cid)
    level = info.get("level", 0)

    # Check if single node
    single_nodes = get_single_node_community(memoria_neo4j, cid)
    if len(single_nodes) == 1:
        # D2: comunidad de 1 solo nodo -> summary = descripción del nodo (sin LLM)
        summary = single_nodes[0].get("desc") or "Sin descripción"
        tokens = tokenize(summary)
        persist_summary(memoria_neo4j, cid, summary, tokens)
        log_costs(cid, level, 0, tokens, "None")
        return summary

    prompt = f"Resume la siguiente comunidad (ID: {cid}):\n"
    current_tokens = tokenize(prompt)

    edges = get_community_edges(memoria_neo4j, cid)
    children = get_subcommunities(memoria_neo4j, cid)

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
        metadata={"temperature": 0.0},
    )

    resp = puerto_llm.generar(solicitud)
    summary = resp.texto
    comp_tokens = tokenize(summary)

    persist_summary(memoria_neo4j, cid, summary, comp_tokens)
    log_costs(cid, level, current_tokens, comp_tokens, resp.modelo)

    return summary


def summarize_all(memoria_neo4j, puerto_llm: PuertoLLM):
    communities = get_all_communities(memoria_neo4j)

    # Sort by level ascending (hojas primero)
    communities_sorted = sorted(communities, key=lambda x: x.get("level", 0))

    for c in communities_sorted:
        summarize_community(memoria_neo4j, c["cid"], puerto_llm)
