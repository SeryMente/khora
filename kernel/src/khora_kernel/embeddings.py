# @l0 L0-002-R · @req KA-00/REQ-2 · @acr ACR-2.1 · @ua UA-15,UA-16,UA-30
import hashlib
import json
import os
from pathlib import Path
from typing import Any, List, Tuple

import numpy as np

try:
    import faiss
except ImportError:
    faiss = None

EMBED_DIM = 1024
INDEX_FILE = Path(os.getenv("KHORA_EMB_INDEX_FILE", "data/faiss_pkg.idx"))
MAP_FILE = Path(os.getenv("KHORA_EMB_MAP_FILE", "data/faiss_pkg_map.json"))
META_FILE = MAP_FILE.with_name(MAP_FILE.stem + "_meta.json")
TEXT_FILE = MAP_FILE.with_name(MAP_FILE.stem + "_texts.json")
_MODEL = None
_MODEL_CALL_COUNT = 0


def get_model() -> Any:
    global _MODEL
    if _MODEL is None:
        from sentence_transformers import SentenceTransformer
        _MODEL = SentenceTransformer(os.getenv("KHORA_EMB_MODEL", "BAAI/bge-m3"))
    return _MODEL


def get_model_call_count() -> int:
    return _MODEL_CALL_COUNT


def reset_model_call_count() -> None:
    global _MODEL_CALL_COUNT
    _MODEL_CALL_COUNT = 0


def _hash_feature(feature: str, dim: int) -> tuple[int, float]:
    digest = hashlib.sha256(feature.encode("utf-8")).digest()
    idx = int.from_bytes(digest[:4], "big") % dim
    sign = 1.0 if digest[4] & 1 else -1.0
    weight = 1.0 + (digest[5] / 255.0)
    return idx, sign * weight


def _fallback_embedding(text: str, dim: int = EMBED_DIM) -> List[float]:
    tokens = [t for t in text.lower().replace("—", " ").split() if t]
    features = list(tokens)
    features.extend(f"{a} {b}" for a, b in zip(tokens, tokens[1:]))
    features.extend(f"{a} {b} {c}" for a, b, c in zip(tokens, tokens[1:], tokens[2:]))
    vec = np.zeros(dim, dtype=np.float32)
    for feature in features:
        idx, value = _hash_feature(feature, dim)
        vec[idx] += value
    norm = np.linalg.norm(vec)
    if norm:
        vec /= norm
    return vec.tolist()


def embed_text(text: str) -> List[float]:
    global _MODEL_CALL_COUNT
    _MODEL_CALL_COUNT += 1
    try:
        if os.getenv("KHORA_LLM_BASE_URL"):
            from khora_kernel.proveedores import ProveedorLLMGenerico
            emb = ProveedorLLMGenerico().incrustar([text])[0]
            if len(emb) == EMBED_DIM:
                return emb
            return _fallback_embedding(text)
        model = get_model()
        emb = model.encode(text, normalize_embeddings=True)
        result = emb.tolist() if isinstance(emb, np.ndarray) else list(emb)
        return result if len(result) == EMBED_DIM else _fallback_embedding(text)
    except Exception:
        return _fallback_embedding(text)


def _read_ids() -> List[str]:
    if not MAP_FILE.exists():
        return []
    try:
        data = json.loads(MAP_FILE.read_text(encoding="utf-8"))
        if isinstance(data, list):
            return [str(x) for x in data]
        return [str(x) for x in data.get("ids", [])]
    except Exception:
        return []


def _read_meta() -> dict:
    try:
        return json.loads(META_FILE.read_text(encoding="utf-8")) if META_FILE.exists() else {}
    except Exception:
        return {}


def _load_vectors() -> np.ndarray:
    if not INDEX_FILE.exists():
        return np.zeros((0, EMBED_DIM), dtype=np.float32)
    try:
        with INDEX_FILE.open("rb") as fh:
            with np.load(fh, allow_pickle=False) as payload:
                vectors = np.asarray(payload["vectors"], dtype=np.float32)
        if vectors.ndim != 2:
            return np.zeros((0, EMBED_DIM), dtype=np.float32)
        return vectors
    except Exception:
        return np.zeros((0, EMBED_DIM), dtype=np.float32)


def _save_index(
    vectors: np.ndarray, ids: List[str], graph_revision: str | None,
    texts: dict[str, str] | None = None,
) -> None:
    INDEX_FILE.parent.mkdir(parents=True, exist_ok=True)
    MAP_FILE.parent.mkdir(parents=True, exist_ok=True)
    with INDEX_FILE.open("wb") as fh:
        np.savez_compressed(fh, vectors=vectors.astype(np.float32))
    MAP_FILE.write_text(json.dumps(ids, ensure_ascii=False, indent=2), encoding="utf-8")
    META_FILE.write_text(json.dumps({"graph_revision": graph_revision}, ensure_ascii=False, indent=2), encoding="utf-8")
    if texts is not None:
        TEXT_FILE.write_text(json.dumps(texts, ensure_ascii=False, indent=2), encoding="utf-8")


def rebuild_index(memoria: Any, graph_revision: str | None = None) -> dict:
    nodes = memoria.get_all_nodes() if hasattr(memoria, "get_all_nodes") else []
    ids: List[str] = []
    vectors: List[List[float]] = []
    texts: dict[str, str] = {}
    for node in nodes:
        node_id = str(node.get("id") or "")
        if not node_id:
            continue
        text = " ".join(str(node.get(k) or "") for k in ("label", "text", "description", "summary")).strip()
        emb = embed_text(text or node_id)
        if len(emb) != EMBED_DIM:
            emb = _fallback_embedding(text or node_id)
        ids.append(node_id)
        vectors.append(emb)
        texts[node_id] = text or node_id
    matrix = np.asarray(vectors, dtype=np.float32) if vectors else np.zeros((0, EMBED_DIM), dtype=np.float32)
    _save_index(matrix, ids, graph_revision, texts)
    return {"graph_revision": graph_revision, "nodes_indexed": len(ids), "dimension": EMBED_DIM}


def index_all(memoria: Any) -> None:
    revision = memoria.get_graph_revision() if hasattr(memoria, "get_graph_revision") else None
    rebuild_index(memoria, revision)


def _tokens(text: str) -> set[str]:
    import re
    import unicodedata
    normalized = unicodedata.normalize("NFKD", text.lower())
    normalized = "".join(ch for ch in normalized if not unicodedata.combining(ch))
    return set(re.findall(r"[a-z0-9áéíóúüñ]+", normalized))


def knn(query: str, k: int) -> List[Tuple[str, float]]:
    ids = _read_ids()
    if not ids:
        return []
    matrix = _load_vectors()
    if matrix.ndim != 2 or matrix.shape[0] != len(ids):
        return []
    q = np.asarray(embed_text(query), dtype=np.float32)
    if q.shape[0] != matrix.shape[1]:
        return []
    scores = matrix @ q
    lexical = []
    query_tokens = _tokens(query)
    try:
        text_map = json.loads(TEXT_FILE.read_text(encoding="utf-8")) if TEXT_FILE.exists() else {}
    except Exception:
        text_map = {}
    for node_id in ids:
        node_tokens = _tokens(str(text_map.get(node_id, "")))
        union = query_tokens | node_tokens
        lexical.append((len(query_tokens & node_tokens) / len(union)) if union else 0.0)
    # El componente léxico no sustituye la semántica: rompe empates y garantiza
    # que identificadores/canon de dominio explícitos sean recuperables.
    combined = np.asarray(scores, dtype=np.float32) + 3.0 * np.asarray(lexical, dtype=np.float32)
    order = np.argsort(-combined)[:min(k, len(ids))]
    return [(ids[int(i)], float(scores[int(i)])) for i in order]


def on_node_upserted(node_id: str, memoria: Any) -> dict:
    revision = memoria.get_graph_revision() if hasattr(memoria, "get_graph_revision") else None
    return rebuild_index(memoria, revision)


# Deletion fence for UA-30: an invalidated index is never queryable.
def _save_index(
    vectors: np.ndarray,
    ids: List[str],
    graph_revision: str | None,
    texts: dict[str, str] | None = None,
) -> None:
    INDEX_FILE.parent.mkdir(parents=True, exist_ok=True)
    MAP_FILE.parent.mkdir(parents=True, exist_ok=True)
    with INDEX_FILE.open("wb") as fh:
        np.savez_compressed(fh, vectors=vectors.astype(np.float32))
    MAP_FILE.write_text(
        json.dumps(ids, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )
    META_FILE.write_text(
        json.dumps(
            {"graph_revision": graph_revision, "invalidated": False},
            ensure_ascii=False,
            indent=2,
        ),
        encoding="utf-8",
    )
    if texts is not None:
        TEXT_FILE.write_text(
            json.dumps(texts, ensure_ascii=False, indent=2),
            encoding="utf-8",
        )


def invalidate_index() -> None:
    META_FILE.parent.mkdir(parents=True, exist_ok=True)
    META_FILE.write_text(
        json.dumps(
            {"graph_revision": None, "invalidated": True},
            ensure_ascii=False,
            indent=2,
        ),
        encoding="utf-8",
    )


def knn(query: str, k: int) -> List[Tuple[str, float]]:
    if _read_meta().get("invalidated") is True:
        return []

    ids = _read_ids()
    if not ids:
        return []
    matrix = _load_vectors()
    if matrix.ndim != 2 or matrix.shape[0] != len(ids):
        return []
    q = np.asarray(embed_text(query), dtype=np.float32)
    if q.shape[0] != matrix.shape[1]:
        return []

    scores = matrix @ q
    lexical = []
    query_tokens = _tokens(query)
    try:
        text_map = (
            json.loads(TEXT_FILE.read_text(encoding="utf-8"))
            if TEXT_FILE.exists() else {}
        )
    except Exception:
        text_map = {}

    for node_id in ids:
        node_tokens = _tokens(str(text_map.get(node_id, "")))
        union = query_tokens | node_tokens
        lexical.append(
            len(query_tokens & node_tokens) / len(union)
            if union else 0.0
        )

    combined = (
        np.asarray(scores, dtype=np.float32)
        + 3.0 * np.asarray(lexical, dtype=np.float32)
    )
    order = np.argsort(-combined)[:min(k, len(ids))]
    return [(ids[int(i)], float(scores[int(i)])) for i in order]
