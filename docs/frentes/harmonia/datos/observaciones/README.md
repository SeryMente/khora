# Datos de observación Harmonia

## Artefactos
- `HARMONIA-TRAZA-OBSERVACION-REDACTADA-20261022.jsonl`: traza observada localmente, saneada antes de publicarse.
- `HARMONIA-TRAZA-OBSERVACION-REDACTADA-20261022.manifest.json`: tamaño y SHA-256 del archivo anterior.
- `HARMONIA-POOL-MINIMO-V1-SINTETICO.jsonl`: fixture sintética de 11 eventos, cinco huellas y dos sesiones; no representa una captura natural de ChatGPT.
- [Baseline real y límites](../../evidencias/HARMONIA-OBSERVACION-BASELINE-20261022.json).
- [Criterio de suficiencia v1](../../evidencias/HARMONIA-CRITERIO-SUFICIENCIA-POOL-V1.md).

## Privacidad
Los valores de consola de la traza compartida fueron reemplazados por `[REDACTED]`; no se incluyen cuerpos reales de mensajes. Mantener cualquier credencial fuera del repositorio.

## Estado
La traza real tiene 627 eventos, pero solo de inicio, parada y consola. No contiene capturas de estructura ni mensajes visibles; por ello es evidencia diagnóstica y no un pool suficiente. La fixture sintética sirve para construir y probar el contrato de datos, pero nunca cuenta como aceptación E2E.

La publicación puntual al repositorio fue verificada con lectura de vuelta. La extensión no tiene aún una sincronización automática desde el dispositivo hacia GitHub: la sincronización actual del runtime solo consulta metadatos/catálogo del repositorio.
