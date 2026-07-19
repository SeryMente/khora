import hashlib
import json
import tarfile
import tempfile
from pathlib import Path
from typing import List

from khora_kernel.ports.memoria_organizada import (
    DocumentoMemoria,
    MemoriaOrganizada,
    Provenance,
)

# La versión del esquema de exportación
ESQUEMA_VERSION = "1.0.0"

# @req: khora.gravedad.fuente_verdad
def _calcular_hash_sha256(filepath: str | Path) -> str:
    sha256 = hashlib.sha256()
    with open(filepath, "rb") as f:
        for chunk in iter(lambda: f.read(4096), b""):
            sha256.update(chunk)
    return sha256.hexdigest()

def exportar_grafo(memoria: MemoriaOrganizada, destino: str) -> None:
    # 1. Obtener TODO el contenido del grafo (vacío significa todo por ahora o usaremos lógica dummy para sacar todo,
    # en el port actual no hay "get_all", usaremos query="" asumiendo que el mock lo retorna, o si no necesitamos un método.
    # Dado el puerto actual, query="" es lo más razonable).
    # OJO: necesitamos tanto privados como públicos.
    documentos: List[DocumentoMemoria] = memoria.consultar("", incluir_publicos=True)

    with tempfile.TemporaryDirectory() as tmp_dir:
        tmp_path = Path(tmp_dir)
        grafo_path = tmp_path / "grafo.jsonl"

        # 2. Escribir grafo.jsonl línea a línea
        with open(grafo_path, "w", encoding="utf-8") as f:
            for doc in documentos:
                doc_dict = {
                    "id_documento": doc.id_documento,
                    "contenido": doc.contenido,
                    "es_publico": doc.es_publico,
                    "provenance": {
                        "origen": doc.provenance.origen,
                        "fecha_ingesta": doc.provenance.fecha_ingesta,
                        "metadatos": doc.provenance.metadatos,
                    }
                }
                f.write(json.dumps(doc_dict, ensure_ascii=False) + "\n")

        # 3. Crear manifiesto y calcular hashes
        grafo_hash = _calcular_hash_sha256(grafo_path)
        manifiesto_path = tmp_path / "manifiesto.json"
        manifiesto_data = {
            "version_esquema": ESQUEMA_VERSION,
            "archivos": {
                "grafo.jsonl": {"sha256": grafo_hash}
            }
        }
        with open(manifiesto_path, "w", encoding="utf-8") as f:
            json.dump(manifiesto_data, f, ensure_ascii=False, indent=2)

        # 4. Empaquetar todo en el destino (tar.gz)
        with tarfile.open(destino, "w:gz") as tar:
            tar.add(grafo_path, arcname="grafo.jsonl")
            tar.add(manifiesto_path, arcname="manifiesto.json")

def importar_grafo(memoria: MemoriaOrganizada, origen: str) -> None:
    # 1. Desempaquetar tar.gz
    with tempfile.TemporaryDirectory() as tmp_dir:
        tmp_path = Path(tmp_dir)

        with tarfile.open(origen, "r:gz") as tar:
            if hasattr(tarfile, "data_filter"):
                tar.extractall(path=tmp_dir, filter="data")
            else:
                tar.extractall(path=tmp_dir)

        grafo_path = tmp_path / "grafo.jsonl"
        manifiesto_path = tmp_path / "manifiesto.json"

        if not grafo_path.exists() or not manifiesto_path.exists():
            raise RuntimeError("Paquete de exportación inválido: faltan archivos requeridos.")

        # 2. Verificar manifiesto y hashes
        with open(manifiesto_path, "r", encoding="utf-8") as f:
            manifiesto_data = json.load(f)

        if manifiesto_data.get("version_esquema") != ESQUEMA_VERSION:
            raise RuntimeError(f"Versión de esquema no soportada: {manifiesto_data.get('version_esquema')}")

        grafo_hash_esperado = manifiesto_data["archivos"]["grafo.jsonl"]["sha256"]
        grafo_hash_real = _calcular_hash_sha256(grafo_path)

        if grafo_hash_esperado != grafo_hash_real:
            raise RuntimeError("Fallo de integridad: El hash de grafo.jsonl no coincide.")

        # 3. Importar a la memoria (línea a línea)
        with open(grafo_path, "r", encoding="utf-8") as f:
            for line in f:
                if not line.strip():
                    continue
                doc_dict = json.loads(line)

                # Reconstruir provenance
                prov_dict = doc_dict["provenance"]
                provenance = Provenance(
                    origen=prov_dict["origen"],
                    fecha_ingesta=prov_dict["fecha_ingesta"],
                    metadatos=prov_dict.get("metadatos", {})
                )

                # Ingestar (OJO: la ingesta genera un nuevo ID en el puerto, pero conceptualmente
                # restauramos. Dado que el puerto no tiene un `ingestar_con_id`, lo ingestamos así.
                # Idealmente el motor subyacente debería respetar el ID en una importación, pero nos
                # limitamos al puerto actual).
                memoria.ingestar(
                    contenido=doc_dict["contenido"],
                    provenance=provenance,
                    es_publico=doc_dict["es_publico"]
                )
