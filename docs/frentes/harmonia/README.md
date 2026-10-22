# Harmonia · carpeta canónica del frente

Entrada única de estado: [OBJETO-CANONICO.md](OBJETO-CANONICO.md). El OCP conserva estado vivo, decisiones, notas temporales, pruebas, historial breve y paquete de traspaso; no se debe crear una fuente de estado competidora.

- [Asistente · instancia fresca / traspaso v0.9](prompts/ASISTENTE.md): entrada, adquisición de gobierno, compuerta de titularidad y secuencia E2E.
- [Constructor · no instanciado](prompts/CONSTRUCTOR.md): ejecutar únicamente bajo su régimen y no utilizar Remote Desktop Commander.
- [Control exclusivo](CONTROL-RESPONSABILIDAD.json): actualmente asignado a la instancia y generación que constan en el JSON; no es un bootstrap sin propietario. Preparar el traspaso no transfiere la titularidad.
- [Originales](originales/PROCEDENCIA.md), [crónica](cronica/HARMONIA-INSTANCIACION-01.md) y [revisión](evidencias/HARMONIA-INSTANCIACION-01-revision.json).

## Fuente de código y aceptación

El código publicado en `main` sigue en v0.3.0 sin aceptación E2E. La candidata v0.4.0 está en [PR #333](https://github.com/SeryMente/khora/pull/333), abierta en borrador y sin fusionar; el fix de persistencia local se encuentra en la rama candidata y pasó 5/5 pruebas Node locales. El OCP vigente es **v0.24**; §31 fija el criterio finito para el pool mínimo v1. Los artefactos reales saneados y la fixture sintética están en docs/frentes/harmonia/datos/observaciones/. La captura natural suficiente sigue pendiente; no confundir tests locales ni fixture con E2E de Chrome. Carpeta entregada: `C:\Users\PC 13\Desktop\Harmonia`; Chrome → Cargar descomprimida: `C:\Users\PC 13\Desktop\Harmonia\extension`. La extensión no se ha cargado ni probado naturalmente en Chrome; E2E sigue ABIERTA. La arquitectura multiámbito y UX/métricas siguen siendo propuestas no aprobadas. No inferir sincronización entre `main`, rama candidata y paquete local sin comparar huellas.

La entrega previa quedó registrada para `PC-14` / UUID `345f64ee-5d6a-429f-a97c-dab44f44cddb`, perfil `C:\\Users\\PC 13`; el inventario actual mostró ese UUID online. La discrepancia de la instantánea histórica se resuelve para aquella entrega, pero antes de cualquier nueva mutación remota se debe reconfirmar cuenta → SID → perfil según Sam P036. Nunca usar ni leer `C:\\Users\\MantenimientoRCI\\` como raíz operativa.

La formalización del criterio multiámbito de §16 sigue pendiente mediante el FT de Metacanon; sus notas siguen siendo temporales hasta entonces.


## Continuidad activa · SES-20261022-R8Q4N6P1

Control exclusivo: generación 5, folio activo `SES-20261022-R8Q4N6P1`, blob `ac797019939f2f93dcbe2c98b73b36d71b30a900`; titularidad leída de vuelta y verificada. La unicidad global del folio no está verificada fuera de los repositorios y controles accesibles. Estado siguiente: no crear otra carpeta; hacer la prueba E2E de Chrome con la carpeta ya entregada, y mantener las optimizaciones para después.


## Entrega del pool mínimo suficiente — SES-20261022-R8Q4N6P1

[Traza real saneada](datos/observaciones/HARMONIA-TRAZA-OBSERVACION-REDACTADA-20261022.jsonl) y [manifiesto](datos/observaciones/HARMONIA-TRAZA-OBSERVACION-REDACTADA-20261022.manifest.json) están guardados en main. La traza tiene 627 eventos (611 de consola, 10 de inicio, 6 de parada), cero malformados y no contiene eventos estructurales ni mensajes visibles. [Fixture sintética](datos/observaciones/HARMONIA-POOL-MINIMO-V1-SINTETICO.jsonl) aporta 11 eventos de diseño, cinco huellas y dos sesiones; no demuestra captura real. Ver [baseline](evidencias/HARMONIA-OBSERVACION-BASELINE-20261022.json) y [criterio de suficiencia](evidencias/HARMONIA-CRITERIO-SUFICIENCIA-POOL-V1.md).

La publicación puntual quedó verificada por lectura de vuelta exacta. La publicación automática recurrente desde la extensión no está implementada; el worker sincroniza metadatos de solo lectura y no sube observaciones.
