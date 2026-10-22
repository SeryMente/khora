# Harmonia · carpeta canónica del frente

Entrada única de estado: [OBJETO-CANONICO.md](OBJETO-CANONICO.md). El OCP conserva estado vivo, decisiones, notas temporales, pruebas, historial breve y paquete de traspaso; no se debe crear una fuente de estado competidora.

- [Asistente · instancia fresca / traspaso v0.9](prompts/ASISTENTE.md): entrada, adquisición de gobierno, compuerta de titularidad y secuencia E2E.
- [Constructor · no instanciado](prompts/CONSTRUCTOR.md): ejecutar únicamente bajo su régimen y no utilizar Remote Desktop Commander.
- [Control exclusivo](CONTROL-RESPONSABILIDAD.json): actualmente asignado a la instancia y generación que constan en el JSON; no es un bootstrap sin propietario. Preparar el traspaso no transfiere la titularidad.
- [Originales](originales/PROCEDENCIA.md), [crónica](cronica/HARMONIA-INSTANCIACION-01.md) y [revisión](evidencias/HARMONIA-INSTANCIACION-01-revision.json).

## Fuente de código y aceptación

El código fuente publicado en `apps/harmonia-observability/` de `SeryMente/khora/main` sigue en v0.3.0 sin aceptación E2E. La candidata v0.4.0 está en [PR #333](https://github.com/SeryMente/khora/pull/333), abierta en borrador y sin fusionar. El OCP vigente es **v0.19**: §21 ordena los esenciales antes de lo no esencial y deja optimización al final; §23 registra el estado de integración/CI/RDC; §24 enlaza la propuesta multiámbito no aprobada; §25 conserva la propuesta UX/métricas y el protocolo de rendimiento posterior a E2E; §26 registra el refinamiento UX de la candidata (guía accesible para interpretar métricas) y sus límites de validación. Las propuestas de arquitectura y métricas están en [HARMONIA-MULTIAMBITO-ARQUITECTURA-CANDIDATA.md](https://github.com/SeryMente/khora/blob/feat/harmonia-e2e-20261021/docs/frentes/harmonia/propuestas/HARMONIA-MULTIAMBITO-ARQUITECTURA-CANDIDATA.md) y [HARMONIA-UX-METRICAS-RENDIMIENTO-CANDIDATA.md](https://github.com/SeryMente/khora/blob/feat/harmonia-e2e-20261021/docs/frentes/harmonia/propuestas/HARMONIA-UX-METRICAS-RENDIMIENTO-CANDIDATA.md). El refinamiento de UI no altera captura ni permisos. No inferir sincronización entre `main`, paquete local y colector sin comparar huellas y probarlo.

No realizar operaciones en equipo remoto hasta reconciliar la discrepancia entre la identidad RDC observada en vivo y el registro global. No usar ni leer `C:\\Users\\MantenimientoRCI\\`; las rutas operativas autorizadas para el operador son explícitas y deben volver a verificarse antes de una acción local.

La formalización del criterio multiámbito de §16 sigue pendiente mediante el FT de Metacanon; sus notas siguen siendo temporales hasta entonces.
