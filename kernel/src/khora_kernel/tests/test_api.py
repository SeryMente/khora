from khora_kernel.api import (
    ContextoDeVisibilidad,
    EntidadIngresada,
    MotorDeConsulta,
    MotorDeIngesta,
    MotorDeOlvido,
    NivelSuficiencia,
    Provenance,
    ResultadoDeConsulta,
    SubgrafoRelevante,
)


class _MockIngesta:
    def __init__(self) -> None:
        self._store: list[EntidadIngresada] = []

    def ingestar(
        self,
        texto: str,
        provenance: Provenance,
        visibilidad: ContextoDeVisibilidad = ContextoDeVisibilidad.PRIVADO,
    ) -> EntidadIngresada:
        e = EntidadIngresada(
            id=str(len(self._store)),
            texto=texto,
            provenance=provenance,
            visibilidad=visibilidad,
        )
        self._store.append(e)
        return e


class _MockConsulta:
    def __init__(self, store: list[EntidadIngresada]) -> None:
        self._store = store

    def consultar(
        self, pregunta: str, contexto: ContextoDeVisibilidad
    ) -> ResultadoDeConsulta:
        fragmentos = [e for e in self._store if e.visibilidad == contexto]
        suficiencia = NivelSuficiencia.SUFICIENTE if fragmentos else NivelSuficiencia.INSUFICIENTE
        return ResultadoDeConsulta(
            fragmentos=fragmentos,
            subgrafo=SubgrafoRelevante(),
            suficiencia=suficiencia,
            resumenes_incluidos=False,
        )


class _MockOlvido:
    def olvidar(self, id: str) -> str:
        return f"acta-olvido::{id}::2026-07-18T00:00:00Z"


def test_ingestar_retorna_entidad_con_provenance() -> None:
    motor: MotorDeIngesta = _MockIngesta()
    prov = Provenance(origen="chat", driver=None, timestamp="2026-07-18T00:00:00Z")

    entidad = motor.ingestar("Hola mundo", prov)

    assert isinstance(entidad, EntidadIngresada)
    assert entidad.provenance == prov
    assert entidad.texto == "Hola mundo"


def test_ingestar_sin_visibilidad_es_privado() -> None:
    motor: MotorDeIngesta = _MockIngesta()
    prov = Provenance(origen="chat", driver=None, timestamp="2026-07-18T00:00:00Z")

    entidad = motor.ingestar("Secreto", prov)

    assert entidad.visibilidad == ContextoDeVisibilidad.PRIVADO


def test_consultar_con_contexto_transparente_no_devuelve_privadas() -> None:
    ingesta: MotorDeIngesta = _MockIngesta()
    prov = Provenance(origen="chat", driver=None, timestamp="2026-07-18T00:00:00Z")

    e1 = ingesta.ingestar("Público", prov, ContextoDeVisibilidad.TRANSPARENTE)
    e2 = ingesta.ingestar("Secreto", prov, ContextoDeVisibilidad.PRIVADO)

    consulta: MotorDeConsulta = _MockConsulta(ingesta._store)  # type: ignore

    res = consulta.consultar("query", ContextoDeVisibilidad.TRANSPARENTE)
    res_transparentes = res.fragmentos

    assert len(res_transparentes) == 1
    assert res_transparentes[0] == e1
    assert e2 not in res_transparentes
    assert res.suficiencia == NivelSuficiencia.SUFICIENTE


def test_olvidar_id_retorna_acta() -> None:
    olvido: MotorDeOlvido = _MockOlvido()

    acta = olvido.olvidar("123")

    assert isinstance(acta, str)
    assert len(acta) > 0
    assert "123" in acta


def test_import_desde_fuera() -> None:
    import khora_kernel

    assert hasattr(khora_kernel, "MotorDeIngesta")
    assert hasattr(khora_kernel, "ContextoDeVisibilidad")
    assert hasattr(khora_kernel, "EntidadIngresada")
    assert hasattr(khora_kernel, "Provenance")
    assert hasattr(khora_kernel, "MotorDeConsulta")
    assert hasattr(khora_kernel, "MotorDeOlvido")
    assert hasattr(khora_kernel, "ResultadoDeConsulta")
    assert hasattr(khora_kernel, "NivelSuficiencia")
    assert hasattr(khora_kernel, "SubgrafoRelevante")
    assert hasattr(khora_kernel, "NodoSubgrafo")
    assert hasattr(khora_kernel, "AristaSubgrafo")
    assert hasattr(khora_kernel, "VERSION")

    # Asegurar que implementaciones o módulos internos no se exporten
    # Python almacena los modulos cacheados.
    # khora_kernel.api existe porque fue importado para este test.
    # El test consiste en verificar que __all__ solo expone la API publica
    assert khora_kernel.__all__ == [
        "ContextoDeVisibilidad",
        "EntidadIngresada",
        "ObjetoDeInformacion",
        "MotorDeConsulta",
        "MotorDeIngesta",
        "MotorDeOlvido",
        "Provenance",
        "ResultadoDeConsulta",
        "NivelSuficiencia",
        "SubgrafoRelevante",
        "NodoSubgrafo",
        "AristaSubgrafo",
        "Triple",
        "VERSION",
    ]
