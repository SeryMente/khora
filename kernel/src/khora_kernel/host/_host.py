# @l0 L0-002-R · @req KA-00/REQ-2 · @acr ACR-2.1
import ast
from typing import Any, Dict, Protocol

from ._manifest import HostConfig, ManifiestoModulo


class PuertoDefinido(Protocol):
    pass


class EventoRegistro(Protocol):
    def __call__(self, evento: str, contexto: Dict[str, Any]) -> None: ...


class ErrorMontaje(Exception):
    pass


class ErrorPuertoNoDeclarado(Exception):
    pass


class ErrorImportacionProhibida(Exception):
    pass


class ModuloSandbox:
    def __init__(self, modulo_codigo: str, puertos_inyectados: Dict[str, Any]):
        self._codigo = modulo_codigo
        self._puertos = puertos_inyectados

    def validar_estaticamente(self):
        tree = ast.parse(self._codigo)
        for node in ast.walk(tree):
            if isinstance(node, ast.Import):
                for alias in node.names:
                    if alias.name.startswith("khora_kernel") or alias.name.startswith("kernel"):
                        raise ErrorImportacionProhibida(f"Importación prohibida: {alias.name}")
            elif isinstance(node, ast.ImportFrom):
                if node.module and (node.module.startswith("khora_kernel") or node.module.startswith("kernel")):
                    if node.module not in ["khora_kernel.api", "khora_kernel.ports"]:
                         raise ErrorImportacionProhibida(f"Importación prohibida: {node.module}")

    def ejecutar(self) -> Dict[str, Any]:
        # Primero validamos para que en activar igual tengamos garantias de ast (por si no paso por instalar)
        self.validar_estaticamente()
        loc: Dict[str, Any] = {}
        # Para inyectar puertos directamente en el scope local/global de ejecución
        exec(self._codigo, self._puertos, loc)
        return loc


class HostDeModulos:
    def __init__(
        self,
        config: HostConfig,
        registrar: EventoRegistro,
        puertos_disponibles: Dict[str, Any],
    ):
        self.config = config
        self.registrar = registrar
        self.puertos_disponibles = puertos_disponibles
        self._modulos_instalados: Dict[str, ManifiestoModulo] = {}
        self._modulos_activos: Dict[str, Any] = {}

    def instalar(self, manifiesto: ManifiestoModulo, codigo_fuente: str):
        # Verificación estática antes de instalar
        sandbox = ModuloSandbox(codigo_fuente, {})
        # Solo validar AST de imports, NADA se inicializa, regla LAZY (ADR-10).
        sandbox.validar_estaticamente()

        self._modulos_instalados[manifiesto.nombre] = manifiesto
        self.registrar("instalar", {"modulo": manifiesto.nombre, "version": manifiesto.version})

    def activar(self, nombre_modulo: str, codigo_fuente: str):
        if nombre_modulo not in self._modulos_instalados:
            raise ErrorMontaje(f"Módulo no instalado: {nombre_modulo}")

        manifiesto = self._modulos_instalados[nombre_modulo]
        puertos_inyectados: Dict[str, Any] = {}

        for puerto in manifiesto.puertos_requeridos:
            if puerto not in self.puertos_disponibles:
                raise ErrorPuertoNoDeclarado(f"Puerto requerido no disponible o no declarado: {puerto}")
            puertos_inyectados[puerto] = self.puertos_disponibles[puerto]

        self.registrar("activar", {"modulo": nombre_modulo})
        sandbox = ModuloSandbox(codigo_fuente, puertos_inyectados)
        try:
            instancia = sandbox.ejecutar()
            self._modulos_activos[nombre_modulo] = instancia
        except Exception as e:
            # ADR-10: Driver caído al montar → el host monta su MOCK y lo reporta vía registrar — jamás crash de arranque.
            self.registrar("driver_caido_montaje_mock", {"modulo": nombre_modulo, "error": str(e)})
            self._modulos_activos[nombre_modulo] = {"__mock__": True, "error": str(e)}

    def desactivar(self, nombre_modulo: str):
        if nombre_modulo in self._modulos_activos:
            del self._modulos_activos[nombre_modulo]
            self.registrar("desactivar", {"modulo": nombre_modulo})

    def desinstalar(self, nombre_modulo: str):
        self.desactivar(nombre_modulo)
        if nombre_modulo in self._modulos_instalados:
            del self._modulos_instalados[nombre_modulo]
            self.registrar("desinstalar", {"modulo": nombre_modulo})
