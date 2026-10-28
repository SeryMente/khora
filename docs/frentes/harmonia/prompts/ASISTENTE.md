# Instanciación · asistente de Harmonia · traspaso fresco v1.1

## Entrada obligatoria

1. Adquiere desde `SeryMente/metodologia/main` las fuentes vigentes: [INICIO.md](https://github.com/SeryMente/metodologia/blob/main/INICIO.md), [Documento Único de Gobernanza · Samantha v353 / NX-353m](https://github.com/SeryMente/metodologia/blob/main/gobernanza/METAPROMPT-CANONICO-SAMANTHA.html) y gobierno RDC aplicable. El DUG integra a Sam, Metacanon 1.21 y GOW v2.3 en un único archivo; no trates como actuales ni crees copias paralelas de los markdown separados que no están en `main`. Recomprueba versiones, SHA/blob y frescura en cada ciclo.
2. Lee por completo `docs/frentes/harmonia/OBJETO-CANONICO.md`, este prompt, `README.md` y `CONTROL-RESPONSABILIDAD.json`. El OCP §34 contiene el traspaso vigente, el checkpoint y la referencia a la salida de este ciclo. La salida visible anterior se recuperó verbatim de `originales/HARMONIA-TRANSFER-SES-20261022-6E3A91F7-salida.md` (blob `81dc1aff77a25f09b5b65e69802f2e274af2a34c`) y se reproduce al inicio de `originales/HARMONIA-TRANSFER-SES-20261028-P9K4R7M2-salida.md` (blob `14324b47502cd7363f31e02734e3d90db48543da`). El OCP §32 declaraba NO DISPONIBLE la salida previa a la retoma gen6; no reconstruir aquella salida inexistente.
3. Aplica el formato obligatorio de ciclo de Metacanon §4 y registra el folio de sesión exigido por las reglas vigentes tras comprobar colisiones en los controles y repositorios accesibles. Declara el alcance de esa comprobación; no inventes que es universal.
4. Al comenzar, cita literalmente el contenido que el OCP conserva como última salida visible del asistente anterior y declara las lagunas de evidencia, sin reconstruir lo que no está persistido.

## Compuerta de responsabilidad

Historial de transferencias comprobadas: gen2 / `SES-20261021-K7M4Q9P2`, gen3 / `SES-20261021-F8R3M6Q2`, gen4 / `SES-20261022-H6Q2V9C4`, gen5 / `SES-20261022-R8Q4N6P1`, gen6 / `SES-20261022-Q7M4K9V2`, gen7 / `SES-20261022-6E3A91F7` y gen8 / `SES-20261028-P9K4R7M2`. Estado vivo del control en `main`: blob final releído `2b8e5091e621b1017ed1e55f2796cc48f9ba444b`, generación 8, folio activo `SES-20261028-P9K4R7M2`, alias `chatgpt-harmonia-SES-20261028-P9K4R7M2`; commit de transferencia gen8 `604314d14a945a65d2b4f7f30f71af833123e414`, commit de precisión del ámbito de búsqueda `2aecc0c2af69623ea9b24649093b653be20d354a`. El titular anterior gen7 / `SES-20261022-6E3A91F7`, blob pretransferencia `636a43c6e89355bba94154f2e48f465226030396`, quedó preservado. La transferencia pasó CAS/read-back; se inspeccionaron dos controles y se enumeraron nueve repositorios, pero la unicidad global del folio sigue NO VERIFICADA. Para una futura retoma con otro titular activo, pregunta una sola vez y procede solo con autorización explícita, CAS y read-back. Nunca inventes un ID nativo.

## Estado de ingeniería

El OCP canónico vigente es v0.27 / HARMONIA-v0.27, §§1–34. La salida de este ciclo se conserva íntegra en `originales/HARMONIA-TRANSFER-SES-20261028-P9K4R7M2-salida.md`; incluye la última salida previa disponible sin reconstrucción. La puerta finita de suficiencia para el pool v1 está definida en `evidencias/HARMONIA-CRITERIO-SUFICIENCIA-POOL-V1.md`; no exigir cubrir todas las 68 funciones del catálogo para declarar suficiente el pool básico.

Datos actuales versionados en main:
- Traza real saneada: docs/frentes/harmonia/datos/observaciones/HARMONIA-TRAZA-OBSERVACION-REDACTADA-20261022.jsonl. Tiene 627 eventos, 611 de consola, 10 de inicio, 6 de parada y cero líneas malformadas; SHA-256 a56aea6044f7a4ee94bd6a255a9ef24eacd78c003cf7144b72327d6176c90f21. No contiene eventos estructurales ni mensajes visibles; es diagnóstica, no suficiente.
- Fixture sintética: docs/frentes/harmonia/datos/observaciones/HARMONIA-POOL-MINIMO-V1-SINTETICO.jsonl. 11 eventos, cinco huellas, dos sesiones/dos pestañas; todos etiquetados synthetic_fixture. Es para diseño/tests, no prueba captura real.
- Baseline, manifiesto, README de datos y criterios están en los directorios evidencias/ y datos/observaciones/.

El último registro histórico describía un paquete local referido como v0.5.0, 8/8 archivos JavaScript parseables, `HARMONIA_SOURCE_CONTRACT_OK` y 7/7 pruebas Node; esos resultados no acreditan el estado actual del paquete ni su sincronización con `main`, que siguen NO VERIFICADOS. La E2E natural de Chrome continúa abierta: la traza existente no contiene las clases de evento necesarias y `E2E-CHROME-EVIDENCIA.json` registra un intento histórico FAIL “No ChatGPT test tab”. El runner PowerShell posterior fue bloqueado por la política local de scripts; no cambiarla ni manipular el perfil personal del navegador por GUI.

Los archivos de esta entrega se publicaron en main y se verificaron por lectura de vuelta. El envío automático continuo desde el equipo a GitHub aún no está implementado: el worker actual consulta build-info/catalog, no sube observaciones. No declarar autosync hasta disponer de un canal de escritura autenticado, gobernado y probado; no incrustar secretos en la extensión ni versionarlos.

No priorizar arquitectura multiámbito, catálogo exhaustivo, CPU/RAM ni retoques de UX antes de que la puerta básica de captura real y persistencia esté cubierta. Reabrir solo por fallo reproducible, pérdida/mezcla/corrupción material o requisito explícito nuevo.

## Seguridad del entorno

El operador Windows es `CENTRAL\\fila4`. Nunca uses, leas como raíz operativa ni escribas, copies, muevas o borres dentro de `C:\\Users\\MantenimientoRCI\\`. Si se autoriza una operación de escritorio tras resolver gobierno y la identidad RDC, verifica la cadena `Win32_UserAccount → SID → Win32_UserProfile.LocalPath`; el perfil declarado del operador es `C:\\Users\\fila4`, Escritorio `C:\\Users\\fila4\\Desktop`. No uses rutas derivadas del perfil del proceso.

**No declarado:** captura real de ChatGPT, concurrencia multi-pestaña, ausencia de colisiones, consumo reducido, actualización automática del código y sincronización efectiva. Cada afirmación exige su prueba correspondiente.

Este prompt prepara la continuidad; no inicia por sí mismo una sesión RDC, no autoriza acceso de equipo, no carga Chrome y no transfiere control.


## Entrega histórica y regla anti-loop — folio SES-20261022-R8Q4N6P1 (titularidad generación 5 sustituida)

**Advertencia de vigencia:** el texto que sigue describe un corte histórico de generación 5. Sus indicaciones de carga/prueba de v0.4.0 quedan superadas por el estado activo del OCP §32–§33; no ejecutar una operación local hasta que el PC-14 exacto esté online y verificado.

El paquete Harmonia v0.4.0 está en `C:/Users/PC 13/Desktop/Harmonia`; la carpeta de extensión que el operador debe seleccionar en `chrome://extensions` es `C:/Users/PC 13/Desktop/Harmonia/extension`. La entrega local pasó el contrato, 5/5 pruebas, colector autenticado y 22/22 hashes. Las instrucciones directas U06–U17 permanecen verbatim en `originales/HARMONIA-ENTREGA-ESCRITORIO-01.jsonl` y se reproducen en el OCP §29. La solicitud de checklist de este ciclo está preservada en `originales/HARMONIA-CHECKLIST-SES-20261022-R8Q4N6P1.jsonl` y el estado actualizado en §30. La extensión no se ha cargado en Chrome: E2E sigue ABIERTA, captura natural aún no verificada y el consumidor de segundo hilo no probado. El siguiente paso es la carga manual de `C:/Users/PC 13/Desktop/Harmonia/extension` y una prueba natural sin datos sensibles. No afirmar «todo aceptado». No hacer pseudo-mejoras: reabrir solo ante fallo reproducible, instrucción expresa o riesgo material; optimización después del E2E.


## Checklist histórico · SES-20261022-R8Q4N6P1 (superado por OCP §§32–33)

El checklist histórico de 17 criterios y la prioridad del siguiente hito están en el OCP §30 y en [la crónica del ciclo](https://github.com/SeryMente/khora/blob/main/docs/frentes/harmonia/cronica/HARMONIA-CHECKLIST-SES-20261022-R8Q4N6P1.md). No repetir de memoria el pronóstico amplio 10–26 h como estimación restante del paquete ya entregado. Estado: transferencia gen5 verificada; v0.4.0 entregada según §29, pendiente carga real en Chrome y aceptación E2E.

## Titularidad y checkpoint histórico sustituido · SES-20261022-6E3A91F7 (generación 7)

El control autoritativo en `main` está en generación 7, folio activo `SES-20261022-6E3A91F7`, blob `636a43c6e89355bba94154f2e48f465226030396`; commit de transferencia `0a654c4d76ac2b85ccba62d479c6c44abe371090`. La autorización literal `Si` se conserva en `originales/HARMONIA-TRANSFER-SES-20261022-6E3A91F7.jsonl`; crónica y última salida están enlazadas en OCP §33.

Consulta viva del ciclo: PC-14 / UUID `345f64ee-5d6a-429f-a97c-dab44f44cddb` estaba OFFLINE, último visto hace 58 minutos; el equipo distinto online no se usó. No hubo ejecución local, CI ni E2E. No tocar equipo ni declarar paquete local verificado hasta que el mismo UUID esté online y se confirme cuenta→SID→perfil→Escritorio. Reanudar desde OCP §32–§33; no convertir resultados históricos en actuales.

## Titularidad y checkpoint vigentes · SES-20261028-P9K4R7M2

El control canónico en `main` confirma generación 8, folio activo `SES-20261028-P9K4R7M2`, alias operativo `chatgpt-harmonia-SES-20261028-P9K4R7M2`, blob `2b8e5091e621b1017ed1e55f2796cc48f9ba444b`. U20 conserva la autorización literal `Si`, blob `bfe29b24091e039f901592b66887336a9b8b0235`. El OCP vigente es v0.27 / HARMONIA-v0.27, sección §34; su blob leído de vuelta es `d0fd92b7583befc2b2efb2a9fe38728730a59174`. La salida de este ciclo que contiene también la salida previa verbatim es `originales/HARMONIA-TRANSFER-SES-20261028-P9K4R7M2-salida.md`, blob `14324b47502cd7363f31e02734e3d90db48543da`.

El DUG de `SeryMente/metodologia/main` es v353 / NX-353m, blob `16c93745311a5405166a31b583c2a648fda0d044`; Metacanon 1.21 y GOW v2.3 están integrados en el mismo HTML. El dispositivo autorizado PC-14 / UUID `345f64ee-5d6a-429f-a97c-dab44f44cddb` sigue OFFLINE; PC10RCIF4EI4 / UUID `86580320-19b3-421a-89c7-36dce0123559` es otro equipo y no se usa como sustituto. No hubo operaciones locales, CI ni E2E en este ciclo. El siguiente gate es recuperar el UUID exacto, completar handshake RDC y verificar cuenta Windows → SID → perfil antes de acceder al paquete o ejecutar pruebas.
