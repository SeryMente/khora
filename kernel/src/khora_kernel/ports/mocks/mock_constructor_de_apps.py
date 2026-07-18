import typing
import uuid

from ..constructor_de_apps import (
    AppConstruida,
    AppNoEncontradaError,
    ConstructorDeApps,
    EvidenciaConstruccion,
    RequisitosApp,
    RequisitosInvalidosError,
)


class MockConstructorDeApps(ConstructorDeApps):
    def __init__(self) -> None:
        self._apps: typing.Dict[str, AppConstruida] = {}

    def construir(self, requisitos: RequisitosApp) -> AppConstruida:
        if not requisitos.nombre:
            raise RequisitosInvalidosError("La app debe tener un nombre.")

        app_id = str(uuid.uuid4())
        evidencia = EvidenciaConstruccion(
            archivos_creados=[f"{requisitos.nombre}/main.py"],
            logs_compilacion="Compilación exitosa (mock).",
        )
        app = AppConstruida(
            id_app=app_id, requisitos=requisitos, evidencia=evidencia, estado="EXITO"
        )
        self._apps[app_id] = app
        return app

    def consultar_estado(self, id_app: str) -> AppConstruida:
        if id_app not in self._apps:
            raise AppNoEncontradaError(f"App {id_app} no encontrada.")
        return self._apps[id_app]
