# Harmonia · D-040 · Salida visible B

**Conversación local UUIDv7:** 01a1d662-73ec-7739-ab98-03175385887b  
**Ciclo local UUIDv7:** 01a1d662-73ef-7bfa-8b1c-763b791c81f2  
**A:** originales/HARMONIA-INSTRUCCIONES-VERBATIM-20261113-D040.md · SHA-256 DA1D09E58345F90162868BA01212D157AFEDF98A86FB679B85C25E52A8C4DAE6 · 669 bytes.  
**FOL1:** PREPARADO / NO ACTIVO; folios globales NO ASIGNADOS.

## 1. Estado de D-039 / OMM-FUT-004

La candidata local **Extension 0.5.0** dispone del reporte de frentes por ventanas móviles de 24 h, 48 h, 72 h y 7 días, con una conversación asociada explícitamente por frente, etiqueta relativa, fecha/hora y URL de ChatGPT. La asociación nueva sustituye la anterior en la vista activa; el JSONL histórico se conserva.

La suite focal más reciente del contrato de frentes terminó en **16/16 PASS**, incluidos utilidades de URL/tiempo, almacén, reasignación y consulta HTTP del colector aislado. El resultado de datos semilla anterior a D-040 fue: 24/48/72 horas = Harmonia; 7 días = Harmonia y Dictado, con los límites de exportación documentados en la salida B D-039.

La aceptación del popup en Chrome natural continúa NO VERIFICADA. BMO-01 NO ALCANZADO. No se inició el colector 0.5.0 del perfil del operador ni se tocó Chrome principal.

## 2. Nueva tarea provisional · OMM-FUT-007

Se registra el requisito de automatizar la generación y actualización de un archivo Markdown maestro por conversación ChatGPT. Cada ciclo actualiza el mismo archivo identificado por ID nativo de conversación. No se permite un archivo nuevo por ciclo ni una concatenación que duplique mensajes.

**Versión objetivo:** Extension 0.6.0, planificada, todavía no implementada. El paquete sigue en 0.5.0 y no cambia su manifest/build-info.

La ubicación recomendada, pendiente de confirmación al iniciar la implementación, es:

%USERPROFILE%\Downloads\Harmonia-Conversations\<conversation-id>.md

El flujo previsto lee solo los mensajes renderizados en la conversación actual de chatgpt.com, construye Markdown estructurado y envía el snapshot únicamente al colector loopback autenticado para escritura local atómica. La asociación al frente se incluye solo si existe selección explícita.

## 3. Auditoría del benchmark Markdown

Se inspeccionaron siete ejemplos en C:\Users\fila4\Downloads: HARMONIA, EP, GOBERNANZA, NOTAS, Product Design, PRODUCT y SI. Sus tamaños oscilan entre **42,368 y 137,831 bytes**, con **899 a 2,466 líneas**. Incluyen metadatos de título/usuario/Created/Updated/Exported/Link, timestamps en cada Prompt y timestamp+modelo en cada Response, encabezados, tablas, listas, código, enlaces, citas e imágenes.

El ejemplo Product Design tiene 2,466 líneas, 10 prompts/11 respuestas, 96 encabezados, 159 líneas de tabla, 80 enlaces y 12 imágenes. NOTAS tiene 7 imágenes y 67 enlaces. Los ejemplos están en UTF-8 sin BOM, con LF, sin caracteres U+FFFD y con bloques de código balanceados. Los archivos no se copiaron al repositorio: la auditoría conserva nombres, conteos y SHA-256.

Los recuentos no siempre alternan prompt/respuesta: existen archivos con 10 prompts y 11 respuestas, y uno con 11/11. El modelo de archivo debe guardar una secuencia cronológica de mensajes de roles independientes.

**Dictamen de suficiencia:** el pool histórico de Harmonia no contiene cuerpos de mensajes, IDs nativos de mensaje, timestamps por mensaje ni modelo por respuesta. El content script existente cuenta nodos user/assistant, pero no serializa su contenido. El pool no puede reconstruir retroactivamente estos exports; el DOM visible de la conversación actual es una fuente potencial para ciclos futuros, aún pendiente de probar su cobertura y metadatos.

## 4. Contrato mínimo de calidad

1. Un solo archivo maestro por ID nativo de conversación, actualizado en cada ciclo.
2. Header con título, usuario/autor, ID/URL nativa, Created/Updated/Exported y procedencia/zona; nunca inventar valores no expuestos.
3. Mensajes cronológicos completos con rol, timestamp/modelo cuando estén disponibles, texto y formato Markdown enriquecido.
4. Preservar tablas, listas, citas, enlaces, bloques de código, imágenes, fórmulas, archivos y artefactos visibles.
5. Reconciliar ediciones/regeneraciones sin duplicar mensajes ni perder el orden.
6. Escritura atómica e idempotente, SHA-256 y lectura de vuelta; preservar el último snapshot completo ante fallos o DOM parcial.
7. No incluir cuerpos de conversación en JSONL, diagnósticos, GitHub, Groq ni ningún servicio externo.
8. Si el DOM está virtualizado, no declarar completitud ni sustituir el último archivo íntegro con una captura parcial.
9. Comparar el resultado con los siete exports originales antes de aceptar «calidad igual o superior».
10. Aceptación natural separada de pruebas sintéticas.

## 5. Relación con OMM-01-013

OMM-01-013 se conserva para procesar archivos de exportación oficial ya descargados y backfill histórico. OMM-FUT-007 define una ruta distinta: captura live, DOM visible de la conversación actual, persistencia local única por ID. La autorización D-040 se limita a ese alcance y no habilita endpoints privados, contenido oculto, telemetría de cuerpos o transporte externo.

La regla recurrente OMM-FUT-006 se ejecutó en paralelo: auditoría del pool, revisión de ejemplos, identificación de brechas y propuesta de criterio de aceptación. No se crea otra base/banco de observabilidad.

## 6. Estado documental y de ejecución

- OCP local **v0.82**; OCP anterior v0.81 preservado byte a byte.
- Especificación General **v1.2.0**; v1.1.0 preservada byte a byte.
- Registro de versiones actualizado: 0.4.9 baseline PRE-D039; 0.5.0 candidata local D-039; 0.6.0 planificada para OMM-FUT-007.
- OMM-FUT-007: **PROVISIONAL / NO IMPLEMENTADA**.
- Auditoría: evidencias/HARMONIA-AUDITORIA-CALIDAD-MARKDOWN-D040.md.
- No se creó el directorio de destino, no se añadió permiso de descarga, no se modificó código de Extension/Collector, ni se ejecutó el inicializador.
- No se instaló/recargó Chrome, no hay aceptación natural, BMO-01 NO ALCANZADO.
- Rama work/harmonia-front-workspace-20261110; HEAD 9fd5c18205e39b6db12c9152b07d8f880f6b256d. Sin commit, push, PR, merge, deploy o cambios en main.
- DUG Samantha v393 / NX-393m; commit 67014eb24244651b2e805079930d08082f0fc41c; GOW 2.21; discrepancia Metacanon 1.31/1.30 abierta; MCP normativo DESACTIVADO.

---
**Estado de esta salida B:** persistida para lectura de vuelta y SHA-256. No constituye implementación, aceptación, publicación ni folio global.
