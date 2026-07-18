import typing
import uuid

from ..gestor_de_tareas import (
    GestorDeTareas,
    Tarea,
    TareaNoEncontradaError,
    TransicionInvalidaError,
)


class MockGestorDeTareas(GestorDeTareas):
    def __init__(self) -> None:
        self._tareas: typing.Dict[str, Tarea] = {}

    def crear_tarea(self, titulo: str, descripcion: str = "") -> Tarea:
        t_id = str(uuid.uuid4())
        t = Tarea(
            id_tarea=t_id, titulo=titulo, descripcion=descripcion, completada=False
        )
        self._tareas[t_id] = t
        return t

    def completar_tarea(self, id_tarea: str) -> Tarea:
        if id_tarea not in self._tareas:
            raise TareaNoEncontradaError(f"Tarea {id_tarea} no existe.")
        t = self._tareas[id_tarea]
        if t.completada:
            raise TransicionInvalidaError(f"Tarea {id_tarea} ya está completada.")

        t_actualizada = Tarea(
            id_tarea=t.id_tarea,
            titulo=t.titulo,
            descripcion=t.descripcion,
            completada=True,
        )
        self._tareas[id_tarea] = t_actualizada
        return t_actualizada

    def listar_tareas(self, solo_pendientes: bool = False) -> typing.List[Tarea]:
        todas = list(self._tareas.values())
        if solo_pendientes:
            return [t for t in todas if not t.completada]
        return todas
