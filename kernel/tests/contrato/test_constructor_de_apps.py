import pytest

from khora_kernel.ports.constructor_de_apps import ConstructorDeApps, RequisitosApp
from khora_kernel.ports.mocks.mock_constructor_de_apps import MockConstructorDeApps


class SuiteContratoConstructorDeApps:
    @pytest.fixture
    def adapter(self) -> ConstructorDeApps:
        raise NotImplementedError

    def test_construir_consultar(self, adapter: ConstructorDeApps) -> None:
        reqs = RequisitosApp(nombre="MyApp", descripcion="Test")
        app = adapter.construir(reqs)

        assert app.id_app
        assert app.requisitos.nombre == "MyApp"
        assert app.estado
        assert len(app.evidencia.archivos_creados) > 0

        app_consultada = adapter.consultar_estado(app.id_app)
        assert app_consultada.id_app == app.id_app


class TestMockConstructorDeApps(SuiteContratoConstructorDeApps):
    @pytest.fixture
    def adapter(self) -> ConstructorDeApps:
        return MockConstructorDeApps()


class _RotoConstructorDeApps(ConstructorDeApps):
    def construir(self, requisitos: RequisitosApp):
        from khora_kernel.ports.constructor_de_apps import (
            AppConstruida,
            EvidenciaConstruccion,
        )

        return AppConstruida("1", requisitos, EvidenciaConstruccion([], ""), "EXITO")

    def consultar_estado(self, id_app: str):
        raise Exception("Falla")


def test_roto_falla_contrato_apps():
    suite = SuiteContratoConstructorDeApps()
    adapter = _RotoConstructorDeApps()
    with pytest.raises(AssertionError):
        suite.test_construir_consultar(adapter)
