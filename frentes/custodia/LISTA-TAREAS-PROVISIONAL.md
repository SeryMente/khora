<!-- LIST_VERSION=0.35; LIST_STATUS=PROVISIONAL; NOT_A_CANONICAL_OBJECT=true -->
# Tareas vigentes · Frente Custodia

> **Estado:** PROVISIONAL · subordinado al [OCP único](OBJETO-CANONICO.md). Esta lista es el índice ejecutivo; no constituye un segundo estado canónico.
> **Actualización:** 2026-11-10 · cambio expreso del objetivo del operador.
> **Único objetivo activo:** archivar todos los registros históricos que puedan archivarse; dejar pendientes únicamente los que tengan un impedimento actual, concreto y documentado.

**Instrucción literal:** [INSTRUCCION-ARCHIVO-RECUPERABILIDAD-20261110.md](originales/INSTRUCCION-ARCHIVO-RECUPERABILIDAD-20261110.md).  
**Salida literal preservada:** [SALIDA-MODELO-CUSTODIA-ARCHIVO-REGISTROS-20261110.md](originales/SALIDA-MODELO-CUSTODIA-ARCHIVO-REGISTROS-20261110.md).  
**Estado base:** [ESTADO-BASE-ARCHIVO-RECUPERABILIDAD-20261110.md](evidencias/ESTADO-BASE-ARCHIVO-RECUPERABILIDAD-20261110.md).  
**Diagnóstico previo:** [DIAGNOSTICO-PANEL-RECUPERACION-CORA-CUSTODIA-01-20261110.md](evidencias/DIAGNOSTICO-PANEL-RECUPERACION-CORA-CUSTODIA-01-20261110.md).

## 1. Único trabajo activo

| Orden | ID existente | Prioridad | Estado | Objetivo |
|---:|---|---|---|---|
| 1 | CUSTODIA-01 | P0 | EN CURSO | Archivar, sin duplicación y con verificación, todos los registros/capturas que puedan archivarse; dejar como pendientes solo los impedimentos actuales documentados. |

Detalle: [CUSTODIA-01 · Archivo de todos los registros recuperables](./📁%20🧭%20-%20Tareas%20provisionales/📁%20🧩%20-%20CUSTODIA-01%20-%20Inventario%20forense%20de%20recuperabilidad/README.md).

## 2. Desglose de fases de CUSTODIA-01

Las fases son subunidades internas del expediente existente, no nuevos expedientes maestros ni folios.

| Fase | Estado | Alcance |
|---|---|---|
| CUSTODIA-01.a | EN CURSO | Conciliar candidatos, propietarios, Volcados/archivados y duplicados; Chrome solo en el perfil autorizado `Profile` de `the.willfreeman@gmail.com` en `PC10RCIF4EI4`. |
| CUSTODIA-01.b | PENDIENTE | Archivar transcripciones sin audio localizado como texto; marcar `Audio: No localizado` y `Procedencia: No verificada`, sin inferir copy/paste. |
| CUSTODIA-01.c | EN CURSO | Leer y cotejar físicamente las partes B2 elegibles; archivar solo tras comprobar bytes, longitud y SHA-256. |
| CUSTODIA-01.d | EN CURSO | Procesar las 216 partes locales de dos sesiones conforme a autorización C, copiarlas a B2 con read-back y preservar originales. |
| CUSTODIA-01.e | EN CURSO | Registrar como bloqueados los Blob suspendidos, referencias sin read-back y registros sin titularidad demostrada; no declarar pérdida. |
| CUSTODIA-01.f | PENDIENTE | Verificar cada Volcado, retirar del pendiente lo archivado y dejar solo residuales actualmente no archivables con evidencia. |

## 3. Estados de salida

- **ARCHIVADO_VERIFICADO:** archivo y vínculos comprobados por lectura de vuelta.
- **PARCIAL_ARCHIVADO:** uno o más componentes archivados y otro componente de la misma captura pendiente.
- **BLOQUEADO_AHORA:** el contenido existe, pero un bloqueo actual impide terminar el archivo.
- **PENDIENTE_TITULARIDAD:** no se ha demostrado que el registro pertenezca a la cuenta que se archivaría.
- **PENDIENTE_INTEGRIDAD:** referencia existente, pero sin lectura física/cotejo actual suficiente.
- **SIN_CONTENIDO_LOCALIZADO:** solo señales o metadatos, sin texto/audio/archivo localizado.
- **IRRESOLUBLE_EN_ESTE_MOMENTO:** impedimento actual concreto, sustentado y no superable con las vías permitidas.

El estado se asigna por registro y componente. Un archivo parcial no se presenta como archivo íntegro. Blob localizado pero inaccesible no se etiqueta como audio inexistente.

## 4. Cierre de tareas provisionales anteriores

**Disposición:** RESUELTAS ADMINISTRATIVAMENTE POR REENFOQUE. El cierre retira esos trabajos del conjunto activo; no afirma que cada objetivo técnico haya sido ejecutado, probado o aceptado. Sus documentos, código, resultados y límites históricos se conservan sin borrado.

| ID existente | Estado anterior | Disposición actual |
|---|---|---|
| CUSTODIA-03 | ABIERTA | RESUELTA POR REENFOQUE; su evidencia histórica permanece disponible como insumo para el archivo actual. |
| CUSTODIA-04 | EN CURSO | RESUELTA POR REENFOQUE; no se declara E2E aprobado ni reparación aceptada. |
| CUSTODIA-B2-001 | EN CURSO | RESUELTA POR REENFOQUE; evidencia histórica conservada. |
| CUSTODIA-B2-002 | DIFERIDA | RESUELTA POR REENFOQUE; no se activa migración histórica Blob→B2. |
| CUSTODIA-B2-003 | EN CURSO | RESUELTA POR REENFOQUE; evidencia histórica conservada. |
| CUSTODIA-B2-004 | SUPERSEDIDA | RESUELTA POR REENFOQUE; conserva su condición histórica de supersedida. |
| CUSTODIA-B2-005 | DIFERIDA | RESUELTA POR REENFOQUE; diagnóstico histórico conservado. |
| CUSTODIA-B2-006 | EN CURSO | RESUELTA POR REENFOQUE; la aceptación E2E autenticada sigue técnicamente pendiente y no se declara PASS. |
| CUSTODIA-B2-007 | DIFERIDA | RESUELTA POR REENFOQUE; evidencia histórica conservada. |
| CUSTODIA-RES-001 | PROPUESTA PENDIENTE | RESUELTA POR REENFOQUE; resiliencia multialmacén fuera del alcance actual. |
| CUSTODIA-RES-002 | PROPUESTA PENDIENTE | RESUELTA POR REENFOQUE; resiliencia multialmacén fuera del alcance actual. |

**CUSTODIA-02:** continúa RETIRADA; no se reactiva ni se reutiliza su identificador.  
**CUSTODIA-01:** único expediente activo. No se crea CUSTODIA-05 ni se generan IDs maestros adicionales.

## 5. Límites y compuertas

No auditar resiliencia general ni probar nuevas capturas. No reparar código/datos/proveedores ni rediseñar arquitectura. No borrar, sobrescribir ni destruir originales. No atribuir registros sin titularidad demostrada. No duplicar lo archivado.

Se permite el archivo no destructivo de los registros elegibles, con verificación por componente. La lectura física, la copia local autorizada a B2 y los vínculos de archivo deben respetar el control generación 11 y sus compuertas de producción. La respuesta afirmativa del operador a la ampliación específica se conserva en el OCP y el control generación 11. Quedan autorizadas las escrituras de archivo en Neon Production dentro del alcance de CUSTODIA-01; se mantienen los controles mínimos de titularidad, idempotencia, integridad, read-back y preservación de originales.

## 6. Criterio único de cierre de CUSTODIA-01

El frente se considerará resuelto cuando todos los registros que pueden archivarse con los medios y permisos vigentes estén archivados y verificados, los registros ya archivados/duplicados estén excluidos y solo permanezcan casos actualmente imposibles de archivar por bloqueos concretos, falta de titularidad o ausencia confirmada de contenido. Cada residual debe tener evidencia, causa y componente afectado.

El cierre no requiere reparar el producto ni certificar su resiliencia. El resultado es un archivo máximo no destructivo y una lista exacta de lo que no se pudo archivar en este momento.

## 7. Autorización y política de ejecución · 2026-11-10

El operador confirmó la ampliación de autorización descrita en el OCP-v0.47. Se permite ejecutar el archivo de registros elegibles de su cuenta, incluidos los 216 fragmentos locales de las dos sesiones autorizadas, las partes B2 cotejadas y la creación/vinculación de Volcados en Neon Production. El alcance, los límites y la frase literal están preservados en el OCP y en `originales/INSTRUCCION-AUTORIZACION-ARCHIVO-PRODUCTION-20261110.md`.

**Eficiencia:** agrupar consultas, lecturas y operaciones por lotes; evitar verificaciones duplicadas cuando la evidencia vigente cubra el mismo objeto/versionado; aislar fallos por registro y continuar. No omitir titularidad, deduplicación, SHA/longitud/bytes de las copias, idempotencia, lectura de vuelta del archivo ni preservación de originales.
