import cmd
from typing import Optional
from khora_kernel import (
    ContextoDeVisibilidad,
    MotorDeIngesta,
    MotorDeConsulta,
    MotorDeOlvido,
    Provenance,
    VERSION,
    NivelSuficiencia,
)

class TerminalRepl(cmd.Cmd):
    intro = "Terminal de Captura - Khora"
    prompt = "khora · ● privado > "

    def __init__(
        self,
        motor_ingesta: Optional[MotorDeIngesta] = None,
        motor_consulta: Optional[MotorDeConsulta] = None,
        motor_olvido: Optional[MotorDeOlvido] = None,
    ):
        super().__init__()
        self.motor_ingesta = motor_ingesta
        self.motor_consulta = motor_consulta
        self.motor_olvido = motor_olvido
        self.contexto = ContextoDeVisibilidad.PRIVADO

    def do_capturar(self, arg: str) -> None:
        """Captura un texto usando el motor de ingesta."""
        if not arg.strip():
            print("Error: El texto a capturar no puede estar vacío.")
            return

        if not self.motor_ingesta:
            print("Error: Motor de ingesta no disponible.")
            return

        # Una captura exitosa puede mostrar UN micro-reflejo factual y corto de la estructura ya devuelta por el kernel
        provenance = Provenance(origen="terminal", driver=None, timestamp="now")
        try:
            resultado = self.motor_ingesta.ingestar(arg, provenance, self.contexto)
            print(f"[{resultado.id}] Capturado")
        except Exception as e:
            print(f"Error en captura: {e}")

    def do_dictar(self, arg: str) -> None:
        """Inicia el flujo de dictado."""
        print("Indisponible: dictado público aún no expuesto en la frontera del kernel.")

    def do_consultar(self, arg: str) -> None:
        """Consulta el kernel."""
        if not arg.strip():
            print("Error: La pregunta no puede estar vacía.")
            return

        if not self.motor_consulta:
            print("Error: Motor de consulta no disponible.")
            return

        try:
            resultado = self.motor_consulta.consultar(arg, self.contexto)
            if resultado.suficiencia == NivelSuficiencia.INSUFICIENTE:
                print("Insuficiente: no hay contexto para responder a la consulta.")
            else:
                for fragmento in resultado.fragmentos:
                    prov_str = f"{fragmento.provenance.origen} · {fragmento.provenance.timestamp}"
                    if fragmento.provenance.driver:
                        prov_str += f" · {fragmento.provenance.driver}"
                    print(f"Fuente: {prov_str}")
                    print(f"Texto: {fragmento.texto}")
        except Exception as e:
            print(f"Error en consulta: {e}")

    def do_olvidar(self, arg: str) -> None:
        """Olvida una entrada por ID."""
        if not arg.strip():
            print("Error: Debe proporcionar un ID.")
            return

        if not self.motor_olvido:
            print("Indisponible: olvidar no expuesto aún en el kernel o no proveído a la shell.")
            return

        try:
            acta = self.motor_olvido.olvidar(arg.strip())
            print(acta)
        except Exception as e:
            print(f"Error en olvido: {e}")

    def do_registro(self, arg: str) -> None:
        """Consulta el registro."""
        print("Indisponible: registro público aún no expuesto en la frontera del kernel.")

    def do_version(self, arg: str) -> None:
        """Muestra la versión de Khora."""
        print(f"Khora Kernel v{VERSION}")

    def do_salir(self, arg: str) -> bool:
        """Sale de la terminal."""
        return True

    def default(self, line: str) -> None:
        print(f"Comando no reconocido: {line}. Escriba 'help' o '?' para ver los comandos disponibles.")
