import sqlite3
from pathlib import Path

import pytest

from khora_kernel.api import (
    ContextoDeVisibilidad,
    NivelSuficiencia,
)
from khora_kernel.consulta.retriever import RetrieverGraphRAG


@pytest.fixture
def retriever(tmp_path: Path) -> RetrieverGraphRAG:
    ret = RetrieverGraphRAG(corpus_path=tmp_path)

    # Poblar base de datos mock simulando tubería real de ingesta
    db_path = tmp_path / "corpus.db"
    with sqlite3.connect(db_path) as conn:
        conn.execute(
            """
            INSERT INTO fragmentos (id, texto, origen, timestamp, visibilidad)
            VALUES
            ('1', 'Khora es un motor open source.', 'archivo', '2026-07-18T00:00:00Z', 'transparente'),
            ('2', 'El password secreto de prod es 1234.', 'chat', '2026-07-18T00:01:00Z', 'privado'),
            ('3', 'Gravedad es el puerto que maneja el almacenamiento en Khora.', 'archivo', '2026-07-18T00:02:00Z', 'transparente')
            """
        )
    return ret


def test_provenance(retriever: RetrieverGraphRAG):
    """test_provenance: todo fragmento devuelto resuelve a un origen real."""
    resultado = retriever.consultar("Khora open source", ContextoDeVisibilidad.TRANSPARENTE)

    assert resultado.suficiencia == NivelSuficiencia.SUFICIENTE
    assert len(resultado.fragmentos) > 0

    for frag in resultado.fragmentos:
        assert frag.provenance.origen in ["archivo", "chat"]
        assert frag.provenance.timestamp.startswith("2026")


def test_particion_visibilidad(retriever: RetrieverGraphRAG):
    """test_particion_visibilidad: contexto transparente -> cero fragmentos privados."""
    # Consultamos algo que en la bd mockeada existe tanto en privado como transparente ("secreto" vs nada, "Khora" sí)

    # 1. Contexto transparente (NO debe ver el id '2' que tiene la palabra secreto)
    res_transparente = retriever.consultar("Khora password secreto", ContextoDeVisibilidad.TRANSPARENTE)

    for frag in res_transparente.fragmentos:
        assert frag.visibilidad == ContextoDeVisibilidad.TRANSPARENTE
        assert frag.id != '2'

    # 2. Contexto privado (SÍ debe ver el id '2' y los demás)
    res_privado = retriever.consultar("password secreto Khora", ContextoDeVisibilidad.PRIVADO)
    ids_privado = [f.id for f in res_privado.fragmentos]

    assert '2' in ids_privado
    assert len(ids_privado) > len(res_transparente.fragmentos)


def test_subgrafo(retriever: RetrieverGraphRAG):
    """test_subgrafo: fragmentos/subgrafo correctos de forma determinista."""
    res = retriever.consultar("Gravedad Khora", ContextoDeVisibilidad.TRANSPARENTE)

    assert res.suficiencia == NivelSuficiencia.SUFICIENTE

    # Verificamos que contenga fragmentos
    assert len(res.fragmentos) > 0

    # Verificamos estructura del subgrafo
    assert len(res.subgrafo.nodos) == len(res.fragmentos)

    # Aristas deben ser n-1 donde n = nodos
    if len(res.subgrafo.nodos) > 1:
        assert len(res.subgrafo.aristas) == len(res.subgrafo.nodos) - 1

    # No inventó resúmenes porque no hay
    assert res.resumenes_incluidos is False


def test_insuficiente(retriever: RetrieverGraphRAG):
    """test_insuficiente: pregunta sin respaldo -> vacío explícito con Insuficiente, cero invención."""
    res = retriever.consultar("Bitcoin ethereum blockchain", ContextoDeVisibilidad.PRIVADO)

    assert res.suficiencia == NivelSuficiencia.INSUFICIENTE
    assert len(res.fragmentos) == 0
    assert len(res.subgrafo.nodos) == 0
    assert len(res.subgrafo.aristas) == 0
    assert res.resumenes_incluidos is False
