import re

with open("kernel/src/khora_kernel/motor/_memoria.py", "r") as f:
    content = f.read()

new_methods = """
    def buscar_entidades_candidatas(self, label_norm: str) -> typing.List[typing.Dict[str, typing.Any]]:
        self._asegurar_conexion()
        query = \"\"\"
        MATCH (e:Entity)
        WHERE e.canonical_key = $label_norm
        RETURN e.canonical_key AS canonical_key, e.embedding AS embedding, e.provenance AS provenance
        \"\"\"
        try:
            assert self._driver is not None
            with self._driver.session() as session:
                result = session.run(query, label_norm=label_norm)
                candidatos = []
                for record in result:
                    candidatos.append({
                        "canonical_key": record["canonical_key"],
                        "embedding": record["embedding"],
                        "descripcion": record["provenance"][0] if record["provenance"] else ""
                    })
                return candidatos
        except Exception as e:
            raise Exception(f"Error buscando entidades: {str(e)}")

    def merge_entidad(self, canonical_key: str, label_original: str, provenance_raw: str, embedding: typing.List[float], matiz_de: str = None, needs_review: bool = False) -> None:
        self._asegurar_conexion()
        query = \"\"\"
        MERGE (e:Entity {canonical_key: $canonical_key})
        ON CREATE SET
            e.label_original = $label_original,
            e.embedding = $embedding,
            e.provenance = [$provenance_raw],
            e.needs_review = $needs_review
        ON MATCH SET
            e.provenance = e.provenance + [$provenance_raw]
        \"\"\"

        rel_query = \"\"\"
        MATCH (e:Entity {canonical_key: $canonical_key}), (m:Entity {canonical_key: $matiz_de})
        MERGE (e)-[:MATIZ_DE]->(m)
        \"\"\"

        try:
            assert self._driver is not None
            with self._driver.session() as session:
                session.run(query, canonical_key=canonical_key, label_original=label_original, embedding=embedding, provenance_raw=provenance_raw, needs_review=needs_review)
                if matiz_de:
                    session.run(rel_query, canonical_key=canonical_key, matiz_de=matiz_de)
        except Exception as e:
            raise Exception(f"Error en MERGE de entidad: {str(e)}")
"""

if "buscar_entidades_candidatas" not in content:
    content += new_methods
    with open("kernel/src/khora_kernel/motor/_memoria.py", "w") as f:
        f.write(content)
