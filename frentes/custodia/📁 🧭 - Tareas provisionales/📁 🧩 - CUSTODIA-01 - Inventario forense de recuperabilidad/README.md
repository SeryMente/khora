<!-- TASK_VERSION=0.3; TASK_STATUS=ACTIVE; PARENT=CUSTODIA-01; NOT_INDEPENDENT_CONTROL=true -->
# CUSTODIA-01 · Archivo de todos los registros recuperables

> **Estado:** EN CURSO · **Prioridad:** P0 · **Único expediente activo del frente CUSTODIA.**  
> **OCP padre:** [OBJETO-CANONICO.md](../../OBJETO-CANONICO.md).  
> **Control de responsabilidad:** [CONTROL-RESPONSABILIDAD.json](../../CONTROL-RESPONSABILIDAD.json).  
> **Índice provisional:** [LISTA-TAREAS-PROVISIONAL.md](../../LISTA-TAREAS-PROVISIONAL.md).

## 1. Objetivo vigente

Archivar todos los registros históricos de dictado/captura que puedan archivarse con el contenido existente, la titularidad comprobada y las autorizaciones aplicables. Al cerrar, deben quedar pendientes únicamente los registros que no puedan archivarse en este momento por un impedimento concreto y documentado.

El alcance es operativo y acotado al archivo de los registros que el sistema alcanzó a conservar. No incluye auditoría general de resiliencia, pruebas de nuevos dictados, escenarios sintéticos de fallo, reparación general de producto, rediseño de arquitectura ni certificación de que KHORA no pierde datos.

## 2. Reglas de archivo

1. Archivar cada unidad elegible sin duplicar Volcados ya existentes y sin sobrescribir la fuente.
2. Verificar cada resultado persistido con la lectura de vuelta y los cotejos disponibles; no considerar suficiente la respuesta HTTP ni un estado escrito en metadatos.
3. Mantener el estado de cada componente por separado: texto/checkpoint, cada parte de audio y MP3. Una parte archivada no convierte automáticamente toda la captura mixta en archivada.
4. Si hay transcripción y no se localiza audio, archivar el texto sin audio, con `Audio: No localizado` y `Procedencia: No verificada`. No afirmar que fue copy/paste ni inferir su origen.
5. Un objeto Vercel Blob localizado pero bloqueado por suspensión/cuota no equivale a audio inexistente. Debe permanecer registrado como existente/bloqueado; no marcarlo `No localizado`.
6. Para los 216 fragmentos locales de las dos sesiones identificadas, aplicar el mecanismo de KHORA, transferir a B2 y cotejar bytes/longitud/SHA antes de vincularlos; conservar intactos los originales locales. La decisión C fue autorizada expresamente por el operador.
7. No archivar bajo la cuenta del operador sesiones de otros titulares ni registros sin titularidad demostrada. No usar `reclamarSesion()` como prueba de titularidad histórica.
8. Excluir lo que ya está correctamente archivado y deduplicar por vínculos/identidad comprobable.
9. No inventar texto, audio, procedencia, titularidad, UUID, ID de Volcado, URL, SHA, tamaño ni estado de verificación.

## 3. Secuencia interna de CUSTODIA-01

Las siguientes fases son subunidades del expediente existente. No crean IDs maestros adicionales ni folios.

### CUSTODIA-01.a · Conciliación de candidatos y exclusiones

- Reunir sesiones, texto, revisiones, partes, MP3, localizadores, snapshots y Volcados.
- Confirmar propietario y excluir archivados/duplicados.
- Usar como única fuente local Chrome autorizada el perfil `Profile` vinculado a `the.willfreeman@gmail.com` en el equipo `PC10RCIF4EI4`; ignorar el otro perfil.
- Tratar los conteos heredados como línea base reportada hasta su nueva lectura.

### CUSTODIA-01.b · Archivo de texto sin audio localizado

- Archivar las transcripciones elegibles aunque no se localice audio, conforme a la instrucción del operador.
- Marcar audio como `No localizado` y procedencia como `No verificada`.
- No atribuirles origen copy/paste, voz ni otro canal sin evidencia.

### CUSTODIA-01.c · Archivo de audio B2

- Leer los objetos B2 de las sesiones elegibles.
- Cotejar bytes, longitud y SHA-256 del objeto leído frente al manifiesto y los datos de Neon.
- Archivar y vincular cada sesión/parte solo después del cotejo requerido.
- Si un objeto no se puede leer o no coincide, conservarlo como pendiente con el motivo preciso.

### CUSTODIA-01.d · Archivo de audio local autorizado (decisión C)

- Procesar los 216 fragmentos cifrados de dos sesiones con el mecanismo de descifrado propio de KHORA.
- No exponer claves ni texto/audio en logs o documentación.
- Escribir los objetos en B2 y validar la copia con read-back, longitud y SHA-256.
- Vincularlos a las sesiones correspondientes y preservar todos los registros/bytes locales originales.

### CUSTODIA-01.e · Casos con bloqueo actual

- Mantener identificados los objetos Vercel Blob que existen por referencia/listado pero no se pueden leer por suspensión/cuota.
- Mantener pendientes los registros con referencias B2 no cotejadas físicamente.
- Mantener separados los registros sin propietario demostrado y los que pertenecen a otros titulares.
- No convertir un bloqueo temporal en irrecuperabilidad ni borrar evidencia.

### CUSTODIA-01.f · Cierre de archivo y residuales

- Para cada registro, consignar estado final de archivo, componentes incluidos/faltantes, vínculos, prueba de lectura de vuelta y fecha.
- Retirar del conjunto pendiente solo los registros cuyo archivo haya sido verificado.
- Dejar como residuales únicamente los registros con impedimento actual, individualizado y sustentado, o sin contenido/titularidad demostrables.
- Conciliar el resultado con «Recuperar capturas»: archivados fuera, parciales/bloqueados visibles con el estado real y sin duplicaciones.

## 4. Estados de salida

| Estado | Criterio |
|---|---|
| ARCHIVADO_VERIFICADO | Volcado/vínculos persistidos y lectura de vuelta cotejada para los componentes archivados. |
| PARCIAL_ARCHIVADO | Se archivó un componente (por ejemplo, texto), pero otro componente de la misma captura sigue pendiente. |
| BLOQUEADO_AHORA | El contenido existe/localizador confirmado, pero un impedimento actual impide completar su archivo. |
| PENDIENTE_TITULARIDAD | Hay contenido o referencia, pero no está probada la titularidad que permita archivarlo bajo esta cuenta. |
| PENDIENTE_INTEGRIDAD | Existe referencia, pero falta lectura física o cotejo de integridad. |
| SIN_CONTENIDO_LOCALIZADO | Solo queda metadata/telemetría o no se localizó contenido tras inspeccionar fuentes pertinentes. |
| IRRESOLUBLE_EN_ESTE_MOMENTO | Se agotaron los pasos permitidos y el impedimento concreto impide archivarlo ahora; mantener evidencia y no borrar fuentes. |

Los estados se asignan por registro y por componente; no se infiere el estado de audio a partir del texto ni viceversa.

## 5. Límites y compuertas

- No auditar resiliencia general, probar nuevas capturas ni ejecutar fault injection/E2E ajenos al archivo histórico.
- No reparar código, UI, proveedor o datos como parte de este objetivo. Si el archivo requiere una modificación de producto no comprendida en el control vigente, documentar el bloqueo y no implementarla por inferencia.
- No migrar el histórico Vercel Blob a B2 como tarea de proveedor independiente; el objetivo es archivar registros elegibles. Los objetos Blob bloqueados permanecen intactos.
- No borrar ni sobrescribir fuentes locales, B2, Blob o Neon.
- La respuesta afirmativa del operador a la ampliación de autorización se registra en el OCP-v0.47 y en `CONTROL-RESPONSABILIDAD.json`, generación 11. Autoriza ejecutar el archivo de las sesiones elegibles de su cuenta, incluidas las escrituras de archivo en Neon Production, los read-back B2 y el procesamiento de las dos sesiones locales, dentro de este expediente.
- La autorización no permite borrar/sobrescribir originales, atribuir otros titulares, inspeccionar el perfil Chrome excluido, crear claves B2 adicionales ni mezclar credenciales EP.
- Eficiencia: agrupar consultas y lotes; reutilizar cotejos trazables de objetos inmutables; continuar ante fallos individuales. No omitir titularidad, no duplicación, SHA/longitud/bytes al copiar, idempotencia, read-back del archivo y preservación de fuentes.

## 6. Criterio de cierre

CUSTODIA-01 se resuelve cuando todos los registros elegibles están archivados y verificados, los ya archivados/duplicados están excluidos y solo quedan registros imposibles de archivar en el momento del cierre por bloqueos concretos y documentados, falta de titularidad o ausencia confirmada de contenido. Los bloqueos temporales se describen como actuales, no como pérdidas definitivas.

**Resultado final requerido:** archivo máximo no destructivo de todo lo recuperable con los medios y permisos vigentes, acompañado de una relación exacta de los únicos residuales que no se pueden archivar ahora.

## 7. Autorización operativa y eficiencia

La autorización específica de ejecución quedó confirmada por el operador en respuesta a la pregunta formal previa. Se conserva el literal y contexto en el OCP-v0.47 y en el original vinculado. La tarea puede avanzar con escrituras de archivo en Neon Production para registros elegibles, procesamiento de los 216 fragmentos locales y operaciones B2 incluidas en el alcance.

La optimización solicitada consiste en minimizar llamadas y rondas redundantes, agrupar lecturas y lotes, reutilizar evidencia de integridad cuando corresponda al mismo objeto inmutable y aislar fallos por registro. La calidad se conserva mediante controles críticos: titularidad, deduplicación, integridad de copias, idempotencia, lectura de vuelta y preservación de originales. No se realizan reparaciones generales ni pruebas de resiliencia.
