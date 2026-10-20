"""Controlled safety contracts; not live graph/capacity/end-to-end certification."""
import asyncio
import json
from contextlib import nullcontext
from concurrent.futures import ThreadPoolExecutor
from types import SimpleNamespace as NS
from unittest.mock import patch

import numpy as np
import pytest
import khora_kernel.embeddings as em
from khora_kernel.api import ContextoDeVisibilidad as Visibility
from khora_kernel.consulta.retriever import RetrieverGraphRAG
from khora_kernel.integrations.openwebui import Pipe, KernelChatBinding


@pytest.fixture
def isolated(monkeypatch, tmp_path):
    for name in ["KHORA_EMB_OFFLINE", "KHORA_LLM_BASE_URL", "KHORA_EMBEDDINGS_BASE_URL", "KHORA_EMBEDDINGS_API_KEY", "KHORA_EMBEDDINGS_MODEL"]:
        monkeypatch.delenv(name, raising=False)
    for name, filename in [("INDEX_FILE", "index.npz"), ("MAP_FILE", "ids.json"), ("META_FILE", "meta.json"), ("TEXT_FILE", "texts.json")]:
        monkeypatch.setattr(em, name, tmp_path / filename)
    monkeypatch.setattr(em, "get_model", lambda: (_ for _ in ()).throw(RuntimeError("not installed")))
    return tmp_path


def provider(monkeypatch):
    monkeypatch.setenv("KHORA_EMBEDDINGS_BASE_URL", "https://provider.example.test/v1")
    monkeypatch.setenv("KHORA_EMBEDDINGS_MODEL", "voyage-4-large")
    monkeypatch.setenv("KHORA_EMBEDDINGS_API_KEY", "SYNTHETIC_NOT_A_KEY")


def test_legacy_hash_explicitly_not_certified(isolated):
    assert len(em.embed_text("artificial")) == 1024
    assert not em.semantic_embeddings_required()


def test_native_missing_provider_never_hashes(isolated):
    with patch.object(em, "_fallback_embedding") as fallback, em.require_semantic_embeddings():
        with pytest.raises(em.SemanticEmbeddingUnavailable): em.embed_text("artificial")
    fallback.assert_not_called()
    assert not em.semantic_embeddings_required()


def test_embeddings_endpoint_independent_of_chat_provider(isolated, monkeypatch):
    provider(monkeypatch)
    with patch("khora_kernel.proveedores.ProveedorLLMGenerico.incrustar", return_value=[[1.] + [0.] * 1023]) as actual_adapter, em.require_semantic_embeddings():
        assert em.embed_text("public artificial")[0] == 1.
    actual_adapter.assert_called_once_with(["public artificial"])


@pytest.mark.parametrize("vector", [[0.] * 1024, [1.] * 3, [float("nan")] * 1024, [float("inf")] * 1024])
def test_native_rejects_invalid_vectors_without_hash(isolated, monkeypatch, vector):
    provider(monkeypatch)
    with patch("khora_kernel.proveedores.ProveedorLLMGenerico.incrustar", return_value=[vector]), patch.object(em, "_fallback_embedding") as fallback, em.require_semantic_embeddings():
        with pytest.raises(em.SemanticEmbeddingUnavailable): em.embed_text("artificial")
    fallback.assert_not_called()


def test_native_provider_error_redacted(isolated, monkeypatch):
    provider(monkeypatch)
    with patch("khora_kernel.proveedores.ProveedorLLMGenerico.incrustar", side_effect=RuntimeError("SECRET_SENTINEL")), em.require_semantic_embeddings():
        with pytest.raises(em.SemanticEmbeddingUnavailable) as error: em.embed_text("public")
    assert "SECRET_SENTINEL" not in str(error.value)


def test_native_offline_rejected(isolated, monkeypatch):
    provider(monkeypatch); monkeypatch.setenv("KHORA_EMB_OFFLINE", "1")
    with em.require_semantic_embeddings(), pytest.raises(em.SemanticEmbeddingUnavailable): em.embed_text("artificial")


@pytest.mark.parametrize("mode", ["legacy", "model_mismatch", "graph_mismatch", "invalidated"])
def test_native_stale_or_unknown_vector_space_rejected_before_network(isolated, monkeypatch, mode):
    provider(monkeypatch)
    meta = {"graph_revision": "revision", "embedding_space_sha256": em._embedding_space_id(), "invalidated": False}
    if mode == "legacy": meta.pop("embedding_space_sha256")
    if mode == "model_mismatch": meta["embedding_space_sha256"] = "different-model-same-dimension"
    if mode == "graph_mismatch": meta["graph_revision"] = "old-revision"
    if mode == "invalidated": meta["invalidated"] = True
    em.META_FILE.write_text(json.dumps(meta))
    with patch("khora_kernel.proveedores.ProveedorLLMGenerico.incrustar") as network, em.require_semantic_embeddings():
        with pytest.raises(em.SemanticEmbeddingUnavailable): em.knn("public", 3, expected_graph_revision="revision")
    network.assert_not_called()


def test_native_verified_index_roundtrip_and_model_change(isolated, monkeypatch):
    provider(monkeypatch)
    memory = NS(get_all_nodes=lambda: [{"id":"artificial-public", "text":"artificial"}])
    with patch("khora_kernel.proveedores.ProveedorLLMGenerico.incrustar", return_value=[[1.] + [0.] * 1023]), em.require_semantic_embeddings():
        assert em.rebuild_index(memory, "revision")["nodes_indexed"] == 1
        assert em.knn("public", 1, expected_graph_revision="revision")[0][0] == "artificial-public"
        monkeypatch.setenv("KHORA_EMBEDDINGS_MODEL", "another-model")
        with pytest.raises(em.SemanticEmbeddingUnavailable): em.knn("public", 1, expected_graph_revision="revision")
    assert "SYNTHETIC_NOT_A_KEY" not in em.META_FILE.read_text()


def test_context_guard_resets_and_does_not_cross_threads(isolated):
    with em.require_semantic_embeddings():
        assert em.semantic_embeddings_required()
        with ThreadPoolExecutor(max_workers=1) as pool:
            assert pool.submit(em.semantic_embeddings_required).result() is False
    assert not em.semantic_embeddings_required()


class GraphSession:
    def __init__(self): self.queries = []
    def __enter__(self): return self
    def __exit__(self, *args): pass
    def run(self, query, **params):
        self.queries.append((query, params))
        if "RETURN DISTINCT sid" in query: return [{"sid":"public", "community_id":"mixed"}]
        if "RETURN DISTINCT e.canonical_key" in query: return [{"id":"public"}]
        if "AS path_nodes" in query: return [{"path_nodes":["public"], "path_edges":[]}]
        if "RETURN e.canonical_key AS id" in query: return [{"id":"public", "vis":"transparente"}]
        if "AS source" in query: return []
        if "labels(e) AS node_labels" in query: return [{"id":"public", "node_labels":["Entity"], "text":"artificial public source", "provenance":[], "visibilidad":"transparente"}]
        if "RETURN c.community_id AS id" in query:
            # Deliberately adversarial: published alone leaks a mixed summary.
            guarded = all(x in query for x in ["NOT EXISTS", "EXISTS { MATCH (:Entity)", "coalesce(c.visibilidad,'privado')", "coalesce(member.visibilidad,'privado')", "member.invalid_at IS NOT NULL"])
            return [] if guarded and not params["private"] else [{"id":"mixed", "summary":"PRIVATE_SENTINEL", "graph_revision":"revision"}]
        raise AssertionError("unrecognized controlled query")


def test_public_queries_fail_closed_for_summaries_paths_and_edges(isolated, monkeypatch):
    monkeypatch.setattr(em, "knn", lambda *a, **k: [("public", 1.)])
    session = GraphSession(); memory = NS(_driver=NS(session=lambda:session), get_graph_revision=lambda:"revision")
    result = RetrieverGraphRAG(memory).consultar("public", Visibility.TRANSPARENTE)
    assert "PRIVATE_SENTINEL" not in str(result.fragmentos)
    assert not result.resumenes_incluidos
    for query, params in session.queries:
        if "$private" in query: assert params["private"] is False
        if "AS path_nodes" in query:
            assert "all(x IN nodes(p) WHERE coalesce(x.visibilidad" in query
            assert "all(r IN relationships(p) WHERE r.invalid_at IS NULL" in query
        if "AS source" in query: assert "coalesce(r.visibilidad,'privado')" in query


def test_private_context_is_not_relabelled_public(isolated, monkeypatch):
    monkeypatch.setattr(em, "knn", lambda *a, **k: [("public", 1.)])
    session=GraphSession();memory=NS(_driver=NS(session=lambda:session),get_graph_revision=lambda:"revision")
    result=RetrieverGraphRAG(memory).consultar("test",Visibility.PRIVADO)
    summary=next(f for f in result.fragmentos if f.id=="mixed")
    assert summary.visibilidad == Visibility.PRIVADO


def test_native_pipe_scopes_strict_semantics_and_reports_technical_fault(isolated):
    binding=KernelChatBinding("u","c","session",object(),object(),"unused",nullcontext,Visibility.TRANSPARENTE)
    request=NS(app=NS(state=NS(khora_chat_binding=lambda **kw:binding)))
    def kernel(*args,**kwargs):
        assert em.semantic_embeddings_required()
        return NS(verdict="INSUFFICIENT",trace=[{"error":"EMBEDDING_INDEX_NOT_VERIFIED"}],citations=[],answer="")
    with patch("khora_kernel.engine.core.ejecutar_ciclo",side_effect=kernel):
        with pytest.raises(RuntimeError) as error:
            asyncio.run(Pipe().pipe({"messages":[{"role":"user","content":"public"}]},__user__={"id":"u"},__chat_id__="c",__request__=request))
    assert "EMBEDDING_INDEX_NOT_VERIFIED" not in str(error.value)
    assert not em.semantic_embeddings_required()


@pytest.mark.parametrize("artifact", ["INDEX_FILE", "MAP_FILE", "TEXT_FILE"])
def test_native_index_artifact_replacement_rejected(isolated, monkeypatch, artifact):
    provider(monkeypatch)
    with patch("khora_kernel.proveedores.ProveedorLLMGenerico.incrustar", return_value=[[1.] + [0.] * 1023]), em.require_semantic_embeddings():
        em.rebuild_index(NS(get_all_nodes=lambda: [{"id":"public", "text":"artificial"}]), "revision")
        target=getattr(em,artifact);target.write_bytes(target.read_bytes()+b" ")
        with pytest.raises(em.SemanticEmbeddingUnavailable,match="ARTIFACTS"):
            em.knn("public",1,expected_graph_revision="revision")
