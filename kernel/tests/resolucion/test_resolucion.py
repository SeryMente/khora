# @l0 L0-002 · @req KA-00/REQ-2 · @acr ACR-2.1

import os

import pytest

from khora_kernel.api import (
    Provenance,
    PuertoEmbeddings,
    PuertoLLM,
    RespuestaLLM,
    SolicitudLLM,
    Triple,
)
from khora_kernel.resolucion._resolver import (
    _normalizar_label,
    _quitar_articulo_inicial,
    resolver,
)


class MockMemoria:
    def __init__(self):
        self.entidades = {}

    def buscar_entidades_candidatas(self, canonical_key: str):
        res = []
        for v in self.entidades.values():
            res.append(v)
        return res

    def merge_entidad(self, canonical_key: str, label_original: str, provenance_raw: str, embedding: list[float], needs_review: bool = False) -> None:
        if canonical_key in self.entidades:
            if provenance_raw not in self.entidades[canonical_key]["provenance"]:
                self.entidades[canonical_key]["provenance"].append(provenance_raw)
            self.entidades[canonical_key]["needs_review"] = needs_review
        else:
            self.entidades[canonical_key] = {
                "canonical_key": canonical_key,
                "label_original": label_original,
                "embedding": embedding,
                "provenance": [provenance_raw],
                "needs_review": needs_review,
            }


class MockPuertoEmbeddings(PuertoEmbeddings):
    def incrustar(self, textos: list[str]) -> list[list[float]]:
        res = []
        for t in textos:
            if "sarah" in t.lower():
                res.append([1.0, 0.0])
            elif "john" in t.lower():
                res.append([0.0, 1.0])
            else:
                res.append([0.707, 0.707])
        return res


class MockPuertoLLM(PuertoLLM):
    def generar(self, solicitud: SolicitudLLM) -> RespuestaLLM:
        return RespuestaLLM(texto="NEW", modelo="mock", provenance=Provenance(origen="mock", driver=None, timestamp=""))


def _prov():
    return Provenance(origen="test", driver="test", timestamp="2026-07-19T00:00:00Z")


def test_quitar_articulo_inicial():
    # 1. Con artículo
    assert _quitar_articulo_inicial("la memoria continua") == "memoria continua"
    assert _quitar_articulo_inicial("EL OPERADOR") == "OPERADOR"
    assert _quitar_articulo_inicial("Los datos") == "datos"
    assert _quitar_articulo_inicial("Unas personas") == "personas"

    # 2. Sin artículo
    assert _quitar_articulo_inicial("memoria continua") == "memoria continua"
    assert _quitar_articulo_inicial("sistema khora") == "sistema khora"

    # 3. Artículo que es parte de otra palabra (límite de palabra)
    assert _quitar_articulo_inicial("Elena") == "Elena"
    assert _quitar_articulo_inicial("Lazo") == "Lazo"
    assert _quitar_articulo_inicial("Universidad") == "Universidad"

    # Verificación de normalización idéntica con/sin artículo
    assert _normalizar_label("la memoria continua") == _normalizar_label("memoria continua") == "memoria_continua"


def test_autorreferencia():
    memoria = MockMemoria()
    emb = MockPuertoEmbeddings()
    llm = MockPuertoLLM()

    os.environ["KHORA_OPERADOR_CANONICAL_KEY"] = "Juan Pérez"
    try:
        triples = [
            Triple("1", "yo", "sistema", "opera", _prov(), {}, valid_at="2026-07-19T00:00:00Z", invalid_at=None, created_at="2026-07-19T00:00:00Z"),
            Triple("2", "juan perez", "khora", "gestiona", _prov(), {}, valid_at="2026-07-19T00:00:00Z", invalid_at=None, created_at="2026-07-19T00:00:00Z"),
            Triple("3", "mi", "cuenta", "posee", _prov(), {}, valid_at="2026-07-19T00:00:00Z", invalid_at=None, created_at="2026-07-19T00:00:00Z"),
        ]

        resueltos = resolver(triples, memoria, llm, emb)

        # Todas las autorreferencias deben mapear a "Juan Pérez"
        assert resueltos[0].origen_id == "Juan Pérez"
        assert resueltos[1].origen_id == "Juan Pérez"
        assert resueltos[2].origen_id == "Juan Pérez"
        # Memoria sigue intacta (READ-ONLY)
        assert len(memoria.entidades) == 0
        assert "yo" in resueltos.entidades
        assert resueltos.entidades["yo"].canonical_key == "Juan Pérez"
    finally:
        del os.environ["KHORA_OPERADOR_CANONICAL_KEY"]


def test_fusion_real_coincidencia_exacta():
    memoria = MockMemoria()
    emb = MockPuertoEmbeddings()
    llm = MockPuertoLLM()

    # Pre-cargar entidad en memoria con canonical_key "john"
    memoria.merge_entidad("john", "John", "prov_inicial", [0.0, 1.0], needs_review=True)

    triples1 = [Triple("1", "John", "Y", "rel", _prov(), {}, valid_at="2026-07-19T00:00:00Z", invalid_at=None, created_at="2026-07-19T00:00:00Z")]
    resueltos = resolver(triples1, memoria, llm, emb)

    # Debe reutilizar "john" exactamente sin modificar la memoria durante la resolución
    assert resueltos[0].origen_id == "john"
    assert "john" in memoria.entidades
    assert len(memoria.entidades) == 1  # Solo la precargada, ninguna nueva escrita
    assert resueltos.entidades["John"].decision == "MERGE"
    assert resueltos.entidades["John"].needs_review is False


def test_no_fusion():
    memoria = MockMemoria()
    llm = MockPuertoLLM()
    emb = MockPuertoEmbeddings()

    triples = [
        Triple("1", "Sarah Connor", "Target", "protects", _prov(), {}, valid_at="2026-07-19T00:00:00Z", invalid_at=None, created_at="2026-07-19T00:00:00Z"),
        Triple("2", "Sarah", "Target", "protects", _prov(), {}, valid_at="2026-07-19T00:00:00Z", invalid_at=None, created_at="2026-07-19T00:00:00Z")
    ]

    resueltos = resolver(triples, memoria, llm, emb)

    # Cero escrituras en memoria
    assert len(memoria.entidades) == 0
    assert "Sarah Connor" in resueltos.entidades
    assert "Target" in resueltos.entidades
    assert "Sarah" in resueltos.entidades
    assert resueltos.entidades["Sarah Connor"].decision == "NEW"


@pytest.mark.xfail(strict=True, reason="0 duplicados sobre data/golden/j8_pares.jsonl.")
def test_golden():
    with open("data/golden/j8_pares.jsonl", "r") as f:
        content = f.read().strip()
    if not content:
        raise AssertionError("No hay datos reales para golden set")
