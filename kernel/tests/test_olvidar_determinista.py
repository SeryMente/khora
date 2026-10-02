# @l0 L0-002-R · @req KA-00/REQ-2 · @acr ACR-2.1
from unittest.mock import MagicMock

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
