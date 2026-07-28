import re
import datetime

with open("kernel/src/khora_kernel/motor/_memoria.py", "r") as f:
    content = f.read()

# Fix the Escribir logic
replacement_escribir = """
                    import datetime
                    ts = getattr(provenance, "timestamp", None)
                    if not ts:
                        ts = datetime.datetime.now(datetime.timezone.utc).isoformat().replace("+00:00", "Z")
                    prov_str_io = f"origen={provenance.origen}, driver={provenance.driver}, timestamp={ts}"
                    io_key = 'io:' + io_id

                    triples_data = []
                    claves_set = set()
                    for t in triples:
                        prov_str = f"origen={t.provenance.origen}, driver={t.provenance.driver}, timestamp={t.provenance.timestamp}"
                        triples_data.append({
                            "origen_id": t.origen_id,
                            "destino_id": t.destino_id,
                            "relacion": t.relacion,
                            "provenance_str": prov_str
                        })
                        claves_set.add(t.origen_id)
                        claves_set.add(t.destino_id)
                    claves_list = list(claves_set)

                    result = tx.run(query, triples=triples_data, io_id=io_id)
                    record = result.single()
                    escritos = record["count"] if record else 0

                    tx.run(anclaje_query, ts=ts, io_id=io_id, io_key=io_key, prov_str=prov_str_io, claves=claves_list)

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

                    # Verificar Alcanzabilidad Scoped
                    orphans_result = tx.run(check_huerfanos, claves=claves_list)
                    orphans_record = orphans_result.single()
                    huerfanos_list = orphans_record["huerfanos"] if orphans_record else []
                    if huerfanos_list:
                        tx.rollback()
                        raise HuerfanosDetectadosError(io_id=io_id, huerfanos=huerfanos_list)

                    # Verificar Alcanzabilidad Global Diagnóstico
                    global_result = tx.run(check_huerfanos_global)
                    global_record = global_result.single()
                    if global_record and global_record["orphans"] > 0:
                        import logging
                        logging.warning(
                            "GRAFO-01: %s nodo(s) huérfano(s) heredados en el grafo (NO bloquean esta ingesta). "
                            "Remediar con scripts/migraciones/2026_07_28_grafo01_backfill_alcanzabilidad.py",
                            global_record["orphans"]
                        )

                    tx.commit()
"""

match_str = '''
                    # Garantizar que el nodo raíz existe
                    tx.run("MERGE (u:Entity:User {id: 'root'}) ON CREATE SET u.canonical_key='root', u.created_at=datetime(), u.valid_at=datetime(), u.invalid_at=null")

                    triples_data = []
                    for t in triples:
                        prov_str = f"origen={t.provenance.origen}, driver={t.provenance.driver}, timestamp={t.provenance.timestamp}"
                        triples_data.append({
                            "origen_id": t.origen_id,
                            "destino_id": t.destino_id,
                            "relacion": t.relacion,
                            "provenance_str": prov_str
                        })

                    result = tx.run(query, triples=triples_data, io_id=io_id)
                    record = result.single()
                    escritos = record["count"] if record else 0

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
'''

content = content.replace(match_str.strip("\n"), replacement_escribir.strip("\n"))

# Exception block rewrite
content = content.replace(
'''
        except ValueError as e:
            raise e
        except Exception as e:
            raise Exception(f"Error en escribir_ingesta: {str(e)}")
'''.strip("\n"),
'''
        except (ValueError, IngestaFallidaError) as e:
            raise e
        except Exception as e:
            raise Exception(f"Error en escribir_ingesta: {str(e)}")
'''.strip("\n")
)

with open("kernel/src/khora_kernel/motor/_memoria.py", "w") as f:
    f.write(content)
