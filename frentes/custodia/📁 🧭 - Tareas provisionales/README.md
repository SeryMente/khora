<!-- TASKS_README_VERSION=0.31; TASKS_STATUS=PROVISIONAL; PARENT_OCP=CUSTODIA; NO_INDEPENDENT_CONTROL=true -->
# Tareas vigentes · Frente Custodia

**Estado:** PROVISIONAL · índice subordinado al [OCP único](../OBJETO-CANONICO.md).  
**Control de responsabilidad:** [CONTROL-RESPONSABILIDAD.json](../CONTROL-RESPONSABILIDAD.json).  
**Actualización:** 2026-11-10 · reenfoque expreso del operador.

## Único objetivo activo

**CUSTODIA-01 — Inventario forense de dictados recuperables y conciliación del panel «Recuperar capturas».**

Se busca conocer qué archivos históricos existen, dónde están y su recuperabilidad actual. Se distinguen archivos que pueden obtenerse hoy, archivos existentes pero temporalmente bloqueados (por ejemplo, Vercel Blob bajo límite/suspensión), referencias aún no cotejadas físicamente, señales sin contenido, irrecuperables confirmados y fuentes no inspeccionadas.

No se audita la resiliencia general del sistema, no se prueban nuevos flujos de captura, no se repara nada y no se recuperan, migran ni eliminan archivos.

**Detalle de fases:** [CUSTODIA-01 · Inventario forense](./📁%20🧩%20-%20CUSTODIA-01%20-%20Inventario%20forense%20de%20recuperabilidad/README.md).  
**Instrucción literal:** [INSTRUCCION-REENFOQUE-INVENTARIO-RECUPERABILIDAD-20261110.md](../originales/INSTRUCCION-REENFOQUE-INVENTARIO-RECUPERABILIDAD-20261110.md).  
**Diagnóstico inicial:** [DIAGNOSTICO-PANEL-RECUPERACION-CORA-CUSTODIA-01-20261110.md](../evidencias/DIAGNOSTICO-PANEL-RECUPERACION-CORA-CUSTODIA-01-20261110.md).

## Estado de tareas provisionales anteriores

Todas las tareas provisionales anteriores distintas de CUSTODIA-01 quedan **RESUELTAS POR REENFOQUE** y fuera del trabajo activo. Es un cierre administrativo de alcance, no una declaración de que sus pruebas/implementaciones se hayan completado ni aceptado.

| ID | Disposición |
|---|---|
| CUSTODIA-03 / CUSTODIA-04 | RESUELTAS POR REENFOQUE |
| CUSTODIA-B2-001 a CUSTODIA-B2-007 | RESUELTAS POR REENFOQUE; B2-004 ya constaba supersedida |
| CUSTODIA-RES-001 / RES-002 | RESUELTAS POR REENFOQUE |

CUSTODIA-02 permanece RETIRADA. No se crean nuevos identificadores maestros ni se reutilizan los retirados.

## Expedientes históricos

Los directorios y evidencias de tareas anteriores permanecen disponibles como antecedentes, con el cierre administrativo señalado en cada README. No se borran ni se reinterpretan como pruebas de aceptación técnica.

## Regla de clasificación

- RECUPERABLE_AHORA.
- EXISTE_BLOQUEADO.
- REFERENCIA_SIN_COTEJO_FISICO.
- SOLO_SEÑAL_SIN_CONTENIDO.
- IRRECUPERABLE_CONFIRMADO.
- NO_INSPECCIONADO.

Una referencia no demuestra por sí sola la existencia física; una indisponibilidad temporal no demuestra pérdida. La irrecuperabilidad solo se concluye tras agotar las fuentes pertinentes.
