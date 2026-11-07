# Harmonia · carpeta canónica del frente

Entrada única de estado: [OBJETO-CANONICO.md](OBJETO-CANONICO.md). El OCP conserva estado vivo, decisiones, notas temporales, pruebas, historial breve y paquete de traspaso; no se debe crear una fuente de estado competidora.

- [Asistente · instancia fresca / traspaso v1.2](prompts/ASISTENTE.md): entrada, adquisición de gobierno, compuerta de titularidad y secuencia E2E.
- [Constructor · no instanciado](prompts/CONSTRUCTOR.md): ejecutar únicamente bajo su régimen y no utilizar Remote Desktop Commander.
- [Control exclusivo](CONTROL-RESPONSABILIDAD.json): actualmente asignado a la instancia y generación que constan en el JSON; no es un bootstrap sin propietario. Preparar el traspaso no transfiere la titularidad.
- [Originales](originales/PROCEDENCIA.md), [crónica](cronica/HARMONIA-INSTANCIACION-01.md) y [revisión](evidencias/HARMONIA-INSTANCIACION-01-revision.json).

## Estado vigente · 2026-11-07 · generación 15

- OCP canónico main: v0.44 / HARMONIA-v0.44, secciones 46–50.
- Control: generación 15; alias operativo chatgpt-harmonia-01a1b6ca-4543-7578-85d9-7624877c2e80; owner_thread=null (ID nativo no expuesto); session_folio=null (FOL1 no activa).
- RDC autorizado para esta continuidad: PC10RCIF4EI4, UUID d0bbb2a3-d7b4-45e1-8870-652c2c3844fc; Windows 11 Pro; usuario CENTRAL\MantenimientoRCI; perfil C:\Users\MantenimientoRCI; SID S-1-5-21-1529298404-1161420656-882029410-2126.
- Transferencia gen14 a gen15 por CAS y push fast-forward no forzado: commit 6f330f2301f2f2b55988ecbb5285c2b3a45621b7; control blob releído 0e090e1f3537b75891344af812e576e39a5f5e02. El titular anterior y el historial de generaciones permanecen preservados.
- Export ChatGPT-HARMONIA-20261106-1715: NO CAPTURADO / NO LOCALIZADO EN RUTAS CONSULTADAS. Búsquedas por nombre exacto: cero coincidencias en Downloads y Desktop; cero en el perfil con aviso de directorios inaccesibles. No se creó sustituto. El original ChatGPT-HARMONIA-20261101-1709.md permanece como antecedente verificado y no lo reemplaza.
- Crónica y evidencia de transferencia: cronica/HARMONIA-TRANSFER-G15-20261107.md y evidencias/EV-HARMONIA-TRANSFER-G15-20261107.json; revisar su estado en el manifiesto documental.
- Estado técnico conservado: PR #353 sigue como draft sin merge según el último corte técnico. CI, Chrome y EP remoto permanecen no aceptados/no verificados; sin B2, Neon, backfill o despliegue acreditados.

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
