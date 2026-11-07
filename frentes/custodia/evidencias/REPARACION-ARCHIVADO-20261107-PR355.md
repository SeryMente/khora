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
- Base al crear la rama: `main` en `3c35c0f41a943b54b971fa3bcf5bcd6112019cbb`.
- Head de PR #355: `2841425d6ea4aa2a43998a717c7d585be3f5084f`.
- Comparación actual antes de esta actualización documental: `main` `650e4b285ce57d172ac0fe8c9c668f263e4fbc6f`; estado `diverged`, 6 commits ahead / 3 behind, merge-base `3c35c0f41a943b54b971fa3bcf5bcd6112019cbb`. Los tres commits exclusivos de `main` afectan documentación de Custodia; el diff de la PR sigue limitado a cuatro archivos de código/pruebas y no comparte esas rutas.
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

La coincidencia de blobs demuestra que el contenido de los cuatro archivos coincide con el corte local validado. Esto acredita identidad de contenido, no ejecución nueva de pruebas en la punta de PR #355; el estado de Actions se detalla a continuación.

### GitHub Actions en PR #355

- PR [#355](https://github.com/SeryMente/khora/pull/355), creada como DRAFT.
- Head: `2841425d6ea4aa2a43998a717c7d585be3f5084f`.
- Runs:
  - UI Quality: `42394103598`
  - CI: `42394103601`
  - khora-ok / gate: `42394103652`
- Seis jobs consultados individualmente en la primera tentativa: UI Contract `128467683626`, UI E2E `128467683788`, calidad `128467683229`, khora-web-gate `128467683435`, api-tests `128467683566` y khora-ok `128467684110`.
- Se reintentaron los tres runs mediante la acción de repetir jobs fallidos. Los nuevos jobs fueron UI Contract `128469824848`, UI E2E `128469824833`, calidad `128469834073`, khora-web-gate `128469834007`, api-tests `128469834155` y khora-ok `128469840670`; los seis se consultaron por separado y cada consulta de pasos devolvió `steps=[]`.
- En la primera tentativa, los seis terminaron `completed/failure` con `runner_id=0`, `runner_name=""` y `steps=[]`. Tras repetir los tres runs, los seis jobs volvieron a terminar `completed/failure`; cada consulta de pasos devolvió `[]` y `logs_url=null`. **Ningún paso de workflow se ejecutó en ninguna de las dos tentativas.** No es una falla de aserciones del parche ni CI aprobado.
- Los tres workflows declaran `runs-on: ubuntu-latest` (`.github/workflows/ci.yml`, `.github/workflows/ui-quality.yml` y `.github/workflows/khora-ok.yml`); el bloqueo no depende del runner local RDC. La causa exacta del no-arranque (configuración/permisos/entitlement/servicio de Actions u otra condición de GitHub) permanece NO DETERMINADA.
- Los checks externos Netlify/Vercel fallaron por la restricción vigente para desplegar repositorios privados de organización con el plan Hobby; no son pruebas funcionales del parche.

## 5. Dictamen actual

- **Implementado:** sí, en rama aislada y PR #355 en borrador.
- **Lectura de vuelta de los cuatro archivos:** sí; los SHA coinciden con la evidencia de contenido ya validada.
- **Pruebas locales previas sobre contenido idéntico:** sí, resultados arriba.
- **Ejecución CI de la punta PR #355:** NO VALIDADA. GitHub generó workflows y jobs en dos tentativas, pero ninguno ejecutó pasos; no hay evidencia de pruebas nuevas aprobadas ni de aserciones fallidas.
- **Build nuevo de esta rama:** NO EJECUTADO.
- **Prueba física con proveedor real no productivo:** NO EJECUTADA.
- **Causa runtime de la sesión concreta del operador:** NO DETERMINADA.
- **Merge/deploy/producción:** NO EJECUTADOS.
- **Aceptación funcional del operador:** PENDIENTE.
- **Garantías E2E/recuperabilidad del producto:** NO CERTIFICADAS.

## 6. Siguiente acción necesaria

Resolver primero la disponibilidad/configuración de GitHub Actions para sus jobs `ubuntu-latest` o disponer de un entorno local expresamente autorizado. Después ejecutar los gates sobre la punta de PR #355, realizar build y una prueba con proveedor físico real no productivo y lectura de vuelta. El perfil RDC `CENTRAL\\MantenimientoRCI` continúa excluido; no usarlo. Mantener PR #355 en borrador y sin merge/despliegue hasta obtener esas evidencias.

## 7. Seguridad y no alteración

- No se consultaron, copiaron ni modificaron registros productivos, audio personal, credenciales o datos Neon.
- No se realizaron cambios en Vercel Blob, Backblaze B2, Neon Production, selector de proveedor, CORS, llaves ni despliegues.
- No se hizo merge ni se cerró PR #354; continúa abierta como antecedente divergido.
- Esta evidencia describe la reparación candidata del bloqueo de archivado; no certifica la recuperación del dictado ausente del 28-10.
