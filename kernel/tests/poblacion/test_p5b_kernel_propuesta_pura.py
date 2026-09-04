# @l0 L0-002-R · @req ING-03/REQ-CONTRACT
"""
Pruebas E2E y de unidad para la Tarea Prompt 5B (Kernel proponente sin escrituras).
Verifica driver espía de cero escrituras en proponer, ratificación, transacción única,
rollback, idempotencia y rechazo de propuestas no ratificadas.
"""

from dataclasses import asdict
from datetime import datetime, timezone
import uuid
import pytest

from khora_kernel.contracts.proposal import item_to_canonical_dict

from khora_kernel.api import (
    ObjetoDeInformacion,
    Provenance,
    PuertoEmbeddings,
    PuertoLLM,
    RespuestaLLM,
    SolicitudLLM,
)
from khora_kernel.contracts.proposal import (
    ProposalEnvelope,
    validate_proposal_envelope,
)
from khora_kernel.poblacion import (
    asentar,
    proponer,
    ratificar_propuesta,
)


class SpyMemoriaEscrituraProhibida:
    """
    Driver espía que FALLA inmediatamente ante cualquier llamada a un método de escritura.
    """

    def __init__(self):
        self.entidades = {}
        self.consultas_realizadas = []

    def buscar_entidades_candidatas(self, label_norm: str):
        self.consultas_realizadas.append(("read", label_norm))
        res = []
        for v in self.entidades.values():
            res.append(v)
        return res

    def merge_entidad(self, *args, **kwargs):
        raise RuntimeError("VIOLACIÓN DE CONTRATO: Intento de escritura 'merge_entidad' durante proponer/transducir.")

    def escribir_ingesta(self, *args, **kwargs):
        raise RuntimeError("VIOLACIÓN DE CONTRATO: Intento de escritura 'escribir_ingesta' durante proponer/transducir.")

    def fusionar_ingesta(self, *args, **kwargs):
        raise RuntimeError("VIOLACIÓN DE CONTRATO: Intento de escritura 'fusionar_ingesta' durante proponer/transducir.")

    def asentar_transaccional(self, *args, **kwargs):
        raise RuntimeError("VIOLACIÓN DE CONTRATO: Intento de escritura 'asentar_transaccional' durante proponer.")


class MemoriaPruebasConTransaccion:
    """
    Simulador de memoria con soporte de transacción atómica y detección de violaciones.
    """

    def __init__(self):
        self.entidades = {}
        self.relaciones = []
        self.asentamientos = []
        self.simular_error_constraint = False

    def buscar_entidades_candidatas(self, label_norm: str):
        return [v for v in self.entidades.values() if v["canonical_key"] == label_norm]

    def asentar_transaccional(
        self,
        entidades: list[dict],
        relaciones: list[dict],
        source_triplet: dict,
        io_id: str,
        timestamp: str,
    ) -> int:
        if self.simular_error_constraint:
            # Simular rollback total sin cambiar estado
            raise ValueError("Violación de restricción simulada en transacción única: rollback de todo.")

        # Verificar terna existente
        for asen in self.asentamientos:
            if asen["io_id"] == io_id:
                if asen["source_triplet"] == source_triplet:
                    return 0  # Idempotente
                raise Exception(f"Conflicto terna io_id={io_id}")

        for e in entidades:
            ckey = e["canonical_key"]
            if ckey in self.entidades:
                self.entidades[ckey]["provenance"].append(e["provenance_raw"])
            else:
                self.entidades[ckey] = {
                    "canonical_key": ckey,
                    "label_original": e["label_original"],
                    "provenance": [e["provenance_raw"]],
                    "needs_review": e["needs_review"],
                }

        for r in relaciones:
            self.relaciones.append(r)

        self.asentamientos.append({
            "io_id": io_id,
            "source_triplet": source_triplet,
            "timestamp": timestamp,
        })

        return len(relaciones)


class MockPuertoEmbeddings(PuertoEmbeddings):
    def __init__(self):
        self.llamado = False

    def incrustar(self, textos: list[str]) -> list[list[float]]:
        self.llamado = True
        return [[0.5, 0.5] for _ in textos]


class MockPuertoLLM(PuertoLLM):
    def generar(self, solicitud: SolicitudLLM) -> RespuestaLLM:
        # Mock de extracción NER en CSV
        texto_mock = "Sarah Connor, protects, John Connor, Persona\nJohn Connor, lives_in, Los Angeles, Lugar"
        return RespuestaLLM(
            texto=texto_mock,
            modelo="mock-model",
            provenance=Provenance(origen="mock", driver="test", timestamp=datetime.now(timezone.utc).isoformat()),
        )


def _crear_objeto_test():
    prov = Provenance(origen="dictado", driver="test", timestamp=datetime.now(timezone.utc).isoformat())
    v_id = str(uuid.uuid4())
    return ObjetoDeInformacion(
        id=f"io-{v_id}",
        texto="Sarah Connor protege a John Connor en Los Ángeles.",
        provenance=prov,
        metadata={
            "volcado_id": v_id,
            "version": "1",
            "sha256": "a" * 64,
        },
    )


def test_driver_espia_falla_ante_cualquier_escritura_durante_proponer():
    memoria_espia = SpyMemoriaEscrituraProhibida()
    llm = MockPuertoLLM()
    emb = MockPuertoEmbeddings()
    obj = _crear_objeto_test()

    # proponer debe completar con CERO escrituras y sin lanzar RuntimeError del espía
    envelope = proponer(obj, memoria_espia, llm, emb)

    assert isinstance(envelope, ProposalEnvelope)
    assert len(envelope.items) > 0

    # Convertir a dict serializable para validate_proposal_envelope
    env_dict = {
        "schema_version": envelope.schema_version,
        "source_triplet": asdict(envelope.source_triplet),
        "pipeline_version": envelope.pipeline_version,
        "payload_hash": envelope.payload_hash,
        "created_at": envelope.created_at,
        "updated_at": envelope.updated_at,
        "items": [item_to_canonical_dict(it) for it in envelope.items],
        "judgments": [asdict(j) for j in envelope.judgments],
        "settlement_act": asdict(envelope.settlement_act) if envelope.settlement_act else None,
    }

    valido, errores = validate_proposal_envelope(env_dict)
    assert valido, f"Envelope inválido: {errores}"
    assert len(envelope.judgments) == 0  # Sin juicios inicialmente


def test_propuesta_no_ratificada_rechazada_al_asentar():
    memoria = MemoriaPruebasConTransaccion()
    llm = MockPuertoLLM()
    emb = MockPuertoEmbeddings()
    obj = _crear_objeto_test()

    envelope = proponer(obj, memoria, llm, emb)

    # Debe fallar si se intenta asentar una propuesta sin juicios (judgments)
    with pytest.raises(ValueError, match="Propuesta no ratificada"):
        asentar(envelope, memoria, llm, emb)


def test_asentar_exitoso_tras_ratificacion_y_transaccion_unica():
    memoria = MemoriaPruebasConTransaccion()
    llm = MockPuertoLLM()
    emb = MockPuertoEmbeddings()
    obj = _crear_objeto_test()

    envelope = proponer(obj, memoria, llm, emb)
    assert len(memoria.entidades) == 0  # Cero escrituras antes

    ratificada = ratificar_propuesta(envelope, actor="operador_test")
    acta = asentar(ratificada, memoria, llm, emb)

    assert acta.triples_escritos > 0
    assert len(memoria.entidades) > 0
    assert len(memoria.asentamientos) == 1


test_rollback_en_transaccion_unica_si_falla_constraint = None


def test_rollback_en_transaccion_unica_si_falla_constraint():
    memoria = MemoriaPruebasConTransaccion()
    memoria.simular_error_constraint = True
    llm = MockPuertoLLM()
    emb = MockPuertoEmbeddings()
    obj = _crear_objeto_test()

    envelope = proponer(obj, memoria, llm, emb)
    ratificada = ratificar_propuesta(envelope)

    with pytest.raises(ValueError, match="Violación de restricción simulada"):
        asentar(ratificada, memoria, llm, emb)

    # Verificar rollback: cero entidades guardadas
    assert len(memoria.entidades) == 0
    assert len(memoria.relaciones) == 0


def test_idempotencia_y_conflicto_de_terna():
    memoria = MemoriaPruebasConTransaccion()
    llm = MockPuertoLLM()
    emb = MockPuertoEmbeddings()
    obj = _crear_objeto_test()

    envelope1 = proponer(obj, memoria, llm, emb)
    ratificada1 = ratificar_propuesta(envelope1)
    acta1 = asentar(ratificada1, memoria, llm, emb)

    assert acta1.triples_escritos > 0

    # Segunda ingesta idéntica -> Idempotente (devuelve 0 triples nuevos)
    acta2 = asentar(ratificada1, memoria, llm, emb)
    assert acta2.triples_escritos == 0

    # Conflicto de terna: mismo io_id pero terna diferente
    obj_conflicto = ObjetoDeInformacion(
        id=obj.id,
        texto="Texto modificado.",
        provenance=obj.provenance,
        metadata={
            "volcado_id": obj.metadata["volcado_id"],
            "version": "2",  # versión diferente
            "sha256": "b" * 64,
        },
    )
    env_conflicto = proponer(obj_conflicto, memoria, llm, emb)
    rat_conflicto = ratificar_propuesta(env_conflicto)

    with pytest.raises(Exception, match="Conflicto terna"):
        asentar(rat_conflicto, memoria, llm, emb)
