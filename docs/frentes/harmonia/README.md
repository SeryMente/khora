# Harmonia · carpeta canónica del frente

Entrada única de estado: [OBJETO-CANONICO.md](OBJETO-CANONICO.md). La definición técnica integral se mantiene en [ESPECIFICACION-GENERAL.md](ESPECIFICACION-GENERAL.md); el OCP conserva el estado vivo, decisiones, backlog, pruebas, historial breve y paquete de traspaso. La especificación no sustituye ni duplica el estado del OCP.

- [Asistente · instancia fresca / traspaso v1.2](prompts/ASISTENTE.md): entrada, adquisición de gobierno, compuerta de titularidad y secuencia E2E.
- [Constructor · no instanciado](prompts/CONSTRUCTOR.md): ejecutar únicamente bajo su régimen y no utilizar Remote Desktop Commander.
- [Control exclusivo](CONTROL-RESPONSABILIDAD.json): actualmente asignado a la instancia y generación que constan en el JSON; no es un bootstrap sin propietario. Preparar el traspaso no transfiere la titularidad.
- [Originales](originales/PROCEDENCIA.md), [crónica](cronica/HARMONIA-INSTANCIACION-01.md) y [revisión](evidencias/HARMONIA-INSTANCIACION-01-revision.json).

## Snapshot operativo local · 2026-11-12 · ciclo OMM-01-040

- OCP local: v0.80 / HARMONIA-v0.80; SHA-256 `5972A03A5CDD0E365BC876504F51E060017DA43902E679F2FB0057D923018403`. v0.79 preservado en `archive/OBJETO-CANONICO-v0.79-pre-spec-maintenance-20261112.md`, SHA-256 `26774C8CFFA9A38A019DC07F5D298B2EED7BCF23D906FC22C18ADEC8FD32D198`.
- Especificación General Única: v1.0.0; SHA-256 `3C0BE96A010231F5084D1C2A6051C552289174CA9357964D25613D45DFC44D0F`, 24,391 bytes. Define arquitectura, contratos, metadatos A/B, privacidad, pruebas, aceptación y mantenimiento ciclo a ciclo.
- Backlog activo: cuatro ejes 035–038; OMM-01-040 es descomposición del eje 038. Tareas 000–034 y 039 permanecen preservadas como descomposición y evidencia, no como otra cola activa.
- Gobierno: Samantha v393 / NX-393m, commit `b62d99bb49c35e6cfe280ebeace5ce5dbde9a675`; Metacanon section 52 desactiva métricas temporales, que quedan bloqueadas en Harmonia.
- Rama `work/harmonia-front-workspace-20261110`, HEAD `9fd5c18205e39b6db12c9152b07d8f880f6b256d`; trabajo local sin commit. `main` no modificado.
- Producto: candidata MV3 0.4.9, colector 0.4.8.1. Sin aceptación natural SPA ni BMO-01; Chrome principal no intervenido.

## Estado histórico · 2026-11-08 · generación 15 (snapshot supersedido)

- OCP canónico main: v0.46 / HARMONIA-v0.46, secciones 46–52.
- Control: generación 15; alias operativo chatgpt-harmonia-01a1b6ca-4543-7578-85d9-7624877c2e80; owner_thread=null (ID nativo no expuesto); session_folio=null (FOL1 no activa).
- RDC autorizado para la tarea local de este ciclo: PC-13, UUID 1227e578-55c8-4231-82bb-4dbf9234855a; usuario PC-13\PC 12; perfil C:\Users\PC 12; SID S-1-5-21-874664506-151841403-77259543-1001. Alcance limitado a materializar y verificar Desktop\EP\Armonía. PC10 permanece como dispositivo anterior en el historial; no cambió la titularidad ni la generación 15.
- Transferencia gen14 a gen15 por CAS y push fast-forward no forzado: commit 6f330f2301f2f2b55988ecbb5285c2b3a45621b7; control blob releído 0e090e1f3537b75891344af812e576e39a5f5e02. El titular anterior y el historial de generaciones permanecen preservados.
- Export ChatGPT-HARMONIA-20261106-1715: NO CAPTURADO / NO LOCALIZADO EN RUTAS CONSULTADAS. Búsquedas por nombre exacto: cero coincidencias en Downloads y Desktop; cero en el perfil con aviso de directorios inaccesibles. No se creó sustituto. El original ChatGPT-HARMONIA-20261101-1709.md permanece como antecedente verificado y no lo reemplaza.
- Export adicional `ChatGPT-Harmonia-20261108-1105.md`: PERSISTIDO_Y_VERIFICADO en `originales/`; SHA-256 `E1B0FE08A22C1A54AE88C464BEF68FFEF8614E8DE5C63D95E81C49C26F8AF608`. No sustituye el export nominal 2026-11-06 que sigue NO LOCALIZADO.
- Revisión de telemetría: [crónica HARMONIA-REVISION-TELEMETRIA-20261108](cronica/HARMONIA-REVISION-TELEMETRIA-20261108.md). Dictamen: implementación integrada; CI y aceptación natural pendientes.
- Paquete local Harmonia v0.3.1 preparado en PC-13: Desktop\EP\Armonía; carpeta descomprimida para Chrome: Desktop\EP\Armonía\extension. Integridad 17/17 Git blob SHA; sintaxis Node 5/5 y suites Node sintéticas 19/19 PASS. Fixture PowerShell upstream NO VERIFICADO en PS5.1 (pwsh no instalado). El inicializador está preparado; no se inició el colector ni se cargó/modificó Chrome en ese ciclo. EP_VOLATIL; cifrado/recuperación física no certificados. Ver §52, crónica y evidencia EV-HARMONIA-LOCAL-WORKSPACE-PC13-20261108.
- Gobierno adquirido en este corte: DUG v383 / NX-383m; Metacanon 1.29; GOW 2.18. `MCP-NORMATIVO: DESACTIVADO`.
- Crónica y evidencia de transferencia: cronica/HARMONIA-TRANSFER-G15-20261107.md y evidencias/EV-HARMONIA-TRANSFER-G15-20261107.json; revisar su estado en el manifiesto documental.
- Estado técnico vigente: extensión v0.3.1 y telemetría de ciclos integradas en main mediante PR #358 (commit `dcba260981837f75a8a05db85edd310c2a7a9736`). PR #353 y #346 cerradas; cero PR abiertas de Harmonia. CI y aceptación natural en Chrome NO VERIFICADAS; la preparación local en PC-13 está verificada, pero Chrome no se cargó ni aceptó en este ciclo. No hay persistencia remota, B2, Neon, backfill ni despliegue acreditados.

## Antecedentes históricos de código y aceptación (no vigentes)

- `main` publica el manifiesto MV3 **v0.3.0** (blob `5c2dd6d616c4ba19541d03df8fbc4abc6f0a11b6`); la candidata histórica `feat/harmonia-e2e-20261021` contenía **v0.4.1** (manifest blob `7791f7c806f2b56cebb39d20f6d5bc1fcd28c344`). La PR [#333](https://github.com/SeryMente/khora/pull/333) está cerrada sin merge. No se declara aceptada la candidata.
- La observación “no hubo ejecución local” pertenece a ese ciclo histórico. En el nuevo entorno RDC de 015RENTA01 se ejecutaron y aprobaron 8/8 comprobaciones de sintaxis y 10/10 pruebas local-first; el registro está en §48 y en EV-HARMONIA-RDC-RESET-TEST-20261101.json. El test `collector.integration.test.js` usa eventos sintéticos para validar el colector; no prueba captura natural del content script. Los 5/5 tests referidos en historial son resultados históricos, no evidencia reejecutada hoy.
- Se reintentó CI: el job de Harmonia terminó en `failure` sin runner/pasos/logs/artefactos. La causa raíz queda **NO DETERMINADA**; no se atribuye a código ni se declara CI aprobada. No repetir tests generales para diagnosticar sin logs.
- El corte v0.28 / HARMONIA-v0.28 citado en este bloque es histórico y fue sustituido por el OCP canónico v0.43 / HARMONIA-v0.43, §§46–49. El pool v1 requiere captura real en dos sesiones/pestañas, al menos cinco huellas, mensajes visibles por sesión, no cruces, replay idempotente, recuperación tras reinicio, corpus saneado, hash y read-back exacto. La traza real disponible sigue siendo solo diagnóstica (627 eventos sin superficie ni mensaje visible); la fixture de 11 eventos es sintética.
- Los registros históricos mencionan `C:\Users\PC 13\Desktop\Harmonia`; ese destino no está verificado actualmente y no debe seleccionarse por inercia. No afirmar que el paquete local coincide con `main`.

Snapshot RDC del 2026-10-29 (histórico y supersedido por la autorización vigente de 015RENTA01): la consulta entonces no encontraba el UUID autorizado de Harmonia `345f64ee-5d6a-429f-a97c-dab44f44cddb`. Dos registros llamados `PC-14` tienen otros UUID (`6f97ebe0-ac17-4628-9fab-d22b95a9fcb6` y `18801fe3-a3e2-4d64-9cec-37d02692fdfb`) y están offline. PC-4 (`89864f62-e921-4353-96dc-3a471e50920d`) está online, pero tiene trabajo de Khora ajeno y no se selecciona. No ejecutar operaciones locales hasta restaurar el UUID autorizado, comprobar conectividad y validar cuenta Windows → SID → `Win32_UserProfile.LocalPath`. La discrepancia entre rutas históricas (`PC 13`) y el perfil declarado (`CENTRAL\fila4` / `C:\Users\fila4`) continúa sin resolver; no adivinar. Nunca usar ni leer `C:\Users\MantenimientoRCI\` como raíz operativa.


La formalización del criterio multiámbito de §16 sigue pendiente mediante el FT de Metacanon; sus notas siguen siendo temporales hasta entonces.


## Continuidad histórica · SES-20261022-R8Q4N6P1 (generación 5 sustituida)

Control histórico de generación 5, folio `SES-20261022-R8Q4N6P1`, blob `ac797019939f2f93dcbe2c98b73b36d71b30a900`. Esta titularidad fue sustituida primero por gen6 y después por gen7 mediante transferencias registradas con CAS y lectura de vuelta. El bloque se conserva solo como historia; ya no determina el titular ni el siguiente paso.


## Entrega del pool mínimo suficiente — SES-20261022-R8Q4N6P1

[Traza real saneada](datos/observaciones/HARMONIA-TRAZA-OBSERVACION-REDACTADA-20261022.jsonl) y [manifiesto](datos/observaciones/HARMONIA-TRAZA-OBSERVACION-REDACTADA-20261022.manifest.json) están guardados en main. La traza tiene 627 eventos (611 de consola, 10 de inicio, 6 de parada), cero malformados y no contiene eventos estructurales ni mensajes visibles. [Fixture sintética](datos/observaciones/HARMONIA-POOL-MINIMO-V1-SINTETICO.jsonl) aporta 11 eventos de diseño, cinco huellas y dos sesiones; no demuestra captura real. Ver [baseline](evidencias/HARMONIA-OBSERVACION-BASELINE-20261022.json) y [criterio de suficiencia](evidencias/HARMONIA-CRITERIO-SUFICIENCIA-POOL-V1.md).

La publicación puntual quedó verificada por lectura de vuelta exacta. La publicación automática recurrente desde la extensión no está implementada; el worker sincroniza metadatos de solo lectura y no sube observaciones.


## Estado histórico sustituido · SES-20261022-6E3A91F7 (generación 7)

OCP v0.26. Control exclusivo: generación 7; folio `SES-20261022-6E3A91F7`; blob del control releído `636a43c6e89355bba94154f2e48f465226030396`; transferencia desde gen6 mediante commit `0a654c4d76ac2b85ccba62d479c6c44abe371090`. Autorización `Si` literal: [original U19](originales/HARMONIA-TRANSFER-SES-20261022-6E3A91F7.jsonl). [Crónica de transferencia](cronica/HARMONIA-TRANSFER-SES-20261022-6E3A91F7.md) y [última salida íntegra](originales/HARMONIA-TRANSFER-SES-20261022-6E3A91F7-salida.md).

La consulta viva de RDC de este ciclo confirma que el UUID autorizado de PC-14 `345f64ee-5d6a-429f-a97c-dab44f44cddb` continúa OFFLINE. No se usó el otro dispositivo online. No hubo operaciones locales ni pruebas de Chrome, CI o E2E en este ciclo; el paquete local y la raíz directamente cargable siguen NO VERIFICADOS. Reanudar operaciones locales solo tras recuperar el mismo UUID y verificar usuario/perfil Windows.

## Estado histórico sustituido · revisión HARMONIA-CICLO-SES-20261028-P9K4R7M2-20261029

- OCP canónico: [OBJETO-CANONICO.md](OBJETO-CANONICO.md), v0.28 / HARMONIA-v0.28, §35; blob leído de vuelta `88c2cbaec4b0f21bc00506e78ebd2913e5679b44`.
- Responsabilidad sin cambios: `CONTROL-RESPONSABILIDAD.json`, generación 8, folio activo `SES-20261028-P9K4R7M2`, alias `chatgpt-harmonia-SES-20261028-P9K4R7M2`, blob actual `2b8e5091e621b1017ed1e55f2796cc48f9ba444b`. U20 conserva la autorización literal `Si` (blob `bfe29b24091e039f901592b66887336a9b8b0235`). No se transfirió ni mutó el control en este ciclo.
- Gobierno rereleído en `SeryMente/metodologia/main`: DUG v360 / NX-360m, blob `3cda9d38db1bee76ff0ca752f3ecde8719c70d41`; INICIO blob `345d2b383f07c762afbdcc2dc567ce27451aa6e5`; Metacanon 1.24 y GOW 2.9 integrados. Commit/edad exactos no expuestos. `MCP-NORMATIVO: DESACTIVADO`; metodología no se modificó.
- Original de solicitud U21: [`HARMONIA-REVISION-E2E-SES-20261028-P9K4R7M2-20261029.jsonl`](originales/HARMONIA-REVISION-E2E-SES-20261028-P9K4R7M2-20261029.jsonl), blob `fa55c374b504b29c2565b310b343cf081c4e7c71`. Salida y crónica: [salida del ciclo](originales/HARMONIA-CICLO-SES-20261028-P9K4R7M2-20261029-salida.md) y [crónica](cronica/HARMONIA-CICLO-SES-20261028-P9K4R7M2-20261029.md).
- `main` v0.3.0; candidata v0.4.0 en rama separada. Sin cambio de código, merge ni aceptación funcional. Reintento CI falló sin runner, pasos, logs ni artefactos; causa no determinada. Autosync local→GitHub no implementado.
- Inventario RDC del 2026-10-29: UUID autorizado `345f64ee-5d6a-429f-a97c-dab44f44cddb` ausente. Dos entradas PC-14 están offline con UUID distintos; PC-4 está online pero pertenece a otra tarea y no se usó. Ninguna operación remota/local se ejecutó para Harmonia.
- E2E real sigue **ABIERTA**; paquete/raíz cargable y perfil físico NO VERIFICADOS. La acción bloqueante es restaurar el UUID exacto y aportar handshake de conectividad y cuenta → SID → perfil, sin secretos. Si se inicia RDC de nuevo, el único comando normativo de Metacanon §13 es `npx @wonderwhy-er/desktop-commander@latest remote --no-persist-session`.
 
## Estado histórico sustituido · 2026-10-31

La única fuente actual de estado del frente es el OCP [OBJETO-CANONICO.md](OBJETO-CANONICO.md), versión **0.39 / HARMONIA-v0.39**, especialmente §45. El control exclusivo está en generación **12**, registrado en [CONTROL-RESPONSABILIDAD.json](CONTROL-RESPONSABILIDAD.json); el folio de sesión sigue sin asignarse porque FOL1 no está activa.

La exportación completa [ChatGPT-HARMONIA-20261031-1349.txt](originales/ChatGPT-HARMONIA-20261031-1349.txt) está incorporada en originales y su transferencia binaria fue verificada por blob SHA. Su procedencia se registra en [PROCEDENCIA.md](originales/PROCEDENCIA.md).

NCL-OCP queda como adaptador Playwright auxiliar, manual, opt-in, de alto alcance sobre el perfil OCP y desconectado por defecto. No es navegador independiente del agente, no aísla pestañas y no es dependencia de arranque de Harmonia. El reporte EP sigue únicamente en el equipo local; no se ha transferido a EP.

La PR #346 continúa abierta en borrador y sin merge. La prueba productiva autorizada de un único evento sintético Cora/Neon y su lectura de vuelta continúa pendiente; no se ha escrito en producción, ni se ha modificado Chrome, fusionado o desplegado.

**Nota de lectura:** los apartados históricos que siguen conservan fotografías de estados anteriores. Si discrepan con el OCP v0.39 y el control vigente, prevalece el OCP; no interpretes sus referencias de generación, dispositivo o versiones anteriores como estado actual.

## Captura conversacional adicional · 2026-11-13

- [Exportación completa de la conversación HARMONIA](originales/ChatGPT-HARMONIA-20261113-1145.md): copia local byte a byte del archivo descargado desde `C:\Users\fila4\Downloads`; conserva el encabezado, el ID nativo declarado por el exportador y todos los intercambios incluidos.
- [Salida original visible del ciclo OMM-01-040](originales/HARMONIA-CICLO-20261112-OMM-01-040-SALIDA-ORIGINAL.md): extracto literal de la respuesta final tal como aparece en la exportación. No sustituye el informe técnico B previamente archivado.
- El índice de continuidad conserva los tres ciclos ya segmentados y marca esta conversación como `PARTIAL`; los intercambios adicionales del export aún no se han segmentado.
## Snapshot operativo local · 2026-11-13 · D-039 / OMM-FUT-004–006

- OCP local: **v0.81 / HARMONIA-v0.81**; v0.80 preservado byte a byte en `archive/OBJETO-CANONICO-v0.80-pre-D039-20261113.md`.
- Especificación general: **v1.1.0**; v1.0.0 preservada byte a byte en `archive/ESPECIFICACION-GENERAL-v1.0.0-pre-D039-20261113.md`.
- D-039 original: `originales/HARMONIA-INSTRUCCIONES-VERBATIM-20261113-D039.md`.
- OMM-FUT-004: reporte por ventanas móviles 24h/48h/72h/7d, asociación explícita de la conversación ChatGPT al frente, última actividad, fecha/hora, rótulo relativo y URL canónica.
- OMM-FUT-005: registro SemVer en `REGISTRO-VERSIONES-EXTENSION.md`; 0.4.9 es baseline PRE-D039 y 0.5.0 corresponde al esfuerzo D-039.
- OMM-FUT-006: revisión recurrente de suficiencia de observabilidad en paralelo a todo esfuerzo de desarrollo de Extension. Auditoría inicial y propuestas OBS-PROP-001/002: `evidencias/HARMONIA-AUDITORIA-DATOS-FRENTES-D039.md`; cambios del observador sujetos a autorización.
- Extensión candidata **0.5.0**, colector **0.5.0**, catálogo 0.1.3. Sintaxis Node y suite focal de utilidades/almacén/API: **16/16 PASS**.
- No aceptación natural del popup en Chrome; BMO-01 NO ALCANZADO. Sin commit/push/PR/merge/deploy; rama local sin cambios en main.
- Fuente de gobierno consultada: Samantha v393 / NX-393m; DUG main commit `67014eb24244651b2e805079930d08082f0fc41c`; discrepancias de representación interna del DUG permanecen abiertas.

## Snapshot operativo local · 2026-11-13 · D-040 / OMM-FUT-007

- OCP local **v0.82 / HARMONIA-v0.82**; v0.81 preservado byte a byte en archive/OBJETO-CANONICO-v0.81-pre-D040-20261113.md.
- Especificación General **v1.2.0**; v1.1.0 preservada byte a byte en archive/ESPECIFICACION-GENERAL-v1.1.0-pre-D040-20261113.md.
- D-040 original: originales/HARMONIA-INSTRUCCIONES-VERBATIM-20261113-D040.md; SHA-256 DA1D09E58345F90162868BA01212D157AFEDF98A86FB679B85C25E52A8C4DAE6.
- Nueva tarea provisional **OMM-FUT-007**: archivar automáticamente la conversación actual de ChatGPT en un único Markdown por ID nativo, actualizado a cada ciclo, con calidad al menos igual a los exports de Downloads. **No implementada**; objetivo Extension **0.6.0** planificado.
- Se auditaron siete exports Markdown de Downloads; métricas, hashes, suficiencia de datos y criterios de aceptación: evidencias/HARMONIA-AUDITORIA-CALIDAD-MARKDOWN-D040.md.
- El banco histórico de observabilidad no conserva cuerpos ni estructura de mensajes. La captura futura debe limitarse al DOM renderizado de la conversación actual y persistir el contenido solo localmente, separado del JSONL.
- OMM-FUT-006 recurrente aplicada: se auditó el dataset antes de ampliar observabilidad; no se creó otro banco ni se modificó el observador.
- Salida B D-040: originales/HARMONIA-CICLO-20261113-D040-MARKDOWN-ARCHIVE-B.md; SHA-256 70A3B24904982E74D7DC2371A63DD9D80EE4063B73074C3C5A5ACE0BDD5E9904.
- Extension/Collector siguen en candidata local **0.5.0**. No cambian manifest/build-info ni se crea el directorio de salida propuesto. Sin instalación/recarga de Chrome, aceptación natural, commit/push/PR/merge/deploy.

## Snapshot operativo local · 2026-11-13 · D-041 / OMM-FUT-008

- OCP local **v0.83 / HARMONIA-v0.83**; v0.82 preservado byte a byte en `archive/OBJETO-CANONICO-v0.82-pre-D041-20261113.md`.
- Especificación General **v1.3.0**; v1.2.0 preservada byte a byte en `archive/ESPECIFICACION-GENERAL-v1.2.0-pre-D041-20261113.md`.
- D-041 original: `originales/HARMONIA-INSTRUCCIONES-VERBATIM-20261113-D041.md`; SHA-256 `39A22D73AE31F150BA1E1F6A53F3517DDFE65E82BFC7D232ADAB072C99A53A3A`.
- OMM-FUT-008: tarea paraguas provisional P1 para monitorización multi-pestaña de ChatGPT, archivo maestro por conversación, telemetría arquitectónica allowlisted, overlay contextual LIKE/DISLIKE/comentarios y gobernanza de refuerzos/incidencias. **NO IMPLEMENTADA**; versión objetivo propuesta 0.7.0 después de OMM-FUT-007/0.6.0.
- Regla OMM-FUT-006 reforzada con compuertas O0–O5 en OCP §46.3 y Especificación §18.5. Auditoría: `evidencias/HARMONIA-AUDITORIA-FLUJO-OBSERVABILIDAD-D041.md`.
- Diseño detallado: `originales/HARMONIA-CICLO-20261113-D041-EXPANSION-INCIDENCIAS-B.md`.
- LIKE se registra como refuerzo; DISLIKE como señal correctiva; una incidencia formal requiere triage. Comentarios y cuerpos de conversación se mantienen fuera del JSONL general y de servicios externos.
- OMM-FUT-007 se mantiene inalterada como captura Markdown de una conversación actual/pestaña; no está implementada.
- Extension/Collector permanecen en candidata 0.5.0. Sin cambios de código, manifest, permisos, build-info, instalación/recarga Chrome, aceptación natural, commit/push/PR/merge/deploy.

## Auditoría complementaria D-041 · OMM-FUT-008 / OMM-FUT-009

- La candidata 0.5.0 ya consulta pestañas `chatgpt.com`, restaura sesiones por tabId e inyecta observadores en pestañas existentes; esta cobertura estructural es parcial y no crea archivos Markdown completos por conversación.
- OMM-FUT-008 se mantiene P1 PROVISIONAL / NO IMPLEMENTADA: completar y validar esa base; añadir archivo maestro por ID nativo, overlay LIKE/DISLIKE/comentarios y triage de incidencias. 0.7.0 propuesta después de OMM-FUT-007/0.6.0.
- OMM-FUT-009 se registra P1 PROVISIONAL / NO IMPLEMENTADA: retirar telemetría temporal heredada no conforme con Metacanon §52. El banco local tiene 3,190 eventos/70 JSONL; 31/31 `capture.stopped` incluyen `durationMs`. El código activo aún puede calcular/exponer `duration_ms`, medias, medianas y percentiles.
- No se tocaron código, permisos, manifest, collector ni los 31 registros históricos. Se requiere autorización antes de corregir productores o modificar JSONL.
- Auditoría detallada: `evidencias/HARMONIA-AUDITORIA-FLUJO-OBSERVABILIDAD-D041.md` §8; contrato de tareas: OCP §§50–51.


## D-041 · Matriz de normas y brecha del corpus

Matriz normativa D-001…D-041: `originales/HARMONIA-MATRIZ-NORMAS-OPERATIVAS-VERBATIM-D041.md` (32 normas N-01…N-32). No se localizaron fuentes literales D-025/D-026; OMM-FUT-010 queda P2 provisional para recuperar o confirmar su procedencia sin reconstrucciones. OCP §52 mantiene esta cobertura y el backlog.

## D-042 · OMM-FUT-009 / release local 0.6.0

OMM-FUT-009 está implementada localmente y la CI Harmonia/CI-LOCAL.ps1 pasa: 104/104 tests, 37 módulos JS/MJS, 6 scripts PowerShell y 9 JSON; contratos del inicializador/parada y cuarentena del índice temporal validados. Se retiró T1/T2/duración/latencia y se sustituyó por estados estructurales ACTIVE/INACTIVE. JSONL histórico intacto; outbox legado en cuarentena local. GitHub Actions, PR/merge a main y aceptación natural pendientes. Roadmap: 0.6.0 OMM-FUT-009; 0.7.0 OMM-FUT-007; 0.8.0 OMM-FUT-008; OMM-FUT-010 P2 sin versión.


## Export conversacional · 2026-11-13 · retoma 15:59

- Export completo: [originales/ChatGPT-HARMONIA-20261113-1559.md](originales/ChatGPT-HARMONIA-20261113-1559.md).
- ID nativo ChatGPT: `6af74ca4-5c60-83e8-8fdf-a79d425567ac`; UUIDv7 local: `01a1d6f2-aa1e-7659-818e-695d34fd9d4c`.
- Created 11:45:10 · Updated 15:49:36 · Exported 15:59:28 (tal como figura en el encabezado; zona horaria no explicitada).
- 79,003 bytes · SHA-256 `FABF7B44D82FC8F1EF99A7638DC5AE6540DBA73E45796AAAB6A805E82920F03B`; copia desde Downloads cotejada y leída de vuelta.
- Se registra como conversación independiente: el ID nativo difiere del export anterior de las 11:45. No se fusionan conversaciones ni se duplican ciclos.
- Segmentación de ciclos de este export: PENDING_SEGMENTATION. El último ciclo técnico completo contenido en la conversación es D-042; su B ya estaba archivado.


## Snapshot operativo local · 2026-11-14 · D-043 / OMM-FUT-009

- OCP local **v0.85 / HARMONIA-v0.85**; v0.84 preservado byte a byte en `archive/OBJETO-CANONICO-v0.84-pre-D043-20261114.md` (SHA-256 `5BC3D3E7D58F3C387D07AC03DE3FE19256CA243B05BF4AF1BAB570FAF146F244`).
- D-043 original A: `originales/HARMONIA-INSTRUCCIONES-VERBATIM-20261114-D043.md`; SHA-256 `04BB60C193FE311F063923624C2B58E3A2D0B07C63DEC345EEBEBDADBFBE8A5F`; 474 bytes.
- D-043 salida B: `originales/HARMONIA-CICLO-20261114-D043-OMM-FUT-009-B.md`; SHA-256 `A4913F8FC3C4DC5C516C9D0509441F09985CF81FDE731BCD961F07C0CF591376`; 7,056 bytes.
- Conversación local UUIDv7 `01a1db6a-1ce0-792e-948f-b13e09b360ab`; ciclo UUIDv7 `01a1db6a-1ce3-7409-9534-c70e3f4e4bc8`; ID nativo no expuesto; FOL1 PREPARADO / NO ACTIVO.
- OMM-FUT-009 / Harmonia 0.6.0: CI local PASS (104/104), commit `87256a41ccdb883210f4fd88a8b02a9978d81191`, rama publicada `work/harmonia-omm-fut-009-0.6.0`, PR #366 abierta contra main. GitHub Actions no asignó runner (`runner_id=0`, `steps=[]`) en el workflow Harmonia ni los gates generales; reintento reprodujo el bloqueo. No hay merge, aceptación natural ni despliegue.
- Auditoría recurrente OMM-FUT-006 O0–O5: **observabilidad revisada / sin delta**; no se justificó crear nuevos productores o una tarea OBS adicional.
- Backlog: siguiente OMM-FUT-007 / 0.7.0 después de cerrar 0.6.0; OMM-FUT-008 / 0.8.0 subordinada a 007; OMM-FUT-010 P2 sigue sin versión. La especificación General v1.4.0 se revisó / sin delta en D-043.
- Índice de continuidad: 10 conversaciones, 1 ciclo D-043; SHA-256 `F5D8A21055B4A29C5B4A480295C291E84BCF271E4CA1FEC1D8942E4B364D2651`. Baseline anterior preservado en `archive/HARMONIA-DATASET-INDEX-pre-D043-20261114.json`, SHA-256 `5C60153872E0E316D8D8CA3F2E629A4D31A9E2815B1E17A546B142301403A94F`.
