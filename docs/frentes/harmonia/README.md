# Harmonia · carpeta canónica del frente

Entrada única de estado: [OBJETO-CANONICO.md](OBJETO-CANONICO.md). El OCP conserva estado vivo, decisiones, notas temporales, pruebas, historial breve y paquete de traspaso; no se debe crear una fuente de estado competidora.

- [Asistente · instancia fresca / traspaso v1.2](prompts/ASISTENTE.md): entrada, adquisición de gobierno, compuerta de titularidad y secuencia E2E.
- [Constructor · no instanciado](prompts/CONSTRUCTOR.md): ejecutar únicamente bajo su régimen y no utilizar Remote Desktop Commander.
- [Control exclusivo](CONTROL-RESPONSABILIDAD.json): actualmente asignado a la instancia y generación que constan en el JSON; no es un bootstrap sin propietario. Preparar el traspaso no transfiere la titularidad.
- [Originales](originales/PROCEDENCIA.md), [crónica](cronica/HARMONIA-INSTANCIACION-01.md) y [revisión](evidencias/HARMONIA-INSTANCIACION-01-revision.json).

## Fuente de código y aceptación

- `main` publica el manifiesto MV3 **v0.3.0** (blob `5c2dd6d616c4ba19541d03df8fbc4abc6f0a11b6`); la candidata `feat/harmonia-e2e-20261021` contiene **v0.4.0** (manifest blob `902968968cc121590a0d6b60fd10c06ea12f5409`). La PR [#333](https://github.com/SeryMente/khora/pull/333) se comprobó en vivo el 2026-10-29: sigue abierta en borrador, sin fusionar; GitHub reporta última actualización 2026-10-23. No se declara aceptada la candidata.
- Se leyó la candidata y sus contratos/tests desde GitHub, pero no hubo ejecución local actual de Node/Chrome en este ciclo. El test `collector.integration.test.js` usa eventos sintéticos para validar el colector; no prueba captura natural del content script. Los 5/5 tests referidos en historial son resultados históricos, no evidencia reejecutada hoy.
- Se reintentó CI: el job de Harmonia terminó en `failure` sin runner/pasos/logs/artefactos. La causa raíz queda **NO DETERMINADA**; no se atribuye a código ni se declara CI aprobada. No repetir tests generales para diagnosticar sin logs.
- El OCP actual es **v0.28 / HARMONIA-v0.28**, §§1–35; §35 documenta la revisión del 2026-10-29. El pool v1 requiere captura real en dos sesiones/pestañas, al menos cinco huellas, mensajes visibles por sesión, no cruces, replay idempotente, recuperación tras reinicio, corpus saneado, hash y read-back exacto. La traza real disponible sigue siendo solo diagnóstica (627 eventos sin superficie ni mensaje visible); la fixture de 11 eventos es sintética.
- Los registros históricos mencionan `C:\Users\PC 13\Desktop\Harmonia`; ese destino no está verificado actualmente y no debe seleccionarse por inercia. No afirmar que el paquete local coincide con `main`.

La consulta RDC viva del 2026-10-29 no encuentra el UUID autorizado de Harmonia `345f64ee-5d6a-429f-a97c-dab44f44cddb`. Dos registros llamados `PC-14` tienen otros UUID (`6f97ebe0-ac17-4628-9fab-d22b95a9fcb6` y `18801fe3-a3e2-4d64-9cec-37d02692fdfb`) y están offline. PC-4 (`89864f62-e921-4353-96dc-3a471e50920d`) está online, pero tiene trabajo de Khora ajeno y no se selecciona. No ejecutar operaciones locales hasta restaurar el UUID autorizado, comprobar conectividad y validar cuenta Windows → SID → `Win32_UserProfile.LocalPath`. La discrepancia entre rutas históricas (`PC 13`) y el perfil declarado (`CENTRAL\fila4` / `C:\Users\fila4`) continúa sin resolver; no adivinar. Nunca usar ni leer `C:\Users\MantenimientoRCI\` como raíz operativa.


La formalización del criterio multiámbito de §16 sigue pendiente mediante el FT de Metacanon; sus notas siguen siendo temporales hasta entonces.


## Continuidad histórica · SES-20261022-R8Q4N6P1 (generación 5 sustituida)

Control histórico de generación 5, folio `SES-20261022-R8Q4N6P1`, blob `ac797019939f2f93dcbe2c98b73b36d71b30a900`. Esta titularidad fue sustituida primero por gen6 y después por gen7 mediante transferencias registradas con CAS y lectura de vuelta. El bloque se conserva solo como historia; ya no determina el titular ni el siguiente paso.


## Entrega del pool mínimo suficiente — SES-20261022-R8Q4N6P1

[Traza real saneada](datos/observaciones/HARMONIA-TRAZA-OBSERVACION-REDACTADA-20261022.jsonl) y [manifiesto](datos/observaciones/HARMONIA-TRAZA-OBSERVACION-REDACTADA-20261022.manifest.json) están guardados en main. La traza tiene 627 eventos (611 de consola, 10 de inicio, 6 de parada), cero malformados y no contiene eventos estructurales ni mensajes visibles. [Fixture sintética](datos/observaciones/HARMONIA-POOL-MINIMO-V1-SINTETICO.jsonl) aporta 11 eventos de diseño, cinco huellas y dos sesiones; no demuestra captura real. Ver [baseline](evidencias/HARMONIA-OBSERVACION-BASELINE-20261022.json) y [criterio de suficiencia](evidencias/HARMONIA-CRITERIO-SUFICIENCIA-POOL-V1.md).

La publicación puntual quedó verificada por lectura de vuelta exacta. La publicación automática recurrente desde la extensión no está implementada; el worker sincroniza metadatos de solo lectura y no sube observaciones.


## Estado histórico sustituido · SES-20261022-6E3A91F7 (generación 7)

OCP v0.26. Control exclusivo: generación 7; folio `SES-20261022-6E3A91F7`; blob del control releído `636a43c6e89355bba94154f2e48f465226030396`; transferencia desde gen6 mediante commit `0a654c4d76ac2b85ccba62d479c6c44abe371090`. Autorización `Si` literal: [original U19](originales/HARMONIA-TRANSFER-SES-20261022-6E3A91F7.jsonl). [Crónica de transferencia](cronica/HARMONIA-TRANSFER-SES-20261022-6E3A91F7.md) y [última salida íntegra](originales/HARMONIA-TRANSFER-SES-20261022-6E3A91F7-salida.md).

La consulta viva de RDC de este ciclo confirma que el UUID autorizado de PC-14 `345f64ee-5d6a-429f-a97c-dab44f44cddb` continúa OFFLINE. No se usó el otro dispositivo online. No hubo operaciones locales ni pruebas de Chrome, CI o E2E en este ciclo; el paquete local y la raíz directamente cargable siguen NO VERIFICADOS. Reanudar operaciones locales solo tras recuperar el mismo UUID y verificar usuario/perfil Windows.

## Estado activo · revisión HARMONIA-CICLO-SES-20261028-P9K4R7M2-20261029

- OCP canónico: [OBJETO-CANONICO.md](OBJETO-CANONICO.md), v0.28 / HARMONIA-v0.28, §35; blob leído de vuelta `88c2cbaec4b0f21bc00506e78ebd2913e5679b44`.
- Responsabilidad sin cambios: `CONTROL-RESPONSABILIDAD.json`, generación 8, folio activo `SES-20261028-P9K4R7M2`, alias `chatgpt-harmonia-SES-20261028-P9K4R7M2`, blob actual `2b8e5091e621b1017ed1e55f2796cc48f9ba444b`. U20 conserva la autorización literal `Si` (blob `bfe29b24091e039f901592b66887336a9b8b0235`). No se transfirió ni mutó el control en este ciclo.
- Gobierno rereleído en `SeryMente/metodologia/main`: DUG v360 / NX-360m, blob `3cda9d38db1bee76ff0ca752f3ecde8719c70d41`; INICIO blob `345d2b383f07c762afbdcc2dc567ce27451aa6e5`; Metacanon 1.24 y GOW 2.9 integrados. Commit/edad exactos no expuestos. `MCP-NORMATIVO: DESACTIVADO`; metodología no se modificó.
- Original de solicitud U21: [`HARMONIA-REVISION-E2E-SES-20261028-P9K4R7M2-20261029.jsonl`](originales/HARMONIA-REVISION-E2E-SES-20261028-P9K4R7M2-20261029.jsonl), blob `fa55c374b504b29c2565b310b343cf081c4e7c71`. Salida y crónica: [salida del ciclo](originales/HARMONIA-CICLO-SES-20261028-P9K4R7M2-20261029-salida.md) y [crónica](cronica/HARMONIA-CICLO-SES-20261028-P9K4R7M2-20261029.md).
- `main` v0.3.0; candidata v0.4.0 en rama separada. Sin cambio de código, merge ni aceptación funcional. Reintento CI falló sin runner, pasos, logs ni artefactos; causa no determinada. Autosync local→GitHub no implementado.
- Inventario RDC del 2026-10-29: UUID autorizado `345f64ee-5d6a-429f-a97c-dab44f44cddb` ausente. Dos entradas PC-14 están offline con UUID distintos; PC-4 está online pero pertenece a otra tarea y no se usó. Ninguna operación remota/local se ejecutó para Harmonia.
- E2E real sigue **ABIERTA**; paquete/raíz cargable y perfil físico NO VERIFICADOS. La acción bloqueante es restaurar el UUID exacto y aportar handshake de conectividad y cuenta → SID → perfil, sin secretos. Si se inicia RDC de nuevo, el único comando normativo de Metacanon §13 es `npx @wonderwhy-er/desktop-commander@latest remote --no-persist-session`.
