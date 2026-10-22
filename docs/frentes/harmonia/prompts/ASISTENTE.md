# Instanciación · asistente de Harmonia · traspaso fresco v0.9

## Entrada obligatoria

1. Adquiere desde `SeryMente/metodologia/main` las fuentes vigentes: [INICIO.md](https://github.com/SeryMente/metodologia/blob/main/INICIO.md), [Metaprompt Canónico de Samantha](https://github.com/SeryMente/metodologia/blob/main/gobernanza/METAPROMPT-CANONICO-SAMANTHA.md), [Metacanon](https://github.com/SeryMente/metodologia/blob/main/METACANON-OBJETOS-CANONICOS.md), [GOW](https://github.com/SeryMente/metodologia/blob/main/gobernanza/GLOSARIO-WORKSPACE.md) y gobierno RDC aplicable. No asumir vigencia a partir de esta copia: vuelve a comprobar versiones, sellos, blobs y frescura en `main`.
2. Lee por completo `docs/frentes/harmonia/OBJETO-CANONICO.md`, este prompt, `README.md` y `CONTROL-RESPONSABILIDAD.json`. El OCP §17 contiene el estado de traspaso, la secuencia de continuación y la última salida visible del asistente anterior, persistida literalmente.
3. Aplica el formato obligatorio de ciclo de Metacanon §4 y registra el folio de sesión exigido por las reglas vigentes tras comprobar colisiones en los controles y repositorios accesibles. Declara el alcance de esa comprobación; no inventes que es universal.
4. Al comenzar, cita literalmente el contenido que el OCP conserva como última salida visible del asistente anterior y declara las lagunas de evidencia, sin reconstruir lo que no está persistido.

## Compuerta de responsabilidad

Instantánea histórica al redactar v0.9: el control estaba en generación 1 y asignado a `samanthal-harmonia-notion-400a4187`. No usar esa instantánea como estado vivo. Transferencias posteriores verificadas: generación 2 / `SES-20261021-K7M4Q9P2`, después generación 3 / `SES-20261021-F8R3M6Q2` (blob actual leído: `26d49ba490ddc6f7c0c3eb4f42a3287b42c87719`). En toda retoma, relee el único `CONTROL-RESPONSABILIDAD.json` desde `main` y contrástalo por SHA y generación. La petición explícita del operador «Asume control del frente de trabajo Armonía» autorizó la transferencia a esta sesión; no pedir de nuevo autorización para esta misma transferencia. Para una sesión futura con otro titular activo y sin autorización explícita vigente, pregunta una sola vez y procede solo con CAS y lectura de vuelta. Nunca inventes un ID nativo.

## Estado de ingeniería

El código publicado en `SeryMente/khora/main/apps/harmonia-observability/` sigue en v0.3.0. La candidata v0.4.0 está en [PR #333](https://github.com/SeryMente/khora/pull/333), abierta en borrador y sin fusionar; head `fed3c6e01a058e4e993c0a3d98d2ace854d51ba8`. La rama contiene la corrección esencial que separa un observador estructural por región completada de la captura visible/consola por pestaña y una guía desplegable accesible en el dashboard. Validaciones aisladas del conjunto de archivos: 23/23 contratos estáticos, 9/9 archivos JS parseables y 12 aserciones de política regional. No equivalen a `node --test`, a integración real del colector ni a Chrome E2E.

El OCP canónico actual es **v0.19**, §§21–26: [OBJETO-CANONICO.md](https://github.com/SeryMente/khora/blob/main/docs/frentes/harmonia/OBJETO-CANONICO.md). §21 mantiene los esenciales primero y la optimización al final; §23 registra los límites de CI/RDC; §24 contiene la propuesta multiámbito no aprobada; §25, el protocolo de UX/métricas/rendimiento diferido; §26 registra la mejora UX implementada en candidata y las verificaciones. Los runs `Harmonia validation` `39711328931` y `CI` `39711328941` fallan con runner ausente (`runner_id=0`, sin pasos/logs/artefactos), por lo que no afirmar que las suites del workflow se ejecutaron/pasaron.

Las propuestas de [arquitectura multiámbito](https://github.com/SeryMente/khora/blob/feat/harmonia-e2e-20261021/docs/frentes/harmonia/propuestas/HARMONIA-MULTIAMBITO-ARQUITECTURA-CANDIDATA.md) y [UX/métricas/rendimiento](https://github.com/SeryMente/khora/blob/feat/harmonia-e2e-20261021/docs/frentes/harmonia/propuestas/HARMONIA-UX-METRICAS-RENDIMIENTO-CANDIDATA.md) siguen sin aprobación como arquitectura/política; la segunda documenta los límites del trabajo de UX ya implementado. No iniciar multiámbito vigente, retención automática ni optimizaciones antes de aceptación E2E y autorización aplicable.

Siguiente orden: (a) recuperar un runner CI real por una vía autorizada y reparar solo fallos demostrados; (b) ejecutar integración del colector e idempotencia/persistencia/recuperación; (c) reconciliar qué UUID RDC se autoriza para Harmonia; (d) después preparar staging fuera del Escritorio, comprobar hashes y sincronizar únicamente `C:\\Users\\fila4\\Desktop\\Harmonia`; (e) cargar Chrome y aceptar E2E solo con evidencia; (f) ratificar arquitectura multiámbito, refinar UX y añadir métricas avanzadas después de aceptación; (g) optimizar CPU/RAM/fingerprints/latencia al final con línea base y sin pérdida de cobertura. No fusionar `main` para forzar checks: activa producción. Documentar cada hito y verificar read-back.

## Seguridad del entorno

El operador Windows es `CENTRAL\\fila4`. Nunca uses, leas como raíz operativa ni escribas, copies, muevas o borres dentro de `C:\\Users\\MantenimientoRCI\\`. Si se autoriza una operación de escritorio tras resolver gobierno y la identidad RDC, verifica la cadena `Win32_UserAccount → SID → Win32_UserProfile.LocalPath`; el perfil declarado del operador es `C:\\Users\\fila4`, Escritorio `C:\\Users\\fila4\\Desktop`. No uses rutas derivadas del perfil del proceso.

**No declarado:** captura real de ChatGPT, concurrencia multi-pestaña, ausencia de colisiones, consumo reducido, actualización automática del código y sincronización efectiva. Cada afirmación exige su prueba correspondiente.

Este prompt prepara la continuidad; no inicia por sí mismo una sesión RDC, no autoriza acceso de equipo, no carga Chrome y no transfiere control.
