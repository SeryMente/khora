# Harmonia · regla operativa de aceptación local

- Ciclo: `HARMONIA-REGLA-ACEPTACION-LOCAL-SES-20261028-P9K4R7M2-20261029`.
- Fecha: 2026-10-29 (America/Mexico_City).
- OCP anterior: v0.28 / `HARMONIA-v0.28`, blob `88c2cbaec4b0f21bc00506e78ebd2913e5679b44`.
- Gobierno adquirido desde `SeryMente/metodologia/main`: DUG v362 / NX-362m, blob `b7593409c428e209d35f53a5f13501652208d949`; INICIO blob `3557bfe0ebd69e8520b11ec7733ed9f7e61daae5`; Metacanon 1.24 y GOW 2.11 integrados. `MCP-NORMATIVO: DESACTIVADO`. No se modificó el repositorio Metodología.
- Rama candidata inspeccionada: `feat/harmonia-e2e-20261021`, commit `1cb2a84b00dd4258db9482ff37ee9023f51a3270`; manifest MV3 v0.4.0. La candidata es fuente; no se asume como paquete ejecutado.

## Decisión del operador

El operador establece que la prueba local consiste en su propio uso del sistema real. El asistente se hace cargo de todos los demás trabajos y no debe trasladar al operador preparación, instalación técnica, automatización, diagnóstico o recolección de evidencias salvo la interacción natural que constituye su aceptación.

## Regla no sustituible

Las pruebas unitarias, integración del colector, fixtures, scripts, validaciones headless o automatización de Chrome pueden demostrar contratos y reducir riesgo, pero no cuentan como aceptación E2E. La aceptación requiere que el operador use Harmonia en su sesión habitual de Chrome y ChatGPT, con una conversación de prueba sin datos sensibles, y que el asistente valide los eventos persistidos y las evidencias posteriores. No iniciar Chrome headless para simular la aceptación ni manipular la sesión habitual del operador para reemplazarlo.

## Hechos de entorno en este ciclo

- La conexión RDC online muestra PC-8 con un UUID nuevo. Se verificó el mismo nombre de equipo, usuario Windows `PC-8\\PC 8` y perfil `C:\\Users\\PC 8` del entorno autorizado; no se seleccionó otro equipo.
- En este perfil no estaban presentes `Desktop\\Harmonia`, el clon temporal anterior ni el proceso del colector. Tampoco estaban instalados Git o GitHub CLI. No se asumieron como persistentes los artefactos de la sesión anterior.
- Se crearon los directorios de destino `C:\\Users\\PC 8\\Desktop\\Harmonia` y sus subdirectorios. Se recuperaron desde la rama remota los 28 archivos fuente de la aplicación. La materialización mediante escrituras RDC concurrentes quedó sin confirmación: varias llamadas permanecían pendientes y otras expiraron sin respuesta. Por ello, la copia física, las huellas del paquete, el runtime portable y el servicio quedan **NO VERIFICADOS** en este corte.
- No se abrió ni modificó la sesión habitual de Chrome; no hubo captura natural en esta sesión ni aceptación E2E.

## Dictamen

La regla del operador es permanente para el frente. E2E sigue **ABIERTA** hasta que el operador use el sistema. El siguiente trabajo del asistente es recuperar/estabilizar RDC sin duplicar escrituras, confirmar materialización, resolver las rutas portables, generar credencial local sin publicarla, validar scripts/código/pruebas/huellas, iniciar el colector, dejar preparada la extensión para carga visible por el operador y verificar después la captura, persistencia e idempotencia a partir de su uso real.
