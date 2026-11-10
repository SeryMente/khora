<!-- LIST_VERSION=0.33; LIST_STATUS=PROVISIONAL; NOT_A_CANONICAL_OBJECT=true -->
# Tareas vigentes · Frente Custodia

> **Estado:** PROVISIONAL · subordinado al [OCP único](OBJETO-CANONICO.md). Esta lista es el índice ejecutivo; no constituye un segundo estado canónico.
> **Actualización:** 2026-11-10 · reenfoque expreso del operador.
> **Único objetivo activo:** determinar qué dictados/archivos históricos existen y cuáles son recuperables, están bloqueados temporalmente, tienen solo referencia pendiente, son señales sin contenido o son irrecuperables después de agotar las fuentes pertinentes; conciliar ese universo con «Recuperar capturas».

**Instrucción literal:** [INSTRUCCION-REENFOQUE-INVENTARIO-RECUPERABILIDAD-20261110.md](originales/INSTRUCCION-REENFOQUE-INVENTARIO-RECUPERABILIDAD-20261110.md).  
**Evidencia inicial ya preservada:** [DIAGNOSTICO-PANEL-RECUPERACION-CORA-CUSTODIA-01-20261110.md](evidencias/DIAGNOSTICO-PANEL-RECUPERACION-CORA-CUSTODIA-01-20261110.md).  
**Salida literal del ciclo anterior:** [SALIDA-MODELO-CUSTODIA-RECUPERAR-CAPTURAS-CORA-20261110.md](originales/SALIDA-MODELO-CUSTODIA-RECUPERAR-CAPTURAS-CORA-20261110.md).

## 1. Único trabajo activo

| Orden | ID existente | Prioridad | Estado | Objetivo |
|---:|---|---|---|---|
| 1 | CUSTODIA-01 | P0 | EN CURSO | Inventario forense de dictados recuperables y conciliación del conjunto que debe mostrarse en «Recuperar capturas». |

Detalle: [CUSTODIA-01 · Inventario forense de recuperabilidad](./📁%20🧩%20-%20CUSTODIA-01%20-%20Inventario%20forense%20de%20recuperabilidad/README.md).

## 2. Desglose de fases de CUSTODIA-01

Las siguientes fases son subunidades internas del expediente existente CUSTODIA-01. No son nuevos expedientes maestros ni folios.

| Fase | Estado | Alcance |
|---|---|---|
| CUSTODIA-01.a | PENDIENTE | Inventario relacional: sesiones, checkpoint_text, revisiones, partes de audio, MP3 actuales/históricos, manifiestos y vínculos a Volcados. |
| CUSTODIA-01.b | PENDIENTE | Inventario físico remoto: B2, Vercel Blob, objetos huérfanos y prefijos staging; registrar existencia y accesibilidad por objeto. |
| CUSTODIA-01.c | PENDIENTE | Fuentes locales: IndexedDB del navegador/perfil original, snapshots, revisiones, audios y evidencia local de Aisthesis/Chrome. |
| CUSTODIA-01.d | PENDIENTE | Conciliación de identidad, hashes, URL, manifiestos, propietarios y exclusión de todo lo ya archivado; deduplicación documentada. |
| CUSTODIA-01.e | PENDIENTE | Clasificación individual: recuperable ahora, existe bloqueado, referencia sin cotejo físico, señal sin contenido, irrecuperable confirmado o fuente no inspeccionada. |
| CUSTODIA-01.f | PENDIENTE | Comparar el universo consolidado contra todas las tarjetas/páginas del panel y documentar omisiones, duplicados y conjunto esperado. |

## 3. Definiciones de estado

- **RECUPERABLE_AHORA:** el contenido existe y una lectura actual autorizada permite obtenerlo.
- **EXISTE_BLOQUEADO:** existe evidencia del objeto conservado, pero una restricción temporal/proveedor impide leerlo ahora; por ejemplo, Blob suspendido por cuota.
- **REFERENCIA_SIN_COTEJO_FISICO:** existe una referencia o manifiesto, pero la persistencia física actual aún no está demostrada.
- **SOLO_SEÑAL_SIN_CONTENIDO:** únicamente hay telemetría o metadatos de captura; no se localizó archivo/contenido.
- **IRRECUPERABLE_CONFIRMADO:** todas las fuentes pertinentes fueron inspeccionadas y no queda copia recuperable; exige evidencia de búsqueda y descarte.
- **NO_INSPECCIONADO:** la fuente no se consultó o no fue accesible. Nunca equivale a perdido.

El estado se determina por componente: texto/checkpoint y cada parte de audio/MP3. En capturas mixtas no se extrapola el estado de un componente al resto. Los objetos bloqueados no se declaran irrecuperables por esa sola causa.

## 4. Cierre de tareas provisionales anteriores

**Disposición:** RESUELTAS ADMINISTRATIVAMENTE POR REENFOQUE. El cierre retira esos trabajos del conjunto activo del frente; no afirma que cada objetivo técnico haya sido ejecutado, probado o aceptado. Sus documentos, código, resultados y límites históricos se conservan sin borrado.

| ID existente | Estado anterior | Disposición actual |
|---|---|---|
| CUSTODIA-03 | ABIERTA | RESUELTA POR REENFOQUE; el rescate/restauración de contenido queda fuera. Los candidatos históricos se inventarían como artefactos. |
| CUSTODIA-04 | EN CURSO | RESUELTA POR REENFOQUE; reparación/certificación del archivado queda fuera. No se declara E2E aprobado. |
| CUSTODIA-B2-001 | EN CURSO | RESUELTA POR REENFOQUE; la evidencia histórica de implementación se conserva. |
| CUSTODIA-B2-002 | DIFERIDA | RESUELTA POR REENFOQUE; no se hará migración ni backfill Blob→B2. |
| CUSTODIA-B2-003 | EN CURSO | RESUELTA POR REENFOQUE; no se ejecutará preflight ni trabajo de seguridad de proveedor como tarea independiente. |
| CUSTODIA-B2-004 | SUPERSEDIDA | RESUELTA POR REENFOQUE; conserva su condición histórica de supersedida. |
| CUSTODIA-B2-005 | DIFERIDA | RESUELTA POR REENFOQUE; se conserva el diagnóstico histórico de acceso Blob. |
| CUSTODIA-B2-006 | EN CURSO | RESUELTA POR REENFOQUE; la aceptación E2E autenticada sigue técnicamente pendiente y no se declara PASS. |
| CUSTODIA-B2-007 | DIFERIDA | RESUELTA POR REENFOQUE; no se realizará pulido de implementación. |
| CUSTODIA-RES-001 | PROPUESTA PENDIENTE | RESUELTA POR REENFOQUE; no se diseñará resiliencia multialmacén en este alcance. |
| CUSTODIA-RES-002 | PROPUESTA PENDIENTE | RESUELTA POR REENFOQUE; no se implementará ni certificará resiliencia multialmacén en este alcance. |

**CUSTODIA-02:** continúa RETIRADA; no se reactiva ni se reutiliza su identificador.  
**CUSTODIA-01:** único expediente activo. No se crea CUSTODIA-05 ni se generan nuevos identificadores maestros.

## 5. Exclusiones y límites del trabajo activo

No auditar la resiliencia general del producto; no probar nuevos dictados, escenarios de fallo ni flujos E2E; no reparar código, interfaz, datos o proveedor; no recuperar/restaurar contenido; no reclamar propietarios; no migrar/backfill; no actualizar referencias; no borrar ni sobrescribir objetos.

Se permiten únicamente lecturas e inventarios necesarios para determinar la existencia y recuperabilidad actuales de artefactos históricos, dentro de las autorizaciones disponibles. Si una fuente o un objeto no puede inspeccionarse, quedará expresamente NO_INSPECCIONADO o EXISTE_BLOQUEADO, nunca se supondrá su ausencia.

## 6. Criterio único de cierre de CUSTODIA-01

El frente se considerará resuelto cuando el inventario de todas las fuentes pertinentes esté cotejado, cada unidad de contenido tenga clasificación justificada, los archivos ya archivados estén excluidos sin duplicación y la lista esperada del panel coincida con sus tarjetas/páginas observadas. Las fuentes inaccesibles deben seguir identificadas como pendientes/bloqueadas; no se inventa un cierre de irrecuperabilidad.

La resolución de CUSTODIA-01 no requiere reparar ni modificar el producto. El resultado es documental: saber qué archivos sobreviven y cuáles pueden recuperarse hoy.
