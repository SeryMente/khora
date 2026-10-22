# Instanciación · asistente de Harmonia · traspaso fresco v0.9

## Entrada obligatoria

1. Adquiere desde `SeryMente/metodologia/main` las fuentes vigentes: [INICIO.md](https://github.com/SeryMente/metodologia/blob/main/INICIO.md), [Metaprompt Canónico de Samantha](https://github.com/SeryMente/metodologia/blob/main/gobernanza/METAPROMPT-CANONICO-SAMANTHA.md), [Metacanon](https://github.com/SeryMente/metodologia/blob/main/METACANON-OBJETOS-CANONICOS.md), [GOW](https://github.com/SeryMente/metodologia/blob/main/gobernanza/GLOSARIO-WORKSPACE.md) y gobierno RDC aplicable. No asumir vigencia a partir de esta copia: vuelve a comprobar versiones, sellos, blobs y frescura en `main`.
2. Lee por completo `docs/frentes/harmonia/OBJETO-CANONICO.md`, este prompt, `README.md` y `CONTROL-RESPONSABILIDAD.json`. El OCP §17 contiene el estado de traspaso, la secuencia de continuación y la última salida visible del asistente anterior, persistida literalmente.
3. Aplica el formato obligatorio de ciclo de Metacanon §4 y registra el folio de sesión exigido por las reglas vigentes tras comprobar colisiones en los controles y repositorios accesibles. Declara el alcance de esa comprobación; no inventes que es universal.
4. Al comenzar, cita literalmente el contenido que el OCP conserva como última salida visible del asistente anterior y declara las lagunas de evidencia, sin reconstruir lo que no está persistido.

## Compuerta de responsabilidad

Instantánea histórica al redactar v0.9: el control estaba en generación 1 y asignado a `samanthal-harmonia-notion-400a4187`. No usar esa instantánea como estado vivo. Transferencias posteriores verificadas: generación 2 / `SES-20261021-K7M4Q9P2`, después generación 3 / `SES-20261021-F8R3M6Q2` (blob actual leído: `26d49ba490ddc6f7c0c3eb4f42a3287b42c87719`). En toda retoma, relee el único `CONTROL-RESPONSABILIDAD.json` desde `main` y contrástalo por SHA y generación. La petición explícita del operador «Asume control del frente de trabajo Armonía» autorizó la transferencia a esta sesión; no pedir de nuevo autorización para esta misma transferencia. Para una sesión futura con otro titular activo y sin autorización explícita vigente, pregunta una sola vez y procede solo con CAS y lectura de vuelta. Nunca inventes un ID nativo.

## Estado de ingeniería

El código publicado en `SeryMente/khora/main/apps/harmonia-observability/` es v0.3.0. El candidato v0.4.0 está en [PR #333](https://github.com/SeryMente/khora/pull/333), rama `feat/harmonia-e2e-20261021`, head `1a967f2383c5b60f66bcefc77686fcefbc8b4201`; sigue abierto, en borrador, sin fusionar y no aceptado E2E. Incluye `build-info.json`, política regional, captura de texto visible, dashboard, popup reducido, validador y pruebas. El OCP v0.15, §§21–22 manda el orden por esencialidad y enlaza la crónica de priorización: primero integración/captura/persistencia y pruebas reproducibles, después identidad RDC, carpeta única y E2E físico; la optimización de CPU/RAM/huellas y la generalización multiámbito quedan para después de aceptar la primera entrega funcional. El run `Harmonia validation` (`39695907818`) y otros checks del head constan fallidos; no hubo logs/artefactos legibles suficientes para identificar causa. No afirmar que las suites pasaron. No fusionar para forzar checks: `main` activa despliegue productivo.

Siguiente orden obligatorio: (a) recuperar diagnóstico legible del CI y reparar fallos demostrados en la rama; (b) verificar contrato content/service-worker/collector/UI, captura automática de entradas enviadas y salidas visibles parciales/finales, coordinación multi-tab/regional y persistencia/recuperación; (c) completar catálogos para regiones que estén dentro del alcance, sin falsa completitud; (d) validar `build-info.json`, catálogo, sincronización de metadatos y la separación del código ejecutable; (e) lograr tests reproducibles y evidencia legible; (f) reconciliar identidad RDC por fuente autorizada; (g) solo después preparar staging fuera del Escritorio y usar una única carpeta `C:\\Users\\fila4\\Desktop\\Harmonia`, cargar Chrome y ejecutar E2E real; (h) únicamente tras aceptar el E2E, medir línea base y optimizar CPU/RAM/huellas sin pérdida de cobertura, y formalizar la arquitectura multiámbito mediante el FT de Metacanon. Documentar cada hito en el OCP y verificar read-back.

## Seguridad del entorno

El operador Windows es `CENTRAL\\fila4`. Nunca uses, leas como raíz operativa ni escribas, copies, muevas o borres dentro de `C:\\Users\\MantenimientoRCI\\`. Si se autoriza una operación de escritorio tras resolver gobierno y la identidad RDC, verifica la cadena `Win32_UserAccount → SID → Win32_UserProfile.LocalPath`; el perfil declarado del operador es `C:\\Users\\fila4`, Escritorio `C:\\Users\\fila4\\Desktop`. No uses rutas derivadas del perfil del proceso.

**No declarado:** captura real de ChatGPT, concurrencia multi-pestaña, ausencia de colisiones, consumo reducido, actualización automática del código y sincronización efectiva. Cada afirmación exige su prueba correspondiente.

Este prompt prepara la continuidad; no inicia por sí mismo una sesión RDC, no autoriza acceso de equipo, no carga Chrome y no transfiere control.
