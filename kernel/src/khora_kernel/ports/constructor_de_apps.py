import typing
from dataclasses import dataclass, field


class ConstructorDeAppsError(Exception):
    """Excepción base para fallos en el Constructor de Apps."""

    pass


class RequisitosInvalidosError(ConstructorDeAppsError):
    """Lanzada cuando los requisitos de la app son inconsistentes o nulos."""

    pass


class AppNoEncontradaError(ConstructorDeAppsError):
    """Lanzada cuando se consulta una app inexistente."""

    pass


@dataclass(frozen=True)
class RequisitosApp:
    nombre: str
    descripcion: str
    caracteristicas_clave: typing.List[str] = field(default_factory=lambda: typing.cast(typing.List[str], []))


@dataclass(frozen=True)
class EvidenciaConstruccion:
    archivos_creados: typing.List[str]
    logs_compilacion: str
    advertencias: typing.List[str] = field(default_factory=lambda: typing.cast(typing.List[str], []))


@dataclass(frozen=True)
class AppConstruida:
    id_app: str
    requisitos: RequisitosApp
    evidencia: EvidenciaConstruccion
    estado: str


# @req: khora.puertos.constructor
class ConstructorDeApps(typing.Protocol):
    def construir(self, requisitos: RequisitosApp) -> AppConstruida:
        """Construye una app basada en los requisitos dados, bloqueando hasta terminar y retorna el estado de construcción."""
        ...

    def consultar_estado(self, id_app: str) -> AppConstruida:
        """Consulta el estado y resultado de una app construida."""
        ...
