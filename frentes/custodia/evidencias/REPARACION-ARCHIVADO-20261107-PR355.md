# CUSTODIA-04 · Reparación del rechazo de archivado · PR #355 · 2026-11-07

## 1. Solicitud y límite del incidente

- Instrucción actual del operador: «Si. Necesito que reparemos el error que reporte ayer, del incidente que impide archivar registros nuevos».
- Cita preservada del error informado el 2026-11-06: «no se puede archivar el registro. Cora no ha verificado la custodia íntegra de todas las partes de audio».
- La transcripción del incidente contiene la variante de cliente localizada en código: «No se puede archivar el registro: Khora no ha verificado la custodia íntegra de todas las partes de audio».
- No se normaliza retroactivamente «Cora» a «Khora» en la cita del operador.
- Este incidente es distinto del dictado ausente del 2026-10-28, que continúa en CUSTODIA-03.

## 2. Diagnóstico técnico respaldado

- La compuerta que muestra el mensaje está en `khora-web/app/components/ingreso/IngresoWorkspace.tsx`, dentro de `guardar()`, y se ejecuta antes del POST a `/api/dictado`.
- La ruta de captura puede conservar el texto/checkpoint mientras una parte de audio queda pendiente por fallo de subida.
- La implementación anterior esperaba la subida en curso, pero no drenaba en forma secuencial e idempotente toda la cola de reintentos antes de evaluar y enviar el manifiesto.
- En consecuencia, el usuario podía tener texto transcrito y aun así recibir el rechazo de archivado por una parte no confirmada.
- Esto demuestra un defecto de coordinación compatible con el síntoma. **No demuestra la causa runtime exacta de la sesión personal del operador**, porque no se adquirieron sus estados de cola, eventos de cierre, respuesta de red ni logs de esa sesión.

## 3. Cambio implementado en rama limpia

- Rama: `fix/custodia-04-archive-retry-20261107-g8`.
- Base: `main` en `3c35c0f41a943b54b971fa3bcf5bcd6112019cbb).
- Head de PR #355: `2841425d6ea4aa2a43998a717c7d585be3f5084f`.
- La comparación muestra 6 commits ahead y 0 behind; merge-base igual a la base actual de `main`.
- Archivos modificados: cuatro rutas de código/pruebas, sin cambios del OCP en la rama:
  - `khora-web/app/components/ingreso/IngresoWorkspace.tsx`
  - `khora-web/app/components/shared/IngresoView.tsx`
  - `khora-web/e2e/contracts/audio-por-partes.spec.ts`
  - `khora-web/tests/unit/custody-regression.test.ts`

### Comportamiento incorporado

1. Antes de archivar, guardar el checkpoint y esperar la subida en curso.
2. Drenar en orden los reintentos pendientes, conservando `sessionId`, índice y bytes originales.
3. Impedir reintentos paralelos mediante una guarda *single-flight*.
4. Impedir archivados duplicados mediante una guarda *single-flight* de la operación completa.
5. Tras reintentar, volver a evaluar todas las partes y el manifiesto. No se omiten partes ni se relaja la validación.
6. Si alguna subida sigue fallando, mantener cerrado el envío a `/api/dictado`, mostrar los índices pendientes y conservar texto/copias locales.
7. Exponer la acción «Reintentar y archivar» cuando existan partes pendientes.
8. Rechazar el archivado si la captura continúa activa o no ha terminado de cerrar.

### Regresiones cubiertas por los archivos de prueba

- Tres respuestas transitorias HTTP 503 y una cuarta subida satisfactoria: el archivado debe ejecutarse una sola vez incluso con doble activación.
- Fallo persistente HTTP 502/no JSON: el endpoint de archivado debe permanecer cerrado y el texto capturado debe seguir visible.
- La prueba unitaria actualiza la expectativa de dependencias del callback de archivado.

## 4. Validación y procedencia

Los cuatro archivos de código/pruebas de la rama son **idénticos byte por byte** a los archivos del commit `55449a08719f04982dbfceb15ec28f43c7b68118`, sobre el que el expediente de PR #354 documenta validación local:
- `npm run typecheck`: aprobado.
- `npm run test:unit`: 572/572.
- `npm run ui:contract`: aprobado.
- `npm run ui-review:check`: aprobado.
- Playwright `audio-por-partes.spec.ts`: 3/3.
- `git diff --check`: aprobado.

La coincidencia de blobs demuestra que el contenido de los cuatro archivos coincide con el corte local validado. No se afirma que los workflows hayan ejecutado de nuevo en la punta de PR #355.

### GitHub Actions en PR #355

- PR [#355](https://github.com/SeryMente/khora/pull/355), creada como DRAFT.
- Head: `2841425d6ea4aa2a43998a717c7d585be3f5084f`.
- Runs:
  - UI Quality: `42394103598`
  - CI: `42394103601`
  - khora-ok / gate: `42394103652`
- Seis jobs consultados individualmente: UI Contract, UI E2E, calidad, khora-web-gate, api-tests y khora-ok.
- Los seis terminaron `completed/failure`, pero todos reportaron `runner_id=0`, `runner_name=""` y `steps=[]`. **Ningún paso de workflow se ejecutó.** Es un bloqueo de asignación de runner, no evidencia de una aserción fallida ni CI aprobado.
- Los checks externos Netlify/Vercel fallaron por la restricción vigente para desplegar repositorios privados de organización con el plan Hobby; no son pruebas funcionales del parche.

## 5. Dictamen actual

- **Implementado:** sí, en rama aislada y PR #355 en borrador.
- **Lectura de vuelta de los cuatro archivos:** sí; los SHA coinciden con la evidencia de contenido ya validada.
- **Pruebas locales previas sobre contenido idéntico:** sí, resultados arriba.
- **Ejecución CI de la punta PR #355:** NO EJECUTADA; falta runner.
- **Build nuevo de esta rama:** NO EJECUTADO.
- **Prueba física con proveedor real no productivo:** NO EJECUTADA.
- **Causa runtime de la sesión concreta del operador:** NO DETERMINADA.
- **Merge/deploy/producción:** NO EJECUTADOS.
- **Aceptación funcional del operador:** PENDIENTE.
- **Garantías E2E/recuperabilidad del producto:** NO CERTIFICADAS.

## 6. Siguiente acción necesaria

Conseguir un runner GitHub autorizado o un entorno local permitido para ejecutar los controles sobre la punta de PR #355. No usar el perfil RDC `CENTRAL\\MantenimientoRCI` excluido; el equipo `015RENTA01` no estaba disponible en el corte previo. Después ejecutar una prueba con proveedor físico real no productivo y lectura de vuelta. Mantener PR #355 sin merge ni despliegue hasta que esas evidencias existan.

## 7. Seguridad y no alteración

- No se consultaron, copiaron ni modificaron registros productivos, audio personal, credenciales o datos Neon.
- No se realizaron cambios en Vercel Blob, Backblaze B2, Neon Production, selector de proveedor, CORS, llaves ni despliegues.
- No se hizo merge ni se cerró PR #354; continúa abierta como antecedente divergido.
- Esta evidencia describe la reparación candidata del bloqueo de archivado; no certifica la recuperación del dictado ausente del 28-10.
