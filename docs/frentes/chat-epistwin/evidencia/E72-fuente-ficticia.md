# E72 · Prueba pública ficticia autorizada

Fuente única literal: «Lumen es una baliza ficticia de color ámbar. Cobalto es un vehículo ficticio de color azul.»

La respuesta expresa del operador consta en el objeto canónico documental0.27/E72. Esta prueba no acredita extracción LLM, EpisTwin global, mapaPostgreSQL, corpus personal ni aceptaciónENT01. Las relaciones son anotadas explícitamente y se asientan mediante el escritor transaccional existente; cuatro entidades, dos relaciones y un objeto de información, sin crear volcado personal ficticio. Namespace/IO: `ent01-public-fiction-e72-v1`.

La habilitación de escritura en build exige `KHORA_CHAT_E72_INGEST` igual al SHA256 exacto de la fuente, no un booleano. Tras primera prueba debe deshabilitarse con0 y verificarse nuevo arranque sin reinserción. `KHORA_CHAT_E72_INDEX=1` recupera solo el índice derivado desde los vectores reales persistidos del origen autorizado; no escribe en Neo4j ni llama al proveedor en ese arranque. El chat sí requiere Voyage real para sus preguntas. Failclosed ante colisión, otros nodos semánticos, fuente/huella/campos alterados o índice incompatible; ninguna nota privada se lee para construirlo.

Retirada, si fuera necesaria: deshabilitar ambas banderas de prueba y revertir el candidato a la revisión anterior conocida; verificar health/alias. Después, con transacción administrativa acotada, cotejar IO/sha/source_schema y namespace exactos, y marcar únicamente ese IO, sus cuatro nodos y sus relaciones OWNS/MENTIONS/RELATION con `invalid_at=datetime()`, sin eliminar ni tocar otros nodos. Rechazar si hay relaciones de otros orígenes. Invalidar el índice derivado. La retirada no debe ejecutarse automáticamente ante un error de red ni confundirse con borrado del archivo personal. La conservación por defecto permite diagnosticar sin pérdida.

Pruebas aisladas E72: 35 aprobadas/1 omitida (dependiente de entorno), incluyendo autorización exacta, bloqueo antes de proveedor ante colisión, rechazo de mezcla de procedencia y recuperación sin llamada a proveedor. No constituyen aceptación desplegada.
