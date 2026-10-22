# Instanciación · asistente de Harmonia · traspaso fresco v0.9

## Entrada obligatoria

1. Adquiere desde `SeryMente/metodologia/main` las fuentes vigentes: [INICIO.md](https://github.com/SeryMente/metodologia/blob/main/INICIO.md), [Metaprompt Canónico de Samantha](https://github.com/SeryMente/metodologia/blob/main/gobernanza/METAPROMPT-CANONICO-SAMANTHA.md), [Metacanon](https://github.com/SeryMente/metodologia/blob/main/METACANON-OBJETOS-CANONICOS.md), [GOW](https://github.com/SeryMente/metodologia/blob/main/gobernanza/GLOSARIO-WORKSPACE.md) y gobierno RDC aplicable. No asumir vigencia a partir de esta copia: vuelve a comprobar versiones, sellos, blobs y frescura en `main`.
2. Lee por completo `docs/frentes/harmonia/OBJETO-CANONICO.md`, este prompt, `README.md` y `CONTROL-RESPONSABILIDAD.json`. El OCP §17 contiene el estado de traspaso, la secuencia de continuación y la última salida visible del asistente anterior, persistida literalmente.
3. Aplica el formato obligatorio de ciclo de Metacanon §4 y registra el folio de sesión exigido por las reglas vigentes tras comprobar colisiones en los controles y repositorios accesibles. Declara el alcance de esa comprobación; no inventes que es universal.
4. Al comenzar, cita literalmente el contenido que el OCP conserva como última salida visible del asistente anterior y declara las lagunas de evidencia, sin reconstruir lo que no está persistido.

## Compuerta de responsabilidad

Instantánea histórica al redactar v0.9: el control estaba en generación 1 y asignado a `samanthal-harmonia-notion-400a4187`. No usar esa instantánea como estado vivo. Transferencias posteriores verificadas: generación 2 / `SES-20261021-K7M4Q9P2`, después generación 3 / `SES-20261021-F8R3M6Q2` (blob actual leído: `26d49ba490ddc6f7c0c3eb4f42a3287b42c87719`). En toda retoma, relee el único `CONTROL-RESPONSABILIDAD.json` desde `main` y contrástalo por SHA y generación. La petición explícita del operador «Asume control del frente de trabajo Armonía» autorizó la transferencia a esta sesión; no pedir de nuevo autorización para esta misma transferencia. Para una sesión futura con otro titular activo y sin autorización explícita vigente, pregunta una sola vez y procede solo con CAS y lectura de vuelta. Nunca inventes un ID nativo.

## Estado de ingeniería

El código publicado en `SeryMente/khora/main/apps/harmonia-observability/` sigue siendo v0.3.0. El candidato v0.4.0 está en [PR #333](https://github.com/SeryMente/khora/pull/333), rama `feat/harmonia-e2e-20261021`, head `8b537bc96da32f601e56755fc16f480174ebed02`; sigue abierto, en borrador y sin fusionar. La corrección candidata separa el observador estructural único por región completada de la captura de deltas/consola de cada pestaña. La validación aislada obtuvo 22/22 comprobaciones estáticas, 9/9 archivos JS parseables y 12 aserciones de política; no equivale a ejecución Node ni E2E. Los runs actuales de Harmonia validation/CI fallan sin runner: job con `runner_id=0`, sin pasos, sin logs/artefactos recuperables. No atribuir una causa de código sin diagnóstico legible ni afirmar que la suite se ejecutó o pasó.

El OCP canónico actual es **v0.17**, §§21–24: [OBJETO-CANONICO.md](https://github.com/SeryMente/khora/blob/main/docs/frentes/harmonia/OBJETO-CANONICO.md). §21 define esenciales primero y optimización al final; §23 contiene la corrección multi-pestaña y los límites CI/RDC; §24 registra la propuesta multiámbito en [HARMONIA-MULTIAMBITO-ARQUITECTURA-CANDIDATA.md](https://github.com/SeryMente/khora/blob/feat/harmonia-e2e-20261021/docs/frentes/harmonia/propuestas/HARMONIA-MULTIAMBITO-ARQUITECTURA-CANDIDATA.md), que permanece documental, no aprobada, no vigente como arquitectura ni implementada.

Siguiente orden obligatorio: (a) recuperar/diagnosticar un runner CI real y corregir solo fallos demostrados; (b) validar contrato, captura automática, coordinación multi-tab, persistencia y recuperación con las suites reales; (c) reconciliar cuál UUID RDC está autorizado para Harmonia; (d) tras confirmación/autorización, preparar staging fuera del Escritorio, validar hashes y usar únicamente `C:\\Users\\fila4\\Desktop\\Harmonia`; (e) ejecutar en Chrome físico y aceptar E2E solo con evidencia; (f) continuar el diseño multiámbito y refinamiento de UX cuando no retrasen el E2E; (g) optimizar CPU/RAM/huellas/latencia únicamente al final, con línea base y sin pérdida de cobertura. No fusionar `main` para forzar checks porque activa despliegue productivo. Documentar cada hito y verificar read-back.

## Seguridad del entorno

El operador Windows es `CENTRAL\\fila4`. Nunca uses, leas como raíz operativa ni escribas, copies, muevas o borres dentro de `C:\\Users\\MantenimientoRCI\\`. Si se autoriza una operación de escritorio tras resolver gobierno y la identidad RDC, verifica la cadena `Win32_UserAccount → SID → Win32_UserProfile.LocalPath`; el perfil declarado del operador es `C:\\Users\\fila4`, Escritorio `C:\\Users\\fila4\\Desktop`. No uses rutas derivadas del perfil del proceso.

**No declarado:** captura real de ChatGPT, concurrencia multi-pestaña, ausencia de colisiones, consumo reducido, actualización automática del código y sincronización efectiva. Cada afirmación exige su prueba correspondiente.

Este prompt prepara la continuidad; no inicia por sí mismo una sesión RDC, no autoriza acceso de equipo, no carga Chrome y no transfiere control.
