import sys
import os

# Ensure shell is in path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../../..")))

from shell.terminal.repl import TerminalRepl
from khora_kernel import (
    ContextoDeVisibilidad,
    EntidadIngresada,
    NivelSuficiencia,
    Provenance,
    ResultadoDeConsulta,
    SubgrafoRelevante,
)

class MockIngesta:
    def ingestar(self, texto: str, provenance: Provenance, visibilidad: ContextoDeVisibilidad) -> EntidadIngresada:
        return EntidadIngresada(
            id="mock-id-123",
            texto=texto,
            provenance=provenance,
            visibilidad=visibilidad,
        )

class MockConsulta:
    def consultar(self, pregunta: str, contexto: ContextoDeVisibilidad) -> ResultadoDeConsulta:
        if "insuficiente" in pregunta.lower():
            return ResultadoDeConsulta(
                fragmentos=[],
                subgrafo=SubgrafoRelevante(),
                suficiencia=NivelSuficiencia.INSUFICIENTE,
                resumenes_incluidos=False,
            )
        else:
            return ResultadoDeConsulta(
                fragmentos=[
                    EntidadIngresada(
                        id="f-1",
                        texto="Respuesta mock",
                        provenance=Provenance(origen="terminal", driver="mock-driver", timestamp="2026-07-18T10:00:00Z"),
                        visibilidad=ContextoDeVisibilidad.PRIVADO,
                    )
                ],
                subgrafo=SubgrafoRelevante(),
                suficiencia=NivelSuficiencia.SUFICIENTE,
                resumenes_incluidos=False,
            )

class MockOlvido:
    def olvidar(self, id: str) -> str:
        return f"Acta de olvido para {id}"

def test_capturar(capsys):
    repl = TerminalRepl(motor_ingesta=MockIngesta())
    repl.onecmd("capturar algo de texto")
    out, err = capsys.readouterr()
    assert "[mock-id-123] Capturado" in out

def test_consultar_suficiente(capsys):
    repl = TerminalRepl(motor_consulta=MockConsulta())
    repl.onecmd("consultar cómo funciona")
    out, err = capsys.readouterr()
    assert "Fuente: terminal · 2026-07-18T10:00:00Z · mock-driver" in out
    assert "Texto: Respuesta mock" in out

def test_consultar_insuficiente(capsys):
    repl = TerminalRepl(motor_consulta=MockConsulta())
    repl.onecmd("consultar insuficiente algo")
    out, err = capsys.readouterr()
    assert "Insuficiente: no hay contexto para responder a la consulta." in out

def test_olvidar(capsys):
    repl = TerminalRepl(motor_olvido=MockOlvido())
    repl.onecmd("olvidar abc")
    out, err = capsys.readouterr()
    assert "Acta de olvido para abc" in out

def test_comandos_indisponibles(capsys):
    repl = TerminalRepl()
    repl.onecmd("dictar")
    out, err = capsys.readouterr()
    assert "Indisponible: dictado público aún no expuesto" in out

    repl.onecmd("registro")
    out, err = capsys.readouterr()
    assert "Indisponible: registro público aún no expuesto" in out

def test_importaciones_negativas():
    """
    Verifica que la shell no importa partes internas del kernel.
    """
    import ast
    from pathlib import Path

    shell_dir = Path(__file__).parent.parent
    for filepath in shell_dir.rglob("*.py"):
        with open(filepath, "r", encoding="utf-8") as f:
            code = f.read()
        tree = ast.parse(code)
        for node in ast.walk(tree):
            if isinstance(node, ast.Import):
                for alias in node.names:
                    assert not alias.name.startswith("khora_kernel.consulta"), f"Import prohibido en {filepath}: {alias.name}"
                    assert not alias.name.startswith("khora_kernel.registro"), f"Import prohibido en {filepath}: {alias.name}"
                    assert not alias.name.startswith("khora_kernel.host"), f"Import prohibido en {filepath}: {alias.name}"
                    assert not alias.name.startswith("khora_kernel.ports"), f"Import prohibido en {filepath}: {alias.name}"
                    assert not alias.name.startswith("khora_kernel.drivers"), f"Import prohibido en {filepath}: {alias.name}"
            elif isinstance(node, ast.ImportFrom):
                if node.module:
                    assert not node.module.startswith("khora_kernel.consulta"), f"Import prohibido en {filepath}: {node.module}"
                    assert not node.module.startswith("khora_kernel.registro"), f"Import prohibido en {filepath}: {node.module}"
                    assert not node.module.startswith("khora_kernel.host"), f"Import prohibido en {filepath}: {node.module}"
                    assert not node.module.startswith("khora_kernel.ports"), f"Import prohibido en {filepath}: {node.module}"
                    assert not node.module.startswith("khora_kernel.drivers"), f"Import prohibido en {filepath}: {node.module}"
