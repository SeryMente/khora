# Harmonia · Crónica del ciclo OMM-01-040 · Especificación general y mantenimiento ciclo a ciclo

**Fecha:** 2026-11-12  
**Conversación local UUIDv7:** `01a1d0fd-681e-7243-a8ed-ca8e3dff2e71`  
**Ciclo local UUIDv7:** `01a1d1f1-febb-7736-88da-74e3537d2657`  
**Fuente A:** `originales/HARMONIA-INSTRUCCIONES-VERBATIM-20261112-D038.md` · SHA-256 `466570A53061B8D01A2D9E29A5F100916B0879C5668F20005E54F3131149D7CA`.

## Secuencia ejecutada

1. Se consultó la revisión vigente de `SeryMente/metodologia/main`: Samantha v393 / NX-393m, commit `b62d99bb49c35e6cfe280ebeace5ce5dbde9a675`, blob `844fc507a2a9a0bfc8f4e68884cca9f6d2912c96`, GOW 2.21. Se registró la discrepancia de Metacanon 1.31/1.30 y la prohibición de §52 sobre métricas temporales.
2. Se capturó la instrucción D-038 como original verbatim, sin correcciones ortográficas, y se cotejó por lectura de vuelta.
3. Se creó `ESPECIFICACION-GENERAL.md` v1.0.0. Su contenido integra arquitectura, contratos, modelo de datos, A/B, privacidad, pruebas, aceptación y mantenimiento obligatorio por ciclo.
4. Se verificó el OCP base v0.79 por SHA-256, se preservó una copia byte a byte en `archive/` y se actualizó el OCP local a v0.80. El archivo previo conserva el mismo SHA que el OCP base.
5. Se reorganizó §12: cuatro ejes activos 035–038; se conservaron las tareas 000–034 y 039 como descomposición técnica subordinada, adscritas a eje padre; FUT-001..003 siguen diferidas bajo 038; OMM-01-040 se incorporó como sub-tarea documental del eje 038.
6. Se actualizó el propósito del producto para reflejar observación estructural no temporal mientras Metacanon §52 esté vigente. La instrumentación temporal histórica se conserva como candidata no conforme/bloqueada; no se modificó el DUG ni el código temporal.
7. Se incorporó D-038 al registro de instrucciones del OCP, se actualizó la referencia DUG a v393 y se modificó el README del frente para apuntar a la especificación y mostrar el snapshot local.
8. B y crónica quedaron persistidas y releídas de vuelta; el índice JSON fue actualizado y leído de vuelta con el tercer ciclo y A/B. Las huellas finales y tamaños quedaron cotejados.
9. Validación del índice: PASS mediante validador recursivo local que comprueba los tipos, required, additionalProperties, refs, const, pattern y formatos date-time del esquema declarado; Ajv no está instalado en este workspace, por lo que no se atribuye una ejecución Ajv.
10. Validación local del puente SPA: `node --test Harmonia/Extension/history-bridge.test.js` 3/3 PASS; `node --check` en `content.js`, `history-bridge.js` y `service-worker.js` PASS.
11. Integración Chromium headless aislada: NO VERIFICADA. Dos intentos de Chrome 157 terminaron antes de conectar el target DevTools (uno informó `Multiple targets are not supported in headless mode`, el segundo salió con código 13). Solo se usó un perfil temporal; se detuvo el proceso y se eliminó la carpeta temporal. No se tocó Chrome principal ni los archivos fuente de la extensión. PROCEDENCIA se completa con las referencias inmutables de este corte.

## Decisiones y controles

- El OCP es la fuente de estado vivo y backlog; la especificación es la definición técnica integral, sin duplicar la autoridad del OCP.
- El mantenimiento de la especificación es condición del cierre documental de cada ciclo sustantivo. Un ciclo sin cambio debe registrar «revisada / sin delta»; nunca fingir un delta ni incrementar versión por rutina.
- FOL1 no está activa. Todas las referencias son UUIDv7 locales; no se emitieron folios globales.
- El DUG y el repositorio Metodología no se modificaron.
- La rama de trabajo permanece `work/harmonia-front-workspace-20261110`; HEAD base `9fd5c18205e39b6db12c9152b07d8f880f6b256d`; no hubo commit, push, PR, merge ni despliegue.
- No se intervino Chrome principal. Candidata 0.4.9 no está aceptada naturalmente; BMO-01 sigue NO ALCANZADO.
- La métrica de duración/latencia permanece NO CONFORME/BLOQUEADA por Metacanon §52. La fixture sintética histórica de 600 ms no es aceptación.
- La segmentación histórica completa de exportaciones sigue parcial. El índice registra únicamente ciclos con procedencia disponible; no reconstruye faltantes.

## Evidencia de cierre documental

| Artefacto | SHA-256 | Bytes | Estado de verificación |
|---|---|---:|---|
| A · D-038 · `originales/HARMONIA-INSTRUCCIONES-VERBATIM-20261112-D038.md` | `466570A53061B8D01A2D9E29A5F100916B0879C5668F20005E54F3131149D7CA` | 173 | Persistido; lectura de vuelta exacta. |
| B · `originales/HARMONIA-CICLO-20261112-OMM-01-040-B.md` | `33BBC38214C77A26A592516FB680FD861BD41EF6657147E2AA887A1F12CA6A6E` | 7,273 | Persistido; lectura de vuelta completa; SHA cotejado; vinculado en índice A/B. |
| Especificación general v1.0.0 | `3C0BE96A010231F5084D1C2A6051C552289174CA9357964D25613D45DFC44D0F` | 24,391 | Persistida y releída; segunda revisión registrada como «revisada / sin delta técnico». |
| OCP v0.80 local | `5972A03A5CDD0E365BC876504F51E060017DA43902E679F2FB0057D923018403` | 240,916 | Persistido y releído; encabezado, cuatro ejes y secciones 12/44 cotejados. |
| Archivo OCP v0.79 | `26774C8CFFA9A38A019DC07F5D298B2EED7BCF23D906FC22C18ADEC8FD32D198` | 233,168 | Copia exacta byte a byte del OCP previo. |
| Índice de continuidad JSON | `26B65CF11EEAF1275410EC0DF3CFBA638DC32E957FD87327D3ECA09DC8D99B8B` | 17,562 | JSON leído de vuelta; JSON Schema v1.0.0 validado; ciclo y partes A/B cotejados; cobertura sigue PARTIAL; folios globales nulos. |
| README del frente | `A6DBAA21CF4ED75524430BFEB1D1B6B26A2F7C4DBB569580D1F35052E17FD4D0` | 14,249 | Persistido y lectura de vuelta del snapshot vigente. |
| Esta crónica | Se registra en `PROCEDENCIA.md` tras su lectura de vuelta final. | Se registra en `PROCEDENCIA.md`. | Persistida; lectura de vuelta completa. |

**Cierre de evidencias:** índice actualizado a `2026-11-12T23:10:21.393Z`; contiene tres ciclos locales de esta conversación y el nuevo ciclo OMM-01-040 con A/B. El validador recursivo local comprobó las restricciones estructurales declaradas por el JSON Schema v1.0.0, incluyendo el patrón UUIDv7 local y date-time; resultado PASS sin errores. Ajv/ajv-formats no están instalados y no se declaran ejecutados. Los exports históricos permanecen sin segmentar; por tanto, `coverage.status=PARTIAL` y `historical_cycles_segmented=false` se conservan deliberadamente.

La crónica y sus bytes/hash finales se incorporan append-only a `originales/PROCEDENCIA.md`.
