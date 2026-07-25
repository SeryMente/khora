# @l0 L0-002 · @req ING-01/REQ-1 · @acr ACR-1.1,ACR-1.2,ACR-1.3 · @ua UA-06
from dataclasses import dataclass, field
from enum import Enum
from typing import List, Protocol, runtime_checkable


class ContextoDeVisibilidad(Enum):
    PRIVADO = "privado"
    TRANSPARENTE = "transparente"


class NivelSuficiencia(Enum):
    SUFICIENTE = "suficiente"
    INSUFICIENTE = "insuficiente"


@dataclass(frozen=True)
class Provenance:
    origen: str  # "chat" | "dictado" | "archivo" | etc.
    driver: str | None  # None si es ingesta directa
    timestamp: str  # ISO-8601


@dataclass(frozen=True)
class EntidadIngresada:
    id: str
    texto: str
    provenance: Provenance
    visibilidad: ContextoDeVisibilidad


@dataclass(frozen=True)
class ObjetoDeInformacion:
    id: str
    texto: str
    provenance: Provenance
    metadata: dict[str, str]


@dataclass(frozen=True)
class Triple:
    id: str
    origen_id: str
    destino_id: str
    relacion: str
    provenance: Provenance
    metadata: dict[str, str]
    valid_at: str
    invalid_at: str | None
    created_at: str


@dataclass(frozen=True)
class NodoSubgrafo:
    id: str
    etiqueta: str


@dataclass(frozen=True)
class AristaSubgrafo:
    origen: str
    destino: str
    relacion: str


@dataclass(frozen=True)
class SubgrafoRelevante:
    nodos: List[NodoSubgrafo] = field(default_factory=list)
    aristas: List[AristaSubgrafo] = field(default_factory=list)


@dataclass(frozen=True)
class ResultadoDeConsulta:
    fragmentos: List[EntidadIngresada]
    subgrafo: SubgrafoRelevante
    suficiencia: NivelSuficiencia
    resumenes_incluidos: bool
    degradacion_declarada: str | None = None


class MotorDeIngesta(Protocol):
    def ingestar(
        self,
        texto: str,
        provenance: Provenance,
        visibilidad: ContextoDeVisibilidad = ContextoDeVisibilidad.PRIVADO,
    ) -> EntidadIngresada: ...


class MotorDeConsulta(Protocol):
    def consultar(
        self,
        pregunta: str,
        contexto: ContextoDeVisibilidad,
    ) -> ResultadoDeConsulta: ...


class MotorDeOlvido(Protocol):
    def olvidar(self, id: str) -> str: ...  # retorna acta de olvido


@dataclass(frozen=True)
class SolicitudLLM:
    prompt: str
    sistema: str | None
    formato_estricto: tuple[str, ...] | None
    metadata: dict
    imagenes_base64: list[str] | None = None


@dataclass(frozen=True)
class RespuestaLLM:
    texto: str
    modelo: str
    provenance: Provenance


@runtime_checkable
class PuertoLLM(Protocol):
    def generar(self, solicitud: SolicitudLLM) -> RespuestaLLM: ...


@runtime_checkable
class PuertoEmbeddings(Protocol):
    def incrustar(self, textos: list[str]) -> list[list[float]]: ...


@runtime_checkable
class PuertoVision(Protocol):
    def extraer_evidencia(self, referencia: str) -> str: ...


@dataclass(frozen=True)
class ActaDeIngesta:
    origen: str
    timestamp: str
    ideas_novedosas: int
    ideas_repetidas: int
    matices: int
    needs_review: int
    triples_escritos: int
    linea_temporal_indexada: bool

VERSION = "0.1.0"

__all__ = [
    "ActaDeIngesta",
    "ContextoDeVisibilidad",
    "NivelSuficiencia",
    "Provenance",
    "EntidadIngresada",
    "ObjetoDeInformacion",
    "Triple",
    "NodoSubgrafo",
    "AristaSubgrafo",
    "SubgrafoRelevante",
    "ResultadoDeConsulta",
    "MotorDeIngesta",
    "MotorDeConsulta",
    "MotorDeOlvido",
    "SolicitudLLM",
    "RespuestaLLM",
    "PuertoLLM",
    "PuertoEmbeddings",
    "PuertoVision",
    "VERSION",
]
