# @l0 L0-002-R · @req KA-00/REQ-2 · @acr ACR-2.1
import json
import os
from typing import Any, Callable, List, Optional, Tuple
import faiss
import numpy as np
from sentence_transformers import SentenceTransformer

_MODEL = None
_MODEL_CALL_COUNT = 0

def get_model() -> SentenceTransformer:
    global _MODEL
    if _MODEL is None:
        model_name = os.getenv("KHORA_EMB_MODEL", "BAAI/bge-m3")
        _MODEL = SentenceTransformer(model_name)
    return _MODEL

def get_model_call_count() -> int:
    return _MODEL_CALL_COUNT

def reset_model_call_count() -> None:
    global _MODEL_CALL_COUNT
    _MODEL_CALL_COUNT = 0

def embed_text(text: str) -> List[float]:
    global _MODEL_CALL_COUNT
    _MODEL_CALL_COUNT += 1
    model = get_model()
    emb = model.encode(text, normalize_embeddings=True)
    if isinstance(emb, np.ndarray):
        return emb.tolist()
    return emb

INDEX_FILE = "data/faiss_pkg.idx"
MAP_FILE = "data/faiss_pkg_map.json"

def _load_or_create_index() -> Tuple[Any, List[str]]:
    if os.path.exists(INDEX_FILE) and os.path.exists(MAP_FILE):
        index = faiss.read_index(INDEX_FILE)
        with open(MAP_FILE, "r", encoding="utf-8") as f:
            id_map = json.load(f)
        return index, id_map
    else:
        index = faiss.IndexFlatIP(1024)
        return index, []

def _save_index(index: Any, id_map: List[str]) -> None:
    os.makedirs(os.path.dirname(INDEX_FILE), exist_ok=True)
    faiss.write_index(index, INDEX_FILE)
    with open(MAP_FILE, "w", encoding="utf-8") as f:
        json.dump(id_map, f)

def index_all(memoria: Any) -> None:
    index, id_map = _load_or_create_index()
    # D1 / D6: as we don't have the Neo4j API directly here, we expect the mock to provide nodes
    nodes = memoria.get_all_nodes()

    for node in nodes:
        text = node.get("label", "") + " " + node.get("text", node.get("descripcion", ""))
        if node.get("label") == "Community" and "summary" in node:
            text += " " + node.get("summary")

        emb = embed_text(text)

        if node["id"] not in id_map:
            id_map.append(node["id"])
            index.add(np.array([emb], dtype=np.float32))

    _save_index(index, id_map)

def knn(query: str, k: int) -> List[Tuple[str, float]]:
    index, id_map = _load_or_create_index()
    if index.ntotal == 0:
        return []

    query_emb = embed_text(query)
    q_vec = np.array([query_emb], dtype=np.float32)

    distances, indices = index.search(q_vec, k)

    results = []
    for dist, idx in zip(distances[0], indices[0]):
        if idx < len(id_map) and idx >= 0:
            results.append((id_map[idx], float(dist)))

    return results

def on_node_upserted(node_id: str, memoria: Any) -> None:
    node = memoria.get_node(node_id)
    if not node:
        return

    text = node.get("label", "") + " " + node.get("text", node.get("descripcion", ""))
    if node.get("label") == "Community" and "summary" in node:
        text += " " + node.get("summary")

    emb = embed_text(text)

    index, id_map = _load_or_create_index()
    if node_id not in id_map:
        id_map.append(node_id)
        index.add(np.array([emb], dtype=np.float32))
        _save_index(index, id_map)
