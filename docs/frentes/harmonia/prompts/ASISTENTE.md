# Instanciación · asistente de Harmonia · traspaso fresco v0.9

## Entrada obligatoria

1. Adquiere desde `SeryMente/metodologia/main` las fuentes vigentes: [INICIO.md](https://github.com/SeryMente/metodologia/blob/main/INICIO.md), [Metaprompt Canónico de Samantha](https://github.com/SeryMente/metodologia/blob/main/gobernanza/METAPROMPT-CANONICO-SAMANTHA.md), [Metacanon](https://github.com/SeryMente/metodologia/blob/main/METACANON-OBJETOS-CANONICOS.md), [GOW](https://github.com/SeryMente/metodologia/blob/main/gobernanza/GLOSARIO-WORKSPACE.md) y gobierno RDC aplicable. No asumir vigencia a partir de esta copia: vuelve a comprobar versiones, sellos, blobs y frescura en `main`.
2. Lee por completo `docs/frentes/harmonia/OBJETO-CANONICO.md`, este prompt, `README.md` y `CONTROL-RESPONSABILIDAD.json`. El OCP §17 contiene el estado de traspaso, la secuencia de continuación y la última salida visible del asistente anterior, persistida literalmente.
3. Aplica el formato obligatorio de ciclo de Metacanon §4 y registra el folio de sesión exigido por las reglas vigentes tras comprobar colisiones en los controles y repositorios accesibles. Declara el alcance de esa comprobación; no inventes que es universal.
4. Al comenzar, cita literalmente el contenido que el OCP conserva como última salida visible del asistente anterior y declara las lagunas de evidencia, sin reconstruir lo que no está persistido.

## Compuerta de responsabilidad

Instantánea histórica al redactar v0.9: generación 1. Transferencias verificadas después: gen2 / `SES-20261021-K7M4Q9P2`, gen3 / `SES-20261021-F8R3M6Q2`, gen4 / `SES-20261022-H6Q2V9C4`, gen5 / `SES-20261022-R8Q4N6P1`. Estado vivo de control confirmado en main: blob `ac797019939f2f93dcbe2c98b73b36d71b30a900`, generación 5, folio activo `SES-20261022-R8Q4N6P1`, alias `chatgpt-harmonia-SES-20261022-R8Q4N6P1`; commit de transferencia gen5 `822c09b59cba59e7ae8c4ddfd959502367e7af6c`. La titularidad fue sustituida mediante CAS y lectura de vuelta. Para una retoma futura con otro titular activo, pregunta una sola vez y procede solo con autorización explícita, CAS y read-back. Nunca inventes un ID nativo.

## Estado de ingeniería

El OCP canónico vigente es v0.24 / HARMONIA-v0.24, §§1–31. La puerta finita de suficiencia para el pool v1 está definida en evidencias/HARMONIA-CRITERIO-SUFICIENCIA-POOL-V1.md; no exigir cubrir todas las 68 funciones del catálogo para declarar suficiente el pool básico.

Datos actuales versionados en main:
- Traza real saneada: docs/frentes/harmonia/datos/observaciones/HARMONIA-TRAZA-OBSERVACION-REDACTADA-20261022.jsonl. Tiene 627 eventos, 611 de consola, 10 de inicio, 6 de parada y cero líneas malformadas; SHA-256 a56aea6044f7a4ee94bd6a255a9ef24eacd78c003cf7144b72327d6176c90f21. No contiene eventos estructurales ni mensajes visibles; es diagnóstica, no suficiente.
- Fixture sintética: docs/frentes/harmonia/datos/observaciones/HARMONIA-POOL-MINIMO-V1-SINTETICO.jsonl. 11 eventos, cinco huellas, dos sesiones/dos pestañas; todos etiquetados synthetic_fixture. Es para diseño/tests, no prueba captura real.
- Baseline, manifiesto, README de datos y criterios están en los directorios evidencias/ y datos/observaciones/.

El paquete local del dispositivo es v0.5.0; comprobaciones locales: 8/8 archivos JavaScript parseables, HARMONIA_SOURCE_CONTRACT_OK y 7/7 pruebas Node. No se declara sincronizado por huella con main (la fuente publicada anterior estaba en v0.3.0). E2E natural de Chrome sigue abierto: la traza existente no contiene las clases de evento necesarias y E2E-CHROME-EVIDENCIA.json registra un intento histórico FAIL “No ChatGPT test tab”. El runner PowerShell posterior fue bloqueado por la política local de scripts; no cambiarla ni manipular el perfil personal del navegador por GUI.

Los archivos de esta entrega se publicaron en main y se verificaron por lectura de vuelta. El envío automático continuo desde el equipo a GitHub aún no está implementado: el worker actual consulta build-info/catalog, no sube observaciones. No declarar autosync hasta disponer de un canal de escritura autenticado, gobernado y probado; no incrustar secretos en la extensión ni versionarlos.

No priorizar arquitectura multiámbito, catálogo exhaustivo, CPU/RAM ni retoques de UX antes de que la puerta básica de captura real y persistencia esté cubierta. Reabrir solo por fallo reproducible, pérdida/mezcla/corrupción material o requisito explícito nuevo.

## Seguridad del entorno

El operador Windows es `CENTRAL\\fila4`. Nunca uses, leas como raíz operativa ni escribas, copies, muevas o borres dentro de `C:\\Users\\MantenimientoRCI\\`. Si se autoriza una operación de escritorio tras resolver gobierno y la identidad RDC, verifica la cadena `Win32_UserAccount → SID → Win32_UserProfile.LocalPath`; el perfil declarado del operador es `C:\\Users\\fila4`, Escritorio `C:\\Users\\fila4\\Desktop`. No uses rutas derivadas del perfil del proceso.

**No declarado:** captura real de ChatGPT, concurrencia multi-pestaña, ausencia de colisiones, consumo reducido, actualización automática del código y sincronización efectiva. Cada afirmación exige su prueba correspondiente.

Este prompt prepara la continuidad; no inicia por sí mismo una sesión RDC, no autoriza acceso de equipo, no carga Chrome y no transfiere control.


## Entrega actual y regla anti-loop — folio SES-20261022-R8Q4N6P1

El paquete Harmonia v0.4.0 está en `C:/Users/PC 13/Desktop/Harmonia`; la carpeta de extensión que el operador debe seleccionar en `chrome://extensions` es `C:/Users/PC 13/Desktop/Harmonia/extension`. La entrega local pasó el contrato, 5/5 pruebas, colector autenticado y 22/22 hashes. Las instrucciones directas U06–U17 permanecen verbatim en `originales/HARMONIA-ENTREGA-ESCRITORIO-01.jsonl` y se reproducen en el OCP §29. La solicitud de checklist de este ciclo está preservada en `originales/HARMONIA-CHECKLIST-SES-20261022-R8Q4N6P1.jsonl` y el estado actualizado en §30. La extensión no se ha cargado en Chrome: E2E sigue ABIERTA, captura natural aún no verificada y el consumidor de segundo hilo no probado. El siguiente paso es la carga manual de `C:/Users/PC 13/Desktop/Harmonia/extension` y una prueba natural sin datos sensibles. No afirmar «todo aceptado». No hacer pseudo-mejoras: reabrir solo ante fallo reproducible, instrucción expresa o riesgo material; optimización después del E2E.


## Checklist actualizado · SES-20261022-R8Q4N6P1

El checklist vigente de 17 criterios y la prioridad del siguiente hito están en el OCP §30 y en [la crónica del ciclo](https://github.com/SeryMente/khora/blob/main/docs/frentes/harmonia/cronica/HARMONIA-CHECKLIST-SES-20261022-R8Q4N6P1.md). No repetir de memoria el pronóstico amplio 10–26 h como estimación restante del paquete ya entregado. Estado: transferencia gen5 verificada; v0.4.0 entregada según §29, pendiente carga real en Chrome y aceptación E2E.

