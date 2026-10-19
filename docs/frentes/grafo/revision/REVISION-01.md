# REVISION-01 · Primera pasada estática de consistencia y autenticidad

## Alcance, entorno y límite

Inicio autorizado en C-REVISION-01. Rama fix/graph-occurrence-history-20261018, commit d7476c8f67d9bdb63ddbd3aefbd5f0db1539ec49. Lectura remota de ocho archivos, no ejecución de tests, servicios, acceso a snapshot real ni revisión de todos los módulos. No acredita producto ni cuantifica calidad. Métodos y criterios se heredan del objeto único; este informe es evidencia de revisión, no otro canon/estado vivo. El núcleo EpisTwin no se modifica ni se sustituye. No acceso remoto.

## Hallazgos y evidencia falsable

| ID | Hallazgo / comprobación estática | Evidencia exacta | Alcance y estado | Prueba/corrección pendiente |
|---|---|---|---|---|
| R01 | La proyección Neo4j etiqueta relaciones como Verificado sin comprobar juicio o validez semántica dentro de esa proyección; nodos sin needs_review=true también resultan Verificado | grafo-proyeccion.ts: dos consultas con `'Verificado' AS verificacion`, nodos con `CASE WHEN e.needs_review = true THEN 'Pendiente' ELSE 'Verificado' END` | Confirmado en código leído; riesgo de presentación como validado. No se demuestra aún exposición en pantalla publicada ni que represente ratificación humana en todos los consumidores | Trazar significado de estado desde fuente/juicio hasta consumidor y prueba negativa de una relación sin juicio; distinguir persistido, procedencia comprobada, inferencia y validación semántica. No aprobar nombre/UI por defecto |
| R02 | Los campos timestamp ausentes pueden sustituirse por datetime() en el momento de consultar | grafo-proyeccion.ts: `coalesce(toString(...created_at), toString(...valid_at), toString(datetime()))` en objetos, nodos y aristas | Confirmado estáticamente. Riesgo de tomar fecha de consulta como fecha del contenido; no se conoce en esta lectura cuántas filas carecen de fecha ni el significado que cada consumidor atribuye a timestamp | Caso de fecha ausente: conservar desconocido y separar captura/consulta/evento. Revisar contrato antes de alterar presentación |
| R03 | Dos caminos distintos de lectura: /grafo usa /api/grafos y PostgreSQL; /api/grafo obtiene Neo4j | page.tsx request('/api/grafos'); api/grafos llama readPair/scopedPair; api/grafo llama obtenerProyeccionGrafo; proyección ejecuta consultas Neo4j | Topología de llamadas confirmada. Esto no prueba por sí solo inconsistencia de datos actual; misma revisión/evidencia entre consumidores NO acreditada en esta lectura | Seguir una fuente/relación identificable y su knowledge_revision por mapa, consulta y regeneración; no renombrar uno para simular integración |
| R04 | El manifiesto causal vincula fuentes/política/modelo/prompts/propuestas/historia/juicios; readPair rechaza snapshot obsoleto | graph-revision.ts y graph-twins-store.ts causalState/readPair | Mecanismo estático existente, no prueba nueva de ejecución ni semántica; referencia ejecutable sigue en criterio 1.2, no el documental 1.3 | Antes de un candidato 1.3, fijar criterio por commit/huella y probar invalidación sin reetiquetar snapshots antiguos |
| R05 | Se preservan snapshots cifrados con trigger y se impide update/delete de historia | migration 033, store snapshot exige trigger | Código inspeccionado; no se ejecuta migración. La prohibición general de borrar no resuelve borrado coordinado y conserva bloqueo previo de despliegue | Cerrar política/implementación de borrado autorizado de historia y derivados con garantías; no ejecutar migración antes de ese cierre ni levantar trigger como atajo |
| R06 | La pantalla incluye exportación Evidencia ↓ que serializa el pair ya cargado; no llama next/judge | page.tsx audit(): Blob(JSON.stringify(pair)), botón audit separado de Actualizar ambos | Vía de exportación de lectura existe en código. Funcionamiento de versión publicada, sesión real, revisión/cobertura exportada NO VERIFICADOS | Inspeccionar versión publicada autorizada; obtener archivo por exportación sin pulsar generación ni juicios. No pedir secretos; tratar contenido como privado y comprobar truncamiento/scope/versión |

## Verificaciones positivas acotadas

El endpoint /api/grafos utiliza auth para obtener propietario; lectura no exige bóveda, escritura sí y requiere mismo origen/JSON. El store consulta owner y valida hashes de fuentes seleccionadas; el estado obsoleto no se sirve como actual desde readPair. Son propiedades del código leído, no pruebas de aislamiento integral, ausencia de otras rutas inseguras ni validación semántica. La ruta /api/grafo y proyección no reciben owner en los archivos leídos: auditar middleware/aislamiento antes de emitir diagnóstico de exposición; no declarar vulnerabilidad confirmada sin inspeccionar las demás fronteras.

## Orden recomendado, sin nuevas autorizaciones

1. Trazar evidencia, estado y revisión lógica en los dos consumidores y la consulta del agente; incluir dato sin juicio y sin fecha. No depender de credenciales para la inspección y pruebas locales independientes.
2. Precisar el contrato de estados para que una etiqueta no convierta persistencia o cita en verdad; separar propuesta de decisión del operador, sin nueva arquitectura. Cambios visuales/seguridad materiales conservan revisión/presencia exigidas.
3. Obtener exportación real autorizada cuando esté disponible, fijar corpus/revisión y contrastar sentidos completos de forma independiente; no confundir una exportación de vista truncada con archivo íntegro.
4. Repetir pruebas causales y de integración, completar aislamiento/borrado/publicación y recorrer muestra real antes de aptitud. No se promete que todos los defectos posibles estén inventariados por esta pasada.

## Fuentes leídas por revisión inmutable

- [khora-web/lib/graph-revision.ts](https://github.com/SeryMente/khora/blob/d7476c8f67d9bdb63ddbd3aefbd5f0db1539ec49/khora-web/lib/graph-revision.ts) · blob `51f866a81a6c881b77f2ebc138710a56c6b65354`.
- [khora-web/lib/server/graph-twins-store.ts](https://github.com/SeryMente/khora/blob/d7476c8f67d9bdb63ddbd3aefbd5f0db1539ec49/khora-web/lib/server/graph-twins-store.ts) · blob `bb1038571ca34d2bc396da476750e9672ac1b46c`.
- [khora-web/lib/graph-quality-reference.ts](https://github.com/SeryMente/khora/blob/d7476c8f67d9bdb63ddbd3aefbd5f0db1539ec49/khora-web/lib/graph-quality-reference.ts) · blob `105ddc56d7d8e9f243e724f7f542afcd6cc424f0`.
- [khora-web/db/migrations/033_graph_snapshot_history.sql](https://github.com/SeryMente/khora/blob/d7476c8f67d9bdb63ddbd3aefbd5f0db1539ec49/khora-web/db/migrations/033_graph_snapshot_history.sql) · blob `bd57efe8b544f129c53b05e59890bfde09603670`.
- [khora-web/app/api/grafo/route.ts](https://github.com/SeryMente/khora/blob/d7476c8f67d9bdb63ddbd3aefbd5f0db1539ec49/khora-web/app/api/grafo/route.ts) · blob `8043208a222a4c83a8164adc5a4789a5942b2081`.
- [khora-web/lib/server/grafo-proyeccion.ts](https://github.com/SeryMente/khora/blob/d7476c8f67d9bdb63ddbd3aefbd5f0db1539ec49/khora-web/lib/server/grafo-proyeccion.ts) · blob `7d09cc2dbe3c98ff477f6fff996345cece5b91c3`.
- [khora-web/app/api/grafos/route.ts](https://github.com/SeryMente/khora/blob/d7476c8f67d9bdb63ddbd3aefbd5f0db1539ec49/khora-web/app/api/grafos/route.ts) · blob `7546cddd0bbaaee80ee64c42f44fc5a2e33536c1`.
- [khora-web/app/grafo/page.tsx](https://github.com/SeryMente/khora/blob/d7476c8f67d9bdb63ddbd3aefbd5f0db1539ec49/khora-web/app/grafo/page.tsx) · blob `4d7f88c32ab3c948a040eb8c602d495b90837b64`.

## Dictamen y continuidad

Revisión estática INICIADA, no terminada. Hay condiciones observables de código que pueden producir estados semánticos engañosos; no se adjudica verdad autobiográfica ni se infiere población afectada. Ninguna prueba nueva fue ejecutada. El plazo anterior de baja confianza no se reduce por escribir este informe. Registrar los hallazgos no los corrige. No se realizó despliegue, migración, modificación de datos, generación, ratificación o llamada a proveedores.
