from dataclasses import dataclass
from enum import Enum
from typing import Protocol


class ContextoDeVisibilidad(Enum):
    PRIVADO = "privado"
    TRANSPARENTE = "transparente"


@dataclass(frozen=True)
class Provenance:
    origen: str          # "chat" | "dictado" | "archivo" | etc.
    driver: str | None   # None si es ingesta directa
    timestamp: str       # ISO-8601


@dataclass(frozen=True)
class EntidadIngresada:
    id: str
    texto: str
    provenance: Provenance
    visibilidad: ContextoDeVisibilidad


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
        query: str,
        contexto: ContextoDeVisibilidad,
    ) -> list[EntidadIngresada]: ...


class MotorDeOlvido(Protocol):
    def olvidar(self, id: str) -> str: ...   # retorna acta de olvido


VERSION = "0.1.0"
