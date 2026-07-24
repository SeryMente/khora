# @l0 L0-002-R · @req KA-00/REQ-2 · @acr ACR-2.1
import typing
from dataclasses import dataclass


class GestorDeTareasError(Exception):
    """Excepción base para fallos en el Gestor de Tareas."""

    pass


class TareaNoEncontradaError(GestorDeTareasError):
    """Lanzada cuando una tarea no existe."""

    pass


class TransicionInvalidaError(GestorDeTareasError):
    """Lanzada cuando una transición de estado es inválida."""

    pass


@dataclass(frozen=True)
class Tarea:
    id_tarea: str
    titulo: str
    descripcion: str
    completada: bool


class GestorDeTareas(typing.Protocol):
    def crear_tarea(self, titulo: str, descripcion: str = "") -> Tarea:
        """Crea una nueva tarea pendiente y la retorna."""
        ...

    def completar_tarea(self, id_tarea: str) -> Tarea:
        """Marca una tarea como completada. Si ya está completada o no existe, lanza error."""
        ...

    def listar_tareas(self, solo_pendientes: bool = False) -> typing.List[Tarea]:
        """Lista las tareas almacenadas."""
        ...
