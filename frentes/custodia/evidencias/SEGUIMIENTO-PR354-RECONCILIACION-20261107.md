# Seguimiento de PR #354 y reconciliación de rama · 2026-11-07

- Repositorio: `SeryMente/khora`.
- PR: [#354 · fix(dictado): reintentar custodia de audio antes de archivar](https://github.com/SeryMente/khora/pull/354).
- Rama: `fix/custodia-04-dictado-archivar-e2e-20261106`.
- Estado de PR al corte: OPEN · DRAFT · NOT MERGED, según descripción vigente y comentario de seguimiento; no se intentó merge, rebase ni rerun.
- Corte de consulta: 2026-11-07. El campo `updated_at` del issue/PR seguía en `2026-11-06T23:20:32Z`.

## 1. Comparación con main

Comparación actual de la rama contra `main`:

- Estado: `diverged`.
- Rama PR: 32 commits ahead.
- `main`: 7 commits behind respecto del punto de comparación.
- Merge base: `0aa7497a6316772ccf846620685a87b0711e346c`.
- Punta actual de `main` observada por comparación: `5d2f8f3a4b8626f7ebfb86a5df3ad275f9c6572d`.

La lista de archivos de PR muestra ocho rutas modificadas, incluidas:
- `frentes/custodia/OBJETO-CANONICO.md`
- `frentes/custodia/LISTA-TAREAS-PROVISIONAL.md`
- índice y expediente provisional CUSTODIA-04
- `khora-web/app/components/ingreso/IngresoWorkspace.tsx`
- `khora-web/app/components/shared/IngresoView.tsx`
- `khora-web/e2e/contracts/audio-por-partes.spec.ts`
- `khora-web/tests/unit/custody-regression.test.ts`

La rama PR contiene versiones propias de los dos documentos del OCP:
- OBJETO: blob `ffc8d0becdab8fed8c981b1e79b2240e439a6fc2`; marcador `OBJECT_VERSION=0.17`, pero estado de titularidad gen. 7 y texto interno de versión v0.16.
- Lista: blob `c2cf5f8f7fb5bc8841b4ae511adc0b55650f4546`; versión 0.14, actualización fechada 2026-11-06 y control gen. 7.

En `main`, el control ya está en generación 8 y los documentos fueron actualizados después de la base de la PR. Hay solapamiento documental real; antes de cualquier integración se debe reconciliar el historial y preservar el control gen. 8, la titularidad, la versión canónica y las tareas actuales. No asumir que el merge automático resolverá el contenido correctamente.

## 2. CI y checks

Ejecuciones asociadas al commit de validación descrito por la PR (`55449a08719f04982dbfceb15ec28f43c7b68118`):
- CI run `42308741732`: `calidad`, `api-tests`, `khora-web-gate`.
- UI Quality run `42308741716`: `UI Contract`, `UI E2E`.
- khora-ok / gate run `42308741666`: `khora-ok`.

Los seis jobs terminaron `completed/failure`. La consulta individual de pasos devolvió listas vacías para los seis jobs: **ningún paso de workflow fue ejecutado**. El estado failure no demuestra fallas de código; demuestra que no existe evidencia de ejecución CI en esos jobs.

Los seis contextos de Preview observados (Vercel y Netlify) también aparecen en failure por restricciones del plan para repositorios privados de organización, según los enlaces y mensajes del bot. No se cuentan como pruebas funcionales.

## 3. Validación local y límites

La descripción de PR documenta para el commit `55449a08719f04982dbfceb15ec28f43c7b68118`:
- typecheck aprobado;
- unitarias 572/572;
- UI Contract aprobado;
- UI Review aprobado;
- Playwright focal 3/3;
- `git diff --check` aprobado.

La misma descripción especifica:
- E2E usa respuestas simuladas en las rutas de audio/checkpoint/archivo; no demuestra proveedor físico.
- `npm run build` no fue ejecutado en ese corte.
- No hubo ensayo real con proveedor no productivo, lectura física posterior, recálculo SHA-256 de bytes del proveedor, despliegue ni merge.
- La causa runtime de la sesión concreta continúa NO DETERMINADA.

Estos resultados se atribuyen al SHA indicado, no a la punta actual de la rama, que no se volvió a validar en este ciclo.

## 4. Dictamen y siguiente paso

- Corrección implementada en rama y validación local reportada; no integrada.
- CI remoto sin ejecución; causa de falta de runner no determinada.
- Rama PR diverged y con solapamiento documental respecto de main.
- Producto y garantías de recuperabilidad NO CERTIFICADOS.
- No se modificó la rama PR, no se hizo rebase/merge, no se cambió producción y no se tocaron credenciales/datos personales.

**Siguiente paso de CUSTODIA-04:** preparar un plan de reconciliación por archivo contra el main actual, preservar la generación 8/control y resolver el bloqueo de runners; después repetir los gates en la punta resultante y ejecutar ensayo autorizado con proveedor real no productivo y read-back físico.

**Prioridad superior intacta:** CUSTODIA-03 → CUSTODIA-01 → CUSTODIA-04. Este seguimiento no desplaza la recuperación del dictado ausente ni constituye recuperación productiva.
