# Auditoría de calidad Markdown · D-040 · OMM-FUT-007

**Frente:** Harmonia  
**Ciclo local UUIDv7:** `01a1d662-73ef-7bfa-8b1c-763b791c81f2`  
**Conversación local UUIDv7:** `01a1d662-73ec-7739-ab98-03175385887b`  
**Fecha de corte:** 2026-11-13 · America/Mexico_City  
**Muestra:** archivos `ChatGPT-*.md` ubicados en `C:\Users\fila4\Downloads`.  
**Propósito:** convertir la expresión «calidad igual o superior» en un contrato de aceptación para el archivador automático por conversación.

## 1. Dictamen

Los siete archivos representativos examinados son documentos Markdown estructurados de conversación, no simples volcados de texto. Sus tamaños van de 42,368 a 137,831 bytes y contienen entre 899 y 2,466 líneas. Todos incluyen título, autor/usuario, fechas de creación/actualización/exportación y URL nativa de la conversación; las cabeceras de cada mensaje contienen rol y marca temporal, y las respuestas incluyen el identificador de modelo. Se preservan encabezados, listas, tablas, código, enlaces, citas y, en los casos que los usan, imágenes.

**La observabilidad histórica existente no permite reproducir esos documentos.** En `content.js`, el observador obtiene los nodos `[data-message-author-role="user"]` y `assistant` para calcular conteos y ciclos, pero no extrae ni serializa sus cuerpos. El pool local de 3,190 eventos tampoco conserva contenido conversacional, ID nativo de cada mensaje, marca de tiempo de cada mensaje, ni modelo por respuesta. Esos datos no pueden reconstruirse retrospectivamente desde el JSONL de observabilidad.

La página de ChatGPT sí es la fuente disponible para nuevas capturas: el nuevo proceso deberá leer el contenido renderizado de la conversación actual al avanzar cada ciclo y escribirlo exclusivamente en local. La implementación debe probar que el DOM entrega la conversación completa; si no, no debe declarar el archivo completo ni sobrescribir una captura íntegra anterior con una parcial.

## 2. Corpus de referencia

Los hashes se calcularon directamente sobre los originales de Downloads. Los archivos no se copiaron a este repositorio ni se incorporó su texto privado a las pruebas.

| Archivo fuente | Bytes | Líneas | Prompts | Respuestas | Encabezados | Líneas de tabla | Bloques de código | Enlaces | Imágenes | SHA-256 |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---|
| `ChatGPT-HARMONIA-20261113-1145.md` | 61,667 | 1,337 | 10 | 10 | 60 | 74 | 10 | 15 | 0 | `5BC0508F50345EA48858DA6EA69C1A3A58B8DD7CC9A4165813CBD167ED43543B` |
| `ChatGPT-EP-20261113-0958.md` | 42,368 | 899 | 10 | 11 | 40 | 60 | 8 | 9 | 0 | `17E8F33F3425C7B2DF2ADC859EEC36D02D8B956FEC1B9247AEDA4C3955E7380A` |
| `ChatGPT-GOBERNANZA (1)-20261113-1232.md` | 101,702 | 1,584 | 11 | 11 | 81 | 144 | 2 | 34 | 0 | `DB1FEAFC9F1EA3744F723330640905DAE03F0BF4C72D6C636F34207F405A6020` |
| `ChatGPT-NOTAS-20261112-1630.md` | 71,289 | 1,449 | 10 | 10 | 64 | 66 | 4 | 67 | 7 | `64F9C78D4D9AB05E3FC55FAE15C0DF474A59ED8945BB5B6418DCB827E67C93DA` |
| `ChatGPT-Product Design-20261113-1212.md` | 137,831 | 2,466 | 10 | 11 | 96 | 159 | 0 | 80 | 12 | `506947C3E0497FB5BB731193A9F6ADE45D90F948D8A647E45D0643BF99AC7C7E` |
| `ChatGPT-PRODUCT-20261113-0951.md` | 70,481 | 1,320 | 10 | 10 | 59 | 94 | 0 | 27 | 1 | `8C918DBB8B572D69A1058C37DCD88ED01E6DE68C8A3E985E82C6FB0AC8A75BF3` |
| `ChatGPT-SI (1)-20261113-0956.md` | 70,098 | 1,166 | 10 | 10 | 58 | 55 | 10 | 52 | 0 | `C65FEF93296745DCA3D148975B8376CE330DAF5ED10009148D5E698FB04989CE` |

### 2.1. Invariantes comunes observados

- Los siete archivos tienen `# <título>`, `**User:**`, `**Created:**`, `**Updated:**`, `**Exported:**` y `**Link:**`.
- Todos los prompts de la muestra tienen marca temporal en su encabezado.
- Todas las respuestas de la muestra tienen marca temporal y etiqueta de modelo.
- Todos conservan el pie `Powered by [ChatGPT Exporter](...)`. La candidata Harmonia no debe atribuirse a esa herramienta; su pie será propio.
- Todos están en UTF-8 sin BOM, usan LF, no terminan en salto de línea y no contienen U+FFFD.
- Todos los bloques de código medidos están balanceados.
- Hay contenido multimodal: el ejemplo más amplio tiene 12 imágenes y 80 enlaces; otro tiene 7 imágenes y 67 enlaces.
- Los ejemplos contienen recuentos de respuestas que no siempre coinciden con el de prompts. EP y Product Design tienen 11 respuestas y 10 prompts; Gobernanza tiene 11/11. Por tanto, los mensajes son una secuencia cronológica con roles independientes; no deben agruparse suponiendo parejas Prompt/Response.
- Los valores de `Created/Updated/Exported` son fechas locales del exportador. El archivador debe preservar su zona y procedencia cuando estén disponibles, sin reinterpretar un timestamp desconocido como UTC.

## 3. Contrato de calidad para OMM-FUT-007

### 3.1. Documento

Cada conversación nativa tiene exactamente un archivo Markdown maestro, cuyo nombre estable deriva del ID nativo de conversación, no del título ni de la fecha. La ruta propuesta es:

`%USERPROFILE%\Downloads\Harmonia-Conversations\<conversation-id>.md`

La ubicación es propuesta de diseño y debe confirmarse al implementar; no se crea todavía el directorio ni se instalan permisos de escritura adicionales. Se podrán agregar metadatos de frente cuando exista una asociación explícita, pero no se crea una copia distinta por frente.

### 3.2. Cabecera y procedencia

El documento tendrá como mínimo:

- Título actual de la conversación.
- Usuario/autor según lo que la interfaz exponga; no inferir identidad real.
- ID nativo de conversación y URL canónica.
- Created, Updated y Exported, con zona horaria y fuente tipadas.
- Estado de captura: completa/parcial y ciclo local que produjo la última versión íntegra.
- Pie de procedencia `Powered by Harmonia`.

Si la interfaz no expone un campo —por ejemplo Created histórico, hora por mensaje o modelo de una respuesta— se declarará «no expuesto por la interfaz» o se conservará el último dato verificable. No se inventarán horas ni modelos para igualar el ejemplo. Una diferencia material frente al benchmark debe quedar visible y bloquear la aceptación de «calidad igual o superior» hasta resolverla o aprobar expresamente la limitación.

### 3.3. Mensajes

- Preservar todos los mensajes visibles de usuario y asistente en su orden cronológico real, con rol y timestamp/model cuando estén expuestos.
- No imponer alternancia uno-a-uno entre Prompt y Response.
- Mantener los identificadores nativos de mensaje como clave de reconciliación cuando la interfaz los exponga; no confundirlos con UUIDv7 locales de Harmonia.
- Reconciliar mensajes editados/regenerados por identidad/posición, evitando duplicados y conservando la versión vigente visible.
- No capturar el contenido oculto que la página no renderiza ni datos de otras conversaciones.

### 3.4. Markdown enriquecido

La serialización debe conservar, cuando estén presentes: encabezados, párrafos, negrita/cursiva, tachado, listas ordenadas y no ordenadas, citas, tablas, inline code, fenced code con lenguaje, enlaces, citas y referencias, imágenes, fórmulas/math, archivos/artefactos y saltos semánticos. No convertir toda la respuesta a texto plano ni perder URLs de enlaces visibles.

Los bloques de código deben quedar balanceados y conservar el lenguaje si está indicado. Las tablas deben preservar filas/columnas. Las imágenes deben mantener una referencia funcional y su texto alternativo cuando exista. El caso de imágenes/artefactos con URL temporal o blob deberá probarse antes de decidir si se incrustan o se referencia un recurso local; no crear archivos Markdown adicionales por ciclo.

### 3.5. Actualización por ciclo y unicidad

- Al iniciar un ciclo se puede guardar un checkpoint que incluya el prompt del usuario con estado `IN_PROGRESS`.
- Al completar la respuesta se vuelve a serializar la conversación y se reemplaza el mismo archivo, marcando `COMPLETE`.
- Cada ciclo reescribe el documento completo desde el snapshot actual o reconcilia un modelo estructurado por IDs; no concatena ciegamente el documento anterior.
- El archivo final se escribe de forma atómica (temporal, flush, validación, replace), idempotente y con SHA-256. La lectura de vuelta debe coincidir con bytes y hash.
- No se generan copias `-cycle-2`, backups Markdown ni un archivo por cada mensaje. Las versiones de ciclo se reflejan en metadatos y en la trazabilidad local.
- Si el DOM está incompleto/virtualizado o la serialización falla, no reemplazar un archivo completo con una captura parcial. Registrar el estado como pendiente para reintento en el siguiente ciclo.

### 3.6. Privacidad y transporte

- Leer solo contenido renderizado en la conversación actual de `https://chatgpt.com`, en el contexto del usuario que ha autorizado el archivado.
- Guardar el cuerpo de la conversación únicamente en el archivo local. No incluirlo en el pool JSONL de observabilidad ni en diagnósticos.
- Transportar el snapshot únicamente al colector loopback autenticado de Harmonia para escritura local. No enviar el texto a GitHub, Groq, servicios externos, métricas ni telemetría remota.
- No leer APIs privadas no documentadas, cookies, local/session storage de ChatGPT, estado interno de React, prompts de sistema no visibles ni conversaciones de terceros.
- El usuario debe poder desactivar el archivado; el estado y la última persistencia deben ser visibles y verificables.
- No borrar exports originales ni alterar los siete archivos de referencia.

## 4. Evaluación de suficiencia de los datos

| Dato requerido | Banco heredado | Fuente futura | Suficiencia actual |
|---|---|---|---|
| ID y URL nativos de conversación | Solo referencias de pestaña; rutas anonimizadas | Ruta visible de la pestaña ChatGPT | Insuficiente en histórico; disponible para ciclos futuros |
| Roles y conteos | Conteos de nodos user/assistant | DOM visible | Parcial |
| Cuerpo de cada mensaje | No se persiste | DOM de la conversación actual | No disponible en pool; requiere nuevo serializador local |
| Timestamp por mensaje | No se persiste | Hora expuesta en UI, o primera observación local | Insuficiente; no inferir |
| Modelo por respuesta | No se persiste | Elemento visible asociado a respuesta cuando exista | Insuficiente; validar viabilidad |
| Estructura Markdown | No se persiste | DOM estructurado de cada mensaje | Insuficiente; requiere convertidor |
| Imágenes/archivos/artefactos | Solo presencia estructural agregada | URLs/nodos visibles y recursos asociados | Parcial; validar persistencia/enlaces |
| Actualización por ciclo | Diagnósticos, no snapshot completo | Eventos de ciclo existentes | Parcial; falta serialización/persistencia |
| Un archivo por conversación | No existe archivo maestro generado por ciclo | Colector local + ID nativo | Insuficiente; requiere escritor atómico |

**Conclusión:** el pool actual no puede generar el documento que solicita el operador. La fuente suficiente para la nueva captura es el DOM de la conversación actual más las señales de ciclo ya existentes. Es factible iniciar la solución desde el contenido renderizado, pero la equivalencia total en timestamps/modelos e imágenes permanece pendiente de una prueba natural del serializador. El trabajo debe medir esas brechas antes de declarar calidad igual o superior.

## 5. Puerta de aceptación comparativa

La aceptación requiere:

1. Al menos tres conversaciones de prueba de complejidad distinta: simple, larga/rica en tablas/código, y multimodal con imágenes/archivos.
2. Para cada una, un snapshot de referencia sin modificar y un archivo Harmonia generado; comparación de todos los mensajes visibles, roles, orden, timestamps/modelo expuestos y estructura Markdown.
3. Cero mensajes perdidos o duplicados, cero corrupción de código/tablas/enlaces, cero bloques de código sin cerrar.
4. Imagen, cita y artefacto conservados de forma funcional o diferencia explícitamente documentada.
5. Mismo archivo por conversación después de varios ciclos, con hash distinto cuando hubo cambio de contenido y hash idéntico cuando no hubo cambio.
6. Interrupción durante escritura no debe destruir el último archivo completo.
7. Reinicio del navegador/colector debe poder recuperar la asociación e identidad de conversación sin duplicar el archivo.
8. El cuerpo del mensaje no aparece en JSONL, diagnósticos ni transporte externo.
9. Comparación final con los siete exports de referencia y reporte de diferencias materiales.
10. Aceptación natural y read-back del archivo local; pruebas sintéticas no bastan.

## 6. Estado de la propuesta

- La tarea se documenta como provisional `OMM-FUT-007`.
- La candidata de extensión existente sigue siendo 0.5.0; esta tarea no cambia todavía manifest, build-info ni código.
- La versión objetivo del siguiente esfuerzo será 0.6.0, pendiente de implementación y aceptación.
- La tarea existente OMM-01-013 se conserva para procesamiento/importación de exportaciones oficiales ya descargadas y trabajo histórico. OMM-FUT-007 es una ruta nueva, en vivo y limitada a la conversación actual; el alcance local y visible queda autorizado por D-040, sin acceso a endpoints privados ni contenido oculto.
- La ubicación `Downloads\Harmonia-Conversations` es propuesta, no un destino ejecutado.
- La regla recurrente OMM-FUT-006 se aplicó a esta tarea: se evaluó el pool antes de ampliar la observación. La brecha concreta es la ausencia de cuerpos/estructura de mensajes y de un escritor Markdown persistente. No se crea otro banco de observabilidad; el contenido vive en el archivo por conversación.

