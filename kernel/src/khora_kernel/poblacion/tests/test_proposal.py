# @l0 L0-002-R · @req JULES-3/REQ-3
import uuid

from khora_kernel.api import (
    ActaDeIngesta,
    ObjetoDeInformacion,
    Proposal,
    Provenance,
    Triple,
)
from khora_kernel.poblacion import ingestar, persistir, transducir
from khora_kernel.poblacion.tests.test_ingestar import (
    MockMemoria,
    MockPuertoEmbeddings,
    MockPuertoLLM,
)


def test_proposal_lifecycle_and_requirements():
    # Setup mocks
    memoria = MockMemoria()
    llm = MockPuertoLLM({})
    embeddings = MockPuertoEmbeddings()

    # Create dummy raw information object representing a volcado dump
    volcado_id = str(uuid.uuid4())
    version = 2
    sha = "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855" # empty string sha256 as sample

    prov = Provenance("archivo", "test", "2026-07-19T10:00:00Z")
    obj = ObjetoDeInformacion(
        id="io-uuid-1234",
        texto="Juan likes Pizza. Pizza is food.",
        provenance=prov,
        metadata={
            "volcado_id": volcado_id,
            "version": str(version),
            "sha256": sha,
        }
    )

    # 1. Test extraction produces Proposal
    proposal = transducir(obj, memoria, llm)
    assert isinstance(proposal, Proposal)

    # 2. Proposal contains provenance
    assert proposal.provenance == prov
    assert proposal.source == obj

    # 3. Proposal contains expected direct meta attributes
    assert proposal.volcado_id == volcado_id
    assert proposal.version == version
    assert proposal.sha256 == sha
    assert proposal.io_id == "io-uuid-1234"

    # 4. Proposal conserves entities
    assert len(proposal.entities) > 0
    # From MockPuertoLLM: User, Juan, Pizza
    assert "User" in proposal.entities
    assert "Juan" in proposal.entities
    assert "Pizza" in proposal.entities

    # 5. Proposal conserves relations (as Triples)
    assert len(proposal.relations) > 0
    for r in proposal.relations:
        assert isinstance(r, Triple)
        assert r.provenance == prov or r.provenance.driver == "fKGC"

    # 8. Verification: A Proposal does not modify the graph on its own!
    # No items should be added to our mock memory triples list just by creating the proposal
    assert len(memoria.triples) == 0

    # 9. Explicit persistence of Proposal does write to graph (and produces writing of triples)
    acta = persistir(proposal, memoria, llm, embeddings)
    assert isinstance(acta, ActaDeIngesta)
    assert acta.triples_escritos > 0
    assert len(memoria.triples) > 0

    # 10. Direct ingestion (the old path) still works identically (using transducir + persistir internally)
    memoria_new = MockMemoria()
    acta_ingesta_directa = ingestar(obj, memoria_new, llm, embeddings)
    assert isinstance(acta_ingesta_directa, ActaDeIngesta)
    assert acta_ingesta_directa.triples_escritos > 0
    assert len(memoria_new.triples) > 0


def test_no_double_extraction_during_ingestion(monkeypatch):
    """
    Test requirement 7: Ensure extraction is not executed twice.
    """
    import khora_kernel.poblacion._ingestar as ingestar_mod

    extracted_count = 0
    original_transducir = ingestar_mod.transducir

    def spy_transducir(*args, **kwargs):
        nonlocal extracted_count
        extracted_count += 1
        return original_transducir(*args, **kwargs)

    monkeypatch.setattr(ingestar_mod, "transducir", spy_transducir)

    memoria = MockMemoria()
    llm = MockPuertoLLM({})
    embeddings = MockPuertoEmbeddings()

    obj = ObjetoDeInformacion(
        id="io-uniq",
        texto="Unique text element",
        provenance=Provenance("archivo", "test", "2026-07-19T10:00:00Z"),
        metadata={}
    )

    # Performing full ingestion (transducir + persistir internally)
    ingestar(obj, memoria, llm, embeddings)

    # Ensure transducir was called exactly once!
    assert extracted_count == 1
