# @l0 L0-002-R · @req KA-00/REQ-2 · @acr ACR-2.1
import json
from unittest.mock import MagicMock

import khora_kernel.embeddings as embeddings
from khora_kernel.motor._memoria import Neo4jMemoriaOrganizada


def _memoria_mock():
    memoria = Neo4jMemoriaOrganizada.__new__(Neo4jMemoriaOrganizada)
    tx = MagicMock()
    session = MagicMock()
    driver = MagicMock()
    driver.session.return_value.__enter__.return_value = session
    session.begin_transaction.return_value.__enter__.return_value = tx
    memoria._driver = driver
    return memoria, tx


def test_olvidar_cubre_io_relaciones_entidades_literales_y_comunidades(monkeypatch):
    memoria, tx = _memoria_mock()

    import khora_kernel.embeddings as embeddings
    invalidated = {"value": False}
    rebuilt = {"value": False}
    monkeypatch.setattr(embeddings, "invalidate_index", lambda: invalidated.__setitem__("value", True))
    monkeypatch.setattr(embeddings, "rebuild_index", lambda *args, **kwargs: rebuilt.__setitem__("value", True) or {"nodes_indexed": 0})

    io_result = MagicMock()
    io_result.single.return_value = {
        "id": "io-1",
        "sha": "a" * 64,
        "entities": ["alice"],
    }
    literal_result = [
        {"id": "literal:Ada"},
        {"id": "literal:1843"},
    ]

    calls = {"n": 0}

    def run(query, **kwargs):
        calls["n"] += 1
        result = MagicMock()
        if "InformationObject" in query and "RETURN io.io_id" in query:
            return io_result
        if "Literal" in query and "RETURN DISTINCT" in query:
            result.__iter__.return_value = iter(literal_result)
        return result

    tx.run.side_effect = run

    acta = memoria.olvidar("io-1")
    assert len(acta) == 64
    assert invalidated["value"] is True
    assert rebuilt["value"] is True

    queries = [call.args[0] for call in tx.run.call_args_list]
    assert any("RELATION {io_id:$id}" in q for q in queries)
    assert any("InformationObject {io_id:$id}" in q and "DETACH DELETE" in q for q in queries)
    assert any("Entity {canonical_key:id}" in q and "DETACH DELETE" in q for q in queries)
    assert any("Literal {canonical_key:id}" in q and "DETACH DELETE" in q for q in queries)
    assert any("Community" in q and "DETACH DELETE" in q for q in queries)
    tx.commit.assert_called_once()


def test_olvidar_ausente_tiene_huella_determinista():
    memoria, tx = _memoria_mock()
    result = MagicMock()
    result.single.return_value = None
    tx.run.return_value = result

    a = memoria.olvidar("io-ausente")
    b = memoria.olvidar("io-ausente")
    assert a == b


def test_olvidar_runtime_elimina_residuos_de_indice(neo4j_config, monkeypatch, tmp_path):
    index_file = tmp_path / "pkg.idx"
    map_file = tmp_path / "pkg_map.json"
    meta_file = tmp_path / "pkg_map_meta.json"
    text_file = tmp_path / "pkg_map_texts.json"
    monkeypatch.setattr(embeddings, "INDEX_FILE", index_file)
    monkeypatch.setattr(embeddings, "MAP_FILE", map_file)
    monkeypatch.setattr(embeddings, "META_FILE", meta_file)
    monkeypatch.setattr(embeddings, "TEXT_FILE", text_file)
    monkeypatch.setenv("KHORA_EMB_OFFLINE", "1")

    memoria = Neo4jMemoriaOrganizada(
        neo4j_config["uri"], neo4j_config["user"], neo4j_config["password"]
    )
    try:
        with memoria._driver.session() as session:
            session.run("MATCH (n) DETACH DELETE n")

        ts = "2026-10-02T20:00:00Z"
        memoria.asentar_transaccional(
            entidades=[
                {"canonical_key": "A", "label_original": "Alice", "embedding": None,
                 "provenance_raw": "test", "event_time": ts, "capture_time": ts,
                 "custody": "test", "needs_review": False},
                {"canonical_key": "B", "label_original": "Bob", "embedding": None,
                 "provenance_raw": "test", "event_time": ts, "capture_time": ts,
                 "custody": "test", "needs_review": False},
            ],
            relaciones=[
                {"origen_id": "A", "destino_id": "B", "relacion": "KNOWS",
                 "provenance": "test", "event_time": ts, "capture_time": ts,
                 "custody": "test", "object_kind": "entity"},
            ],
            source_triplet={
                "origen": "test", "driver": "pytest", "timestamp": ts,
                "event_time": ts, "capture_time": ts, "custody": "test",
                "metadata": {},
            },
            io_id="io-delete-runtime",
            timestamp=ts,
        )

        before_revision = memoria.get_graph_revision()
        embeddings.rebuild_index(memoria, before_revision)
        ids_before = json.loads(map_file.read_text(encoding="utf-8"))
        assert {"A", "B"}.issubset(ids_before)
        assert json.loads(meta_file.read_text(encoding="utf-8"))["invalidated"] is False

        acta = memoria.olvidar("io-delete-runtime")
        assert len(acta) == 64

        after_revision = memoria.get_graph_revision()
        assert after_revision != before_revision

        from khora_kernel.communities import _semantic_projection
        semantic_graph, semantic_manifest = _semantic_projection(memoria)
        assert "KEEP" in semantic_graph.nodes(), (
            f"KEEP existe en Neo4j pero no entra a la proyección: "
            f"nodes={sorted(semantic_graph.nodes())}; manifest={semantic_manifest}"
        )
        assert semantic_manifest["vertex_count"] >= 1

        with memoria._driver.session() as session:
            assert session.run("MATCH (io:InformationObject {io_id:$id}) RETURN count(io) AS n", id="io-delete-runtime").single()["n"] == 0
            assert session.run("MATCH (e:Entity {canonical_key:'A'}) RETURN count(e) AS n").single()["n"] == 0
            assert session.run("MATCH (e:Entity {canonical_key:'B'}) RETURN count(e) AS n").single()["n"] == 0
            assert session.run("MATCH ()-[r:RELATION {io_id:$id}]->() RETURN count(r) AS n", id="io-delete-runtime").single()["n"] == 0
            assert session.run("MATCH (c:Community) RETURN count(c) AS n").single()["n"] == 0

        ids_after = json.loads(map_file.read_text(encoding="utf-8"))
        assert "A" not in ids_after and "B" not in ids_after
        meta_after = json.loads(meta_file.read_text(encoding="utf-8"))
        assert meta_after["invalidated"] is False
        assert meta_after["graph_revision"] == after_revision
    finally:
        try:
            with memoria._driver.session() as session:
                session.run("MATCH (n) DETACH DELETE n")
        finally:
            memoria.cerrar()


def test_olvidar_runtime_regenera_comunidades_y_resumenes(neo4j_config, monkeypatch, tmp_path):
    monkeypatch.setenv("KHORA_FSUM_AUTO", "1")
    index_file = tmp_path / "pkg.idx"
    map_file = tmp_path / "pkg_map.json"
    meta_file = tmp_path / "pkg_map_meta.json"
    text_file = tmp_path / "pkg_map_texts.json"
    monkeypatch.setattr(embeddings, "INDEX_FILE", index_file)
    monkeypatch.setattr(embeddings, "MAP_FILE", map_file)
    monkeypatch.setattr(embeddings, "META_FILE", meta_file)
    monkeypatch.setattr(embeddings, "TEXT_FILE", text_file)

    summary_calls = []
    def fake_summarize_all(memoria, provider, graph_revision):
        summary_calls.append(graph_revision)
        return None
    monkeypatch.setattr("khora_kernel.summaries.summarize_all", fake_summarize_all)

    memoria = Neo4jMemoriaOrganizada(
        neo4j_config["uri"], neo4j_config["user"], neo4j_config["password"]
    )
    try:
        with memoria._driver.session() as session:
            session.run("MATCH (n) DETACH DELETE n")

        def ingest_entity(io_id, entity_id):
            ts = "2026-10-02T20:00:00Z"
            memoria.asentar_transaccional(
                entidades=[{
                    "canonical_key": entity_id, "label_original": entity_id,
                    "embedding": None, "provenance_raw": "test",
                    "event_time": ts, "capture_time": ts, "custody": "test",
                    "needs_review": False,
                }],
                relaciones=[],
                source_triplet={
                    "origen": "test", "driver": "pytest", "timestamp": ts,
                    "event_time": ts, "capture_time": ts, "custody": "test",
                    "metadata": {},
                },
                io_id=io_id,
                timestamp=ts,
            )

        ingest_entity("io-keep", "KEEP")
        ingest_entity("io-delete", "DELETE")

        before_revision = memoria.get_graph_revision()
        embeddings.rebuild_index(memoria, before_revision)
        assert {"KEEP", "DELETE"}.issubset(
            json.loads(map_file.read_text(encoding="utf-8"))
        )

        acta = memoria.olvidar("io-delete")
        assert len(acta) == 64

        after_revision = memoria.get_graph_revision()
        assert after_revision != before_revision

        with memoria._driver.session() as session:
            assert session.run(
                "MATCH (e:Entity {canonical_key:'DELETE'}) RETURN count(e) AS n"
            ).single()["n"] == 0
            assert session.run(
                "MATCH (e:Entity {canonical_key:'KEEP'}) RETURN count(e) AS n"
            ).single()["n"] == 1
            publication_rows = session.run(
                """
                MATCH (c:Community)
                RETURN c.community_id AS id,
                       c.graph_revision AS revision,
                       c.published AS published,
                       c.invalid_at AS invalid_at
                ORDER BY id
                """
            )
            publications = [dict(row) for row in publication_rows]
            assert publications, f"No communities after delete: {publications}"

            active_publications = [
                row for row in publications
                if row["invalid_at"] is None and row["published"] is True
            ]
            assert active_publications, (
                f"Communities regenerated but not published: "
                f"expected_revision={after_revision}; rows={publications}"
            )
            assert session.run(
                """
                MATCH (e:Entity {canonical_key:'KEEP'})-[:IN_COMMUNITY]->(c:Community)
                WHERE c.invalid_at IS NULL AND c.published = true
                RETURN count(c) AS n
                """
            ).single()["n"] == 1

        ids_after = json.loads(map_file.read_text(encoding="utf-8"))
        assert "DELETE" not in ids_after
        assert "KEEP" in ids_after
        meta_after = json.loads(meta_file.read_text(encoding="utf-8"))
        assert meta_after["invalidated"] is False
        assert meta_after["graph_revision"] == after_revision
        assert summary_calls == [after_revision]
    finally:
        with memoria._driver.session() as session:
            session.run("MATCH (n) DETACH DELETE n")
        memoria.cerrar()
