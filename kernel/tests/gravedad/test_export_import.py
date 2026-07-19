import tarfile
from pathlib import Path

from khora_kernel.gravedad import exportar_grafo, importar_grafo
from khora_kernel.host import HostConfig, HostDeModulos
from khora_kernel.ports.memoria_organizada import Provenance
from khora_kernel.ports.mocks.mock_memoria_organizada import MockMemoriaOrganizada


def test_ida_y_vuelta_gravedad_completa(tmp_path: Path):
    # Prueba que valida tanto la proveniencia como la configuración del host (ADR-10).
    # Usamos el path configurado en el host en un entorno temporal (simulando ~/.khora).
    corpus_path = tmp_path / ".khora"
    corpus_path.mkdir()

    config = HostConfig(corpus_path=corpus_path)

    # 1. Instancia Limpia A (origen)
    memoria_origen = MockMemoriaOrganizada()
    host_origen = HostDeModulos(config=config, registrar=lambda evento, contexto: None, puertos_disponibles={"MemoriaOrganizada": memoria_origen})

    # Ingresamos un documento privado
    prov_privado = Provenance(origen="usuario", fecha_ingesta="2026-07-18T10:00:00Z", metadatos={"clave": "valor"})
    memoria_origen.ingestar("Secreto corporativo", provenance=prov_privado, es_publico=False)

    # Ingresamos un documento público
    prov_publico = Provenance(origen="sistema", fecha_ingesta="2026-07-18T10:05:00Z")
    memoria_origen.ingestar("Manual de usuario", provenance=prov_publico, es_publico=True)

    # 2. Exportar usando el path del corpus_path del host
    paquete_destino = host_origen.config.corpus_path / "export_test.tar.gz"
    exportar_grafo(memoria_origen, str(paquete_destino))

    assert paquete_destino.exists()

    # Inspeccionamos el paquete "sin Cora" usando solo tarfile (herramienta estándar en simulación)
    with tarfile.open(paquete_destino, "r:gz") as tar:
        nombres = tar.getnames()
        assert "grafo.jsonl" in nombres
        assert "manifiesto.json" in nombres

    # SIMULACIÓN DE PRUEBA DE GRAVEDAD:
    # "Borramos" el código (mock no persistente en memoria se descarta, el corpus sobrevive en disco).
    # Como el archivo se guardó en `corpus_path`, sobrevive a la "pérdida" de la instancia anterior.

    # 3. Instancia Limpia B (destino)
    memoria_destino = MockMemoriaOrganizada()
    HostDeModulos(config=config, registrar=lambda evento, contexto: None, puertos_disponibles={"MemoriaOrganizada": memoria_destino})

    # Verificamos que está vacía
    assert len(memoria_destino.consultar("", incluir_publicos=True)) == 0

    # 4. Importar desde el corpus intacto
    importar_grafo(memoria_destino, str(paquete_destino))

    # 5. Consultas equivalentes y proveniencia intacta
    docs_destino_todo = memoria_destino.consultar("", incluir_publicos=True)
    assert len(docs_destino_todo) == 2

    # Validamos contenido y proveniencia
    contenidos_destino = {doc.contenido for doc in docs_destino_todo}
    assert "Secreto corporativo" in contenidos_destino
    assert "Manual de usuario" in contenidos_destino

    # Validamos un doc específico para verificar la proveniencia y visibilidad
    doc_secreto = next(doc for doc in docs_destino_todo if doc.contenido == "Secreto corporativo")
    assert not doc_secreto.es_publico
    assert doc_secreto.provenance.origen == "usuario"
    assert doc_secreto.provenance.metadatos == {"clave": "valor"}

    doc_manual = next(doc for doc in docs_destino_todo if doc.contenido == "Manual de usuario")
    assert doc_manual.es_publico
    assert doc_manual.provenance.origen == "sistema"
    assert doc_manual.provenance.metadatos == {}
