# @l0 L0-002 · @req KA-00/REQ-2 · @acr ACR-2.1

import pytest

from khora_kernel.api import (
    Provenance,
    PuertoEmbeddings,
    PuertoLLM,
    RespuestaLLM,
    SolicitudLLM,
    Triple,
)
from khora_kernel.resolucion._resolver import resolver


class MockMemoria:
    def __init__(self):
        self.entidades = {}

    def buscar_entidades_candidatas(self, canonical_key: str):
        # En la vida real busca por clave y por embeddings.
        # Aquí simplificamos devolviendo todos para que el mock embeddings los filtre si quiere,
        # o devolviendo los que coincidan.
        res = []
        for v in self.entidades.values():
            res.append(v)
        return res

    def merge_entidad(self, canonical_key: str, label_original: str, provenance_raw: str, embedding: list[float], needs_review: bool = False) -> None:
        if canonical_key in self.entidades:
            if provenance_raw not in self.entidades[canonical_key]["provenance"]:
                self.entidades[canonical_key]["provenance"].append(provenance_raw)
        else:
            self.entidades[canonical_key] = {
                "canonical_key": canonical_key,
                "label_original": label_original,
                "embedding": embedding,
                "provenance": [provenance_raw],
                "needs_review": needs_review
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
        # LLM no se usa más en resolver, mock no debería ser llamado.
        return RespuestaLLM(texto="NEW", modelo="mock", provenance=Provenance(origen="mock", driver=None, timestamp=""))

def _prov():
    return Provenance(origen="test", driver="test", timestamp="2026-07-19T00:00:00Z")

def test_no_fusion():
    memoria = MockMemoria()
    llm = MockPuertoLLM()
    emb = MockPuertoEmbeddings()

    triples = [
        Triple("1", "Sarah Connor", "Target", "protects", _prov(), {}, valid_at="2026-07-19T00:00:00Z", invalid_at=None, created_at="2026-07-19T00:00:00Z"),
        Triple("2", "Sarah", "Target", "protects", _prov(), {}, valid_at="2026-07-19T00:00:00Z", invalid_at=None, created_at="2026-07-19T00:00:00Z")
    ]

    resolver(triples, memoria, llm, emb)

    # Ahora no hay fusión, debe haber 3 entidades
    assert len(memoria.entidades) == 3
    assert "sarah_connor" in memoria.entidades
    assert "target" in memoria.entidades
    assert "sarah" in memoria.entidades

def test_sufijo_determinista():
    memoria = MockMemoria()
    emb = MockPuertoEmbeddings()
    llm = MockPuertoLLM()

    memoria.merge_entidad("john", "John", "prov", [0.0, 1.0])

    triples1 = [Triple("1", "John", "Y", "rel", _prov(), {}, valid_at="2026-07-19T00:00:00Z", invalid_at=None, created_at="2026-07-19T00:00:00Z")]
    resolver(triples1, memoria, llm, emb)

    triples2 = [Triple("2", "John", "Y", "rel", _prov(), {}, valid_at="2026-07-19T00:00:00Z", invalid_at=None, created_at="2026-07-19T00:00:00Z")]
    memoria2 = MockMemoria()
    memoria2.merge_entidad("john", "John", "prov", [0.0, 1.0])
    resolver(triples2, memoria2, llm, emb)

    entidades1 = list(memoria.entidades.keys())
    entidades2 = list(memoria2.entidades.keys())

    johns_con_sufijo1 = [k for k in entidades1 if k.startswith("john_")]
    johns_con_sufijo2 = [k for k in entidades2 if k.startswith("john_")]

    assert len(johns_con_sufijo1) == 1
    assert len(johns_con_sufijo2) == 1
    assert johns_con_sufijo1[0] == johns_con_sufijo2[0]

@pytest.mark.xfail(strict=True, reason="0 duplicados sobre data/golden/j8_pares.jsonl.")
def test_golden():
    with open("data/golden/j8_pares.jsonl", "r") as f:
        content = f.read().strip()
    if not content:
        raise AssertionError("No hay datos reales para golden set")
