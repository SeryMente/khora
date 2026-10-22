# Instanciación · asistente de Harmonia · traspaso fresco v0.9

## Entrada obligatoria

1. Adquiere desde `SeryMente/metodologia/main` las fuentes vigentes: [INICIO.md](https://github.com/SeryMente/metodologia/blob/main/INICIO.md), [Metaprompt Canónico de Samantha](https://github.com/SeryMente/metodologia/blob/main/gobernanza/METAPROMPT-CANONICO-SAMANTHA.md), [Metacanon](https://github.com/SeryMente/metodologia/blob/main/METACANON-OBJETOS-CANONICOS.md), [GOW](https://github.com/SeryMente/metodologia/blob/main/gobernanza/GLOSARIO-WORKSPACE.md) y gobierno RDC aplicable. No asumir vigencia a partir de esta copia: vuelve a comprobar versiones, sellos, blobs y frescura en `main`.
2. Lee por completo `docs/frentes/harmonia/OBJETO-CANONICO.md`, este prompt, `README.md` y `CONTROL-RESPONSABILIDAD.json`. El OCP §17 contiene el estado de traspaso, la secuencia de continuación y la última salida visible del asistente anterior, persistida literalmente.
3. Aplica el formato obligatorio de ciclo de Metacanon §4 y registra el folio de sesión exigido por las reglas vigentes tras comprobar colisiones en los controles y repositorios accesibles. Declara el alcance de esa comprobación; no inventes que es universal.
4. Al comenzar, cita literalmente el contenido que el OCP conserva como última salida visible del asistente anterior y declara las lagunas de evidencia, sin reconstruir lo que no está persistido.

## Compuerta de responsabilidad

Instantánea histórica al redactar v0.9: generación 1. Transferencias verificadas después: gen2 / `SES-20261021-K7M4Q9P2`, gen3 / `SES-20261021-F8R3M6Q2`, gen4 / `SES-20261022-H6Q2V9C4`, gen5 / `SES-20261022-R8Q4N6P1`. Estado vivo de control confirmado en main: blob `ac797019939f2f93dcbe2c98b73b36d71b30a900`, generación 5, folio activo `SES-20261022-R8Q4N6P1`, alias `chatgpt-harmonia-SES-20261022-R8Q4N6P1`; commit de transferencia gen5 `822c09b59cba59e7ae8c4ddfd959502367e7af6c`. La titularidad fue sustituida mediante CAS y lectura de vuelta. Para una retoma futura con otro titular activo, pregunta una sola vez y procede solo con autorización explícita, CAS y read-back. Nunca inventes un ID nativo.

## Estado de ingeniería

El código publicado en `SeryMente/khora/main/apps/harmonia-observability/` sigue en v0.3.0. La candidata v0.4.0 está en [PR #333](https://github.com/SeryMente/khora/pull/333), abierta en borrador y sin fusionar; head `d0bc715c7350847e03e53d09274804c4b8ffcce1`. Se corrigió un fallo reproducible del colector que causaba HTTP 400/ENOENT al anexar JSONL sin directorio diario. La corrección está en la rama candidata, con `sourceRevision=7e405a7be004c7df80886a7a38387e539465d426`. CI local con Node portable: 9/9 archivos parseables, `HARMONIA_SOURCE_CONTRACT_OK`, 5/5 pruebas. Esto no equivale a cargar Chrome ni a completar E2E.

El OCP canónico actual es **v0.23**, §§21–30: [OBJETO-CANONICO.md](https://github.com/SeryMente/khora/blob/main/docs/frentes/harmonia/OBJETO-CANONICO.md). §21 define esenciales primero y optimización al final; §23 contiene la corrección esencial y bloqueos; §§24–25 contienen propuestas no aprobadas de arquitectura multiámbito y UX/métricas; §26 registra el glosario UX implementado en la candidata; §27 documenta el diagnóstico del runner. Los runs `Harmonia validation` `39711328931` y `CI` `39711328941` fallan antes del primer paso: el job `119603101763` tiene `runner_id=0`, sin nombre de runner, sin pasos ni artefactos descargables. En el ciclo SES-20261022-H6Q2V9C4 también fallaron antes de ejecutar pasos los workflows de main `sync-repos` `39810037478` e `Integrity Manifest Refresh` `39810037422`. El estado público de GitHub muestra Actions operativo; la causa concreta y su relación con la configuración del repositorio/organización siguen NO DETERMINADAS. El detalle y las estimaciones por hito están en §28.

La arquitectura multiámbito y la propuesta UX/métricas están en [HARMONIA-MULTIAMBITO-ARQUITECTURA-CANDIDATA.md](https://github.com/SeryMente/khora/blob/feat/harmonia-e2e-20261021/docs/frentes/harmonia/propuestas/HARMONIA-MULTIAMBITO-ARQUITECTURA-CANDIDATA.md) y [HARMONIA-UX-METRICAS-RENDIMIENTO-CANDIDATA.md](https://github.com/SeryMente/khora/blob/feat/harmonia-e2e-20261021/docs/frentes/harmonia/propuestas/HARMONIA-UX-METRICAS-RENDIMIENTO-CANDIDATA.md); siguen sin aprobación como arquitectura/política vigente. No ejecutar optimizaciones antes de la aceptación E2E.

Siguiente orden vigente (§30): (a) no crear otra carpeta: la última evidencia persistida registra la candidata v0.4.0 en `C:\\Users\\PC 13\\Desktop\\Harmonia`, con extensión en `C:\\Users\\PC 13\\Desktop\\Harmonia\\extension`; (b) cargar manualmente la carpeta `extension` mediante `chrome://extensions` → «Cargar descomprimida» y ejecutar una conversación de prueba sin datos sensibles; (c) comprobar eventos reales, varias pestañas, persistencia/reinicio, índice y consulta permitida desde otro hilo; (d) cerrar la aceptación E2E solo con evidencia observada; (e) continuar con arquitectura multiámbito, UX/métricas y optimización únicamente después. GitHub Actions continúa con causa raíz NO DETERMINADA; no reintentar ciegamente ni atribuirlo a código. Antes de cualquier nueva operación RDC, verificar en el equipo actual cuenta → SID → perfil exacto conforme a Sam P036 y no derivar rutas del usuario del proceso remoto. No fusionar `main` para forzar checks: activa producción. Documentar cada paso y verificar read-back.

## Seguridad del entorno

El operador Windows es `CENTRAL\\fila4`. Nunca uses, leas como raíz operativa ni escribas, copies, muevas o borres dentro de `C:\\Users\\MantenimientoRCI\\`. Si se autoriza una operación de escritorio tras resolver gobierno y la identidad RDC, verifica la cadena `Win32_UserAccount → SID → Win32_UserProfile.LocalPath`; el perfil declarado del operador es `C:\\Users\\fila4`, Escritorio `C:\\Users\\fila4\\Desktop`. No uses rutas derivadas del perfil del proceso.

**No declarado:** captura real de ChatGPT, concurrencia multi-pestaña, ausencia de colisiones, consumo reducido, actualización automática del código y sincronización efectiva. Cada afirmación exige su prueba correspondiente.

Este prompt prepara la continuidad; no inicia por sí mismo una sesión RDC, no autoriza acceso de equipo, no carga Chrome y no transfiere control.


## Entrega actual y regla anti-loop — folio SES-20261022-R8Q4N6P1

El paquete Harmonia v0.4.0 está en `C:/Users/PC 13/Desktop/Harmonia`; la carpeta de extensión que el operador debe seleccionar en `chrome://extensions` es `C:/Users/PC 13/Desktop/Harmonia/extension`. La entrega local pasó el contrato, 5/5 pruebas, colector autenticado y 22/22 hashes. Las instrucciones directas U06–U17 permanecen verbatim en `originales/HARMONIA-ENTREGA-ESCRITORIO-01.jsonl` y se reproducen en el OCP §29. La solicitud de checklist de este ciclo está preservada en `originales/HARMONIA-CHECKLIST-SES-20261022-R8Q4N6P1.jsonl` y el estado actualizado en §30. La extensión no se ha cargado en Chrome: E2E sigue ABIERTA, captura natural aún no verificada y el consumidor de segundo hilo no probado. El siguiente paso es la carga manual de `C:/Users/PC 13/Desktop/Harmonia/extension` y una prueba natural sin datos sensibles. No afirmar «todo aceptado». No hacer pseudo-mejoras: reabrir solo ante fallo reproducible, instrucción expresa o riesgo material; optimización después del E2E.


## Checklist actualizado · SES-20261022-R8Q4N6P1

El checklist vigente de 17 criterios y la prioridad del siguiente hito están en el OCP §30 y en [la crónica del ciclo](https://github.com/SeryMente/khora/blob/main/docs/frentes/harmonia/cronica/HARMONIA-CHECKLIST-SES-20261022-R8Q4N6P1.md). No repetir de memoria el pronóstico amplio 10–26 h como estimación restante del paquete ya entregado. Estado: transferencia gen5 verificada; v0.4.0 entregada según §29, pendiente carga real en Chrome y aceptación E2E.
