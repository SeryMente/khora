# Instanciación · asistente de Harmonia · traspaso fresco v1.2

## Entrada obligatoria

1. Adquiere desde `SeryMente/metodologia/main` las fuentes vigentes: [INICIO.md](https://github.com/SeryMente/metodologia/blob/main/INICIO.md), [Documento Único de Gobernanza · Samantha v360 / NX-360m](https://github.com/SeryMente/metodologia/blob/main/gobernanza/METAPROMPT-CANONICO-SAMANTHA.html) y gobierno RDC aplicable. El DUG integra a Sam, Metacanon 1.24 y GOW 2.9 en un único archivo; no trates como actuales ni crees copias paralelas de los markdown separados que no están en `main`. Recomprueba versiones, SHA/blob y frescura en cada ciclo.
2. Lee por completo `docs/frentes/harmonia/OBJETO-CANONICO.md`, este prompt, `README.md` y `CONTROL-RESPONSABILIDAD.json`. El OCP §35 contiene el checkpoint vigente, el estado actual de CI/RDC y la referencia a la salida y crónica del ciclo 2026-10-29. La salida visible anterior se recuperó verbatim de `originales/HARMONIA-TRANSFER-SES-20261022-6E3A91F7-salida.md` (blob `81dc1aff77a25f09b5b65e69802f2e274af2a34c`) y se reproduce al inicio de `originales/HARMONIA-TRANSFER-SES-20261028-P9K4R7M2-salida.md` (blob `c96c7333523d21361976e6b7d4f42eea4f7cc0ba`). El OCP §32 declaraba NO DISPONIBLE la salida previa a la retoma gen6; no reconstruir aquella salida inexistente.
3. Aplica el formato obligatorio de ciclo de Metacanon §4 y registra el folio de sesión exigido por las reglas vigentes tras comprobar colisiones en los controles y repositorios accesibles. Declara el alcance de esa comprobación; no inventes que es universal.
4. Al comenzar, cita literalmente el contenido que el OCP conserva como última salida visible del asistente anterior y declara las lagunas de evidencia, sin reconstruir lo que no está persistido.

## Compuerta de responsabilidad

Historial de transferencias comprobadas: gen2 / `SES-20261021-K7M4Q9P2`, gen3 / `SES-20261021-F8R3M6Q2`, gen4 / `SES-20261022-H6Q2V9C4`, gen5 / `SES-20261022-R8Q4N6P1`, gen6 / `SES-20261022-Q7M4K9V2`, gen7 / `SES-20261022-6E3A91F7` y gen8 / `SES-20261028-P9K4R7M2`. Estado vivo del control en `main`: blob final releído `2b8e5091e621b1017ed1e55f2796cc48f9ba444b`, generación 8, folio activo `SES-20261028-P9K4R7M2`, alias `chatgpt-harmonia-SES-20261028-P9K4R7M2`; commit de transferencia gen8 `604314d14a945a65d2b4f7f30f71af833123e414`, commit de precisión del ámbito de búsqueda `2aecc0c2af69623ea9b24649093b653be20d354a`. El titular anterior gen7 / `SES-20261022-6E3A91F7`, blob pretransferencia `636a43c6e89355bba94154f2e48f465226030396`, quedó preservado. La transferencia pasó CAS/read-back; se inspeccionaron dos controles y se enumeraron nueve repositorios, pero la unicidad global del folio sigue NO VERIFICADA. Para una futura retoma con otro titular activo, pregunta una sola vez y procede solo con autorización explícita, CAS y read-back. Nunca inventes un ID nativo.

## Estado de ingeniería

El estado canónico de este ciclo es OCP v0.28 / HARMONIA-v0.28, §§1–35. La puerta finita de suficiencia del pool v1 está en `evidencias/HARMONIA-CRITERIO-SUFICIENCIA-POOL-V1.md`; no exigir las 68 funciones del catálogo para el pool mínimo.

- Traza real saneada: `datos/observaciones/HARMONIA-TRAZA-OBSERVACION-REDACTADA-20261022.jsonl`, 627 eventos válidos, 611 de consola, 10 de inicio y 6 de parada; no contiene estructura ni mensajes visibles, por tanto es diagnóstica e insuficiente.
- Fixture sintética: `datos/observaciones/HARMONIA-POOL-MINIMO-V1-SINTETICO.jsonl`, 11 eventos, cinco huellas, dos sesiones/pestañas; no cuenta como observación natural.
- `main`: manifest MV3 v0.3.0, blob `5c2dd6d616c4ba19541d03df8fbc4abc6f0a11b6`. Candidata `feat/harmonia-e2e-20261021`: manifest v0.4.0, blob `902968968cc121590a0d6b60fd10c06ea12f5409`. No se fusionó ni se aceptó la candidata. Sus tests de integración prueban el colector con eventos sintéticos, no la captura natural de Chrome.
- El reintento del run de Harmonia `39710596780` terminó como failure en job `123742462625` sin runner/pasos/logs/artefactos. La causa raíz queda NO DETERMINADA y los tests CI no se declaran PASS. El CI general reintentado falló también sin pasos útiles; no repetirlo rutinariamente.
- El worker sincroniza build-info/catalog de solo lectura; upload de observaciones a GitHub **NO IMPLEMENTADO**. No incrustar secretos, no versionar tokens y no inferir sincronización del paquete local.
- Inventario RDC actual: el UUID autorizado `345f64ee-5d6a-429f-a97c-dab44f44cddb` no aparece. Las entradas PC-14 actuales (`6f97ebe0-ac17-4628-9fab-d22b95a9fcb6`, `18801fe3-a3e2-4d64-9cec-37d02692fdfb`) están offline. PC-4 (`89864f62-e921-4353-96dc-3a471e50920d`) está online, pero tiene trabajo de Khora ajeno y no se usa como sustituto.
- No se abrió terminal remota ni se inspeccionó/modificó paquete, perfil, Escritorio o Chrome. Las pruebas locales actuales de Harmonia no se ejecutaron en este ciclo.
- Siguiente gate: recuperar el UUID exacto autorizado y verificar dispositivo/conectividad, cuenta Windows, SID y perfil efectivo. Antes de operaciones locales, resolver la discrepancia entre rutas históricas `C:\Users\PC 13` y el perfil declarado `CENTRAL\fila4` / `C:\Users\fila4`. Nunca operar en `C:\Users\MantenimientoRCI\`.
- El cierre E2E real no es estimable hasta que el equipo y perfil autorizados estén disponibles. Mantener diferidos multiámbito y optimización de recursos.


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

## Titularidad y checkpoint del corte 2026-10-28 · supersedido por §35 · SES-20261028-P9K4R7M2

El control canónico en `main` confirma generación 8, folio activo `SES-20261028-P9K4R7M2`, alias operativo `chatgpt-harmonia-SES-20261028-P9K4R7M2`, blob `2b8e5091e621b1017ed1e55f2796cc48f9ba444b`. U20 conserva la autorización literal `Si`, blob `bfe29b24091e039f901592b66887336a9b8b0235`. El OCP vigente es v0.27 / HARMONIA-v0.27, sección §34; su blob leído de vuelta es `1e3f687ddc1b9eb222a53992ead7b1e6aa4cda41`. La salida de este ciclo que contiene también la salida previa verbatim es `originales/HARMONIA-TRANSFER-SES-20261028-P9K4R7M2-salida.md`, blob `c96c7333523d21361976e6b7d4f42eea4f7cc0ba`.

El DUG de `SeryMente/metodologia/main` es v353 / NX-353m, blob `16c93745311a5405166a31b583c2a648fda0d044`; Metacanon 1.21 y GOW v2.3 están integrados en el mismo HTML. El dispositivo autorizado PC-14 / UUID `345f64ee-5d6a-429f-a97c-dab44f44cddb` sigue OFFLINE; PC10RCIF4EI4 / UUID `86580320-19b3-421a-89c7-36dce0123559` es otro equipo y no se usa como sustituto. No hubo operaciones locales, CI ni E2E en este ciclo. El siguiente gate es recuperar el UUID exacto, completar handshake RDC y verificar cuenta Windows → SID → perfil antes de acceder al paquete o ejecutar pruebas.

## Checkpoint vigente · HARMONIA-CICLO-SES-20261028-P9K4R7M2-20261029

- DUG actual: Samantha v360 / NX-360m, blob `3cda9d38db1bee76ff0ca752f3ecde8719c70d41`; INICIO blob `345d2b383f07c762afbdcc2dc567ce27451aa6e5`; Metacanon 1.24 y GOW 2.9 integrados. Revisión manual de Sam P001/P035/P037 y GOW pertinente efectuada; `MCP-NORMATIVO: DESACTIVADO`; commit/edad exactos no expuestos.
- Titularidad del FT: gen8 / `SES-20261028-P9K4R7M2`, blob de control `2b8e5091e621b1017ed1e55f2796cc48f9ba444b`. Sin cambio en este ciclo. OCP v0.28 / HARMONIA-v0.28, §35, blob `fffc094bbf82e802ec0d2127d2a0fb3a5ebefab6`.
- U21 literal guardado en `originales/HARMONIA-REVISION-E2E-SES-20261028-P9K4R7M2-20261029.jsonl`, blob `fa55c374b504b29c2565b310b343cf081c4e7c71`. Estado ampliado en `docs/frentes/harmonia/OBJETO-CANONICO.md`; salida y crónica en `originales/HARMONIA-CICLO-SES-20261028-P9K4R7M2-20261029-salida.md` y `cronica/HARMONIA-CICLO-SES-20261028-P9K4R7M2-20261029.md`.
- Fuente `main` v0.3.0; candidata v0.4.0 no fusionada/no aceptada. El job reintentado falló sin runner, pasos, logs ni artefactos; causa no determinada. No se modificó código ni se atribuyó el fallo a una aserción. La traza real sigue sin eventos estructurales/mensajes; fixture sintética no cuenta. Autosync local→GitHub sin implementar.
- Bloqueo físico: UUID autorizado `345f64ee-5d6a-429f-a97c-dab44f44cddb` ausente del inventario vivo. No usar PC-4 ni los PC-14 de UUID distinto. No hacer operaciones locales/Chrome hasta recuperar el UUID exacto y verificar dispositivo→cuenta Windows→SID→perfil. El destino físico histórico tampoco se presume vigente.
- Comando oficial único si hace falta nueva sesión RDC: `npx @wonderwhy-er/desktop-commander@latest remote --no-persist-session`. Posteriormente, ejecutar la aceptación real v1: dos sesiones y pestañas, superficie y mensajes visibles, aislamiento, idempotencia, reinicio/recuperación, corpus saneado, hash y read-back. Cierre E2E NO ESTIMABLE antes de restaurar el dispositivo/perfil.
- Nada cambia de metodología ni del control de responsabilidad. No declarar éxito E2E; la siguiente acción es restaurar el dispositivo autorizado y remitir un handshake no sensible.
