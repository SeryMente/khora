from dataclasses import dataclass, field
from enum import Enum
from typing import List, Protocol


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
    nodos: List[NodoSubgrafo] = field(default_factory=lambda: [])
    aristas: List[AristaSubgrafo] = field(default_factory=lambda: [])


@dataclass(frozen=True)
class ResultadoDeConsulta:
    fragmentos: List[EntidadIngresada]
    subgrafo: SubgrafoRelevante
    suficiencia: NivelSuficiencia
    resumenes_incluidos: bool


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


VERSION = "0.1.0"
