import re

with open("kernel/src/khora_kernel/motor/_memoria.py", "r") as f:
    content = f.read()

# We need to insert fusionar_ingesta
new_method = '''
    def fusionar_ingesta(self, triples: List[Triple], provenance: Provenance) -> int:
        self._asegurar_conexion()
        if not provenance:
            raise Exception("No se puede escribir sin provenance.")

        io_id = getattr(provenance, "io_id", provenance.origen)
        ts_valid_at = provenance.timestamp

        # ACR-1.1 & ACR-1.2 logic:
        # Bitemporal edge upsert ⊕
        query = """
        UNWIND $triples as t

        MERGE (origen:Entity {canonical_key: t.origen_id})
        ON CREATE SET
            origen.created_at = datetime($ts), origen.valid_at = datetime($ts), origen.invalid_at = null

        MERGE (destino:Entity {canonical_key: t.destino_id})
        ON CREATE SET
            destino.created_at = datetime($ts), destino.valid_at = datetime($ts), destino.invalid_at = null

        // Buscamos si existe la relación activa (invalid_at is null) con los mismos datos base
        OPTIONAL MATCH (origen)-[r_act:RELATION {type: t.relacion, io_id: $io_id}]->(destino)
        WHERE r_act.invalid_at IS NULL

        // Validar si la relacion activa ya tiene exactamente los mismos atributos (idempotencia)
        // Para simplificar, comparamos si ya existe y si el provenance_str ya está en su arreglo
        // Pero bitemporal indica que si el atributo cambia se versiona.
        // Aquí si la arista existe y no tiene el provenance_str, lo agregamos y creamos version nueva.
        // Si ya lo tiene, no hacemos nada.

        WITH t, origen, destino, r_act,
             CASE
               WHEN r_act IS NULL THEN 'CREATE'
               WHEN t.provenance_str IN r_act.provenance THEN 'IGNORE'
               ELSE 'UPDATE'
             END as action

        // 1. CREATE nueva relacion
        FOREACH (ignore IN CASE WHEN action = 'CREATE' THEN [1] ELSE [] END |
            CREATE (origen)-[r_new:RELATION {type: t.relacion, io_id: $io_id}]->(destino)
            SET r_new.provenance = [t.provenance_str],
                r_new.created_at = datetime($ts),
                r_new.valid_at = datetime($ts),
                r_new.invalid_at = null
        )

        // 2. UPDATE (invalidar vieja, crear nueva)
        FOREACH (ignore IN CASE WHEN action = 'UPDATE' THEN [1] ELSE [] END |
            SET r_act.invalid_at = datetime($ts)
            CREATE (origen)-[r_new:RELATION {type: t.relacion, io_id: $io_id}]->(destino)
            SET r_new.provenance = r_act.provenance + [t.provenance_str],
                r_new.created_at = r_act.created_at,
                r_new.valid_at = datetime($ts),
                r_new.invalid_at = null
        )
        """

        check_huerfanos = """
        MATCH (n:Entity)
        WHERE NOT (n)-[:MATIZ_DE]->()
          AND NOT EXISTS { MATCH (:User {id: 'root'})-[*]->(n) }
          AND NOT (n:User AND n.id = 'root')
        RETURN count(n) as orphans
        """

        restriccion_query = """
        MATCH (n)
        WHERE size([l IN labels(n) WHERE l IN ['Entity', 'Literal', 'Blank']]) > 1
        RETURN count(n) as violaciones
        """

        campos_faltantes_query = """
        MATCH (n)
        WHERE n.valid_at IS NULL OR n.created_at IS NULL OR NOT exists(n.invalid_at)
        RETURN count(n) as nodos_invalidos
        UNION ALL
        MATCH ()-[r]->()
        WHERE r.valid_at IS NULL OR r.created_at IS NULL OR NOT exists(r.invalid_at)
        RETURN count(r) as aristas_invalidas
        """

        try:
            assert self._driver is not None
            with self._driver.session() as session:
                with session.begin_transaction() as tx:
                    tx.run("MERGE (u:Entity:User {id: 'root'}) ON CREATE SET u.canonical_key='root', u.created_at=datetime($ts), u.valid_at=datetime($ts), u.invalid_at=null", ts=ts_valid_at)

                    triples_data = []
                    for t in triples:
                        prov_str = f"origen={t.provenance.origen}, driver={t.provenance.driver}, timestamp={t.provenance.timestamp}"
                        triples_data.append({
                            "origen_id": t.origen_id,
                            "destino_id": t.destino_id,
                            "relacion": t.relacion,
                            "provenance_str": prov_str
                        })

                    result = tx.run(query, triples=triples_data, io_id=io_id, ts=ts_valid_at)
                    summary = result.consume()
                    escritos = summary.counters.nodes_created + summary.counters.relationships_created + summary.counters.properties_set

                    # Verificar Unión Disjunta
                    res_viol = tx.run(restriccion_query)
                    viol_count = sum([r[0] for r in res_viol])
                    if viol_count > 0:
                        tx.rollback()
                        raise ValueError("Violación de restricción real: nodo con doble clase (Entity, Literal, Blank).")

                    # Verificar Bi-temporal
                    res_bitemp = tx.run(campos_faltantes_query)
                    invalidos = sum([r[0] for r in res_bitemp])
                    if invalidos > 0:
                        tx.rollback()
                        raise ValueError("Violación de restricción bi-temporal: valid_at, invalid_at o created_at faltante.")

                    # Verificar Alcanzabilidad
                    orphans_result = tx.run(check_huerfanos)
                    orphans_record = orphans_result.single()
                    if orphans_record and orphans_record["orphans"] > 0:
                        import logging
                        logging.error(f"Error: Ingesta genera {orphans_record['orphans']} nodos huérfanos. IO_ID: {io_id}")
                        tx.rollback()
                        return 0

                    tx.commit()
                    return escritos
        except ValueError as e:
            raise e
        except Exception as e:
            raise Exception(f"Error en fusionar_ingesta: {str(e)}")
'''

# Find the end of escribir_ingesta
lines = content.split('\n')
idx = -1
for i, line in enumerate(lines):
    if line.strip().startswith("def frecuencia"):
        idx = i
        break

if idx != -1:
    lines.insert(idx, new_method)
    with open("kernel/src/khora_kernel/motor/_memoria.py", "w") as f:
        f.write('\n'.join(lines))
