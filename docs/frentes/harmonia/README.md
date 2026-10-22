# Harmonia · carpeta canónica del frente

Entrada única de estado: [OBJETO-CANONICO.md](OBJETO-CANONICO.md). El OCP conserva estado vivo, decisiones, notas temporales, pruebas, historial breve y paquete de traspaso; no se debe crear una fuente de estado competidora.

- [Asistente · instancia fresca / traspaso v0.9](prompts/ASISTENTE.md): entrada, adquisición de gobierno, compuerta de titularidad y secuencia E2E.
- [Constructor · no instanciado](prompts/CONSTRUCTOR.md): ejecutar únicamente bajo su régimen y no utilizar Remote Desktop Commander.
- [Control exclusivo](CONTROL-RESPONSABILIDAD.json): actualmente asignado a la instancia y generación que constan en el JSON; no es un bootstrap sin propietario. Preparar el traspaso no transfiere la titularidad.
- [Originales](originales/PROCEDENCIA.md), [crónica](cronica/HARMONIA-INSTANCIACION-01.md) y [revisión](evidencias/HARMONIA-INSTANCIACION-01-revision.json).

## Fuente de código y aceptación

El código fuente en evolución se mantiene en `apps/harmonia-observability/` de `SeryMente/khora/main`. `main` permanece en v0.3.0 sin aceptación E2E; la candidata v0.4.0 está en [PR #333](https://github.com/SeryMente/khora/pull/333), en borrador y sin fusionar. El OCP §19 mantiene la auditoría técnica; **§21 es la secuencia operativa vigente: primero esenciales para la captura, integridad y E2E; optimizaciones CPU/RAM/huellas y generalización multiámbito solo después de aceptar la primera entrega**. La crónica del orden está en [HARMONIA-PRIORIZACION-SES-20261021-F8R3M6Q2.md](cronica/HARMONIA-PRIORIZACION-SES-20261021-F8R3M6Q2.md). No deducir sincronización entre `main`, paquete local y colector sin comparar huellas y probarlo.

No realizar operaciones en equipo remoto hasta reconciliar la discrepancia entre la identidad RDC observada en vivo y el registro global. No usar ni leer `C:\\Users\\MantenimientoRCI\\`; las rutas operativas autorizadas para el operador son explícitas y deben volver a verificarse antes de una acción local.

La formalización del criterio multiámbito de §16 sigue pendiente mediante el FT de Metacanon; sus notas siguen siendo temporales hasta entonces.
