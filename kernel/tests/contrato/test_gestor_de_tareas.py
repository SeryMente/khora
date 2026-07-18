import pytest

from khora_kernel.ports.gestor_de_tareas import GestorDeTareas
from khora_kernel.ports.mocks.mock_gestor_de_tareas import MockGestorDeTareas


class SuiteContratoGestorDeTareas:
    @pytest.fixture
    def adapter(self) -> GestorDeTareas:
        raise NotImplementedError

    def test_crear_completar_listar(self, adapter: GestorDeTareas) -> None:
        t = adapter.crear_tarea("Mi Tarea", "Desc")
        assert t.completada is False

        pendientes = adapter.listar_tareas(solo_pendientes=True)
        assert any(x.id_tarea == t.id_tarea for x in pendientes)

        t_comp = adapter.completar_tarea(t.id_tarea)
        assert t_comp.completada is True

        pendientes_despues = adapter.listar_tareas(solo_pendientes=True)
        assert not any(x.id_tarea == t.id_tarea for x in pendientes_despues)


class TestMockGestorDeTareas(SuiteContratoGestorDeTareas):
    @pytest.fixture
    def adapter(self) -> GestorDeTareas:
        return MockGestorDeTareas()


class _RotoGestorDeTareas(GestorDeTareas):
    def crear_tarea(self, titulo: str, descripcion: str = ""):
        from khora_kernel.ports.gestor_de_tareas import Tarea

        return Tarea("1", titulo, descripcion, False)

    def completar_tarea(self, id_tarea: str):
        from khora_kernel.ports.gestor_de_tareas import Tarea

        return Tarea("1", "Roto", "", False)  # Falla: retorna no completada

    def listar_tareas(self, solo_pendientes: bool = False):
        return []


def test_roto_falla_contrato_tareas():
    suite = SuiteContratoGestorDeTareas()
    adapter = _RotoGestorDeTareas()
    with pytest.raises(AssertionError):
        suite.test_crear_completar_listar(adapter)
