# Telemetría de ciclos · RETIRADA

<badge>RETIRADA · NO USAR</badge>

Este documento es una referencia histórica de una implementación anterior. Sus contratos T1/T2, `client.cycle.started`, `client.cycle.completed`, `diag.cycle.trace`, `duration_ms`, medianas y percentiles ya no están vigentes.

El Metacanon vigente §52 desactiva el registro y estimación de duración de ciclos, latencia, procesamiento, tiempo activo, esperas y comparativas temporales. El runtime actual usa exclusivamente estados estructurales `ui.activity.state` y diagnósticos `diag.activity.trace`, sin calcular intervalos ni estadísticas temporales.

El código anterior fue preservado byte a byte en:

`Harmonia/archive/omm-fut-009-pre-correction-20261113/Collector/cycle-telemetry.js`

La implementación actual `Collector/cycle-telemetry.js` conserva únicamente una API de compatibilidad que rechaza cualquier intento de ejecutar el contrato retirado. La ruta HTTP `/cycles` y `/cycle-diagnostics` responde HTTP 410. La consulta PowerShell `-Cycles` se bloquea.

No restaurar este contrato por configuración ni reutilizar sus resultados históricos como métricas vigentes. Una eventual reactivación requiere una instrucción del operador y una revisión normativa independiente del §52; esta referencia no otorga autorización.
