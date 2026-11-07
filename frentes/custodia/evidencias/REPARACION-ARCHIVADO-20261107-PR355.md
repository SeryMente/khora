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

## 5. Dictamen actual · actualización posterior a merge y deployment

- **Implementado e integrado:** sí. PR #355 cerrada y fusionada el 2026-11-07; merge commit `8489a09c03a330b85f3e31297415ada7a19fe10e`.
- **Publicación:** sí. Vercel `khora-web`, target production, deployment `dpl_HRPV5F7FteWVZquUjfZcumA52atg`, READY, alias `https://khora-web.vercel.app`, commit exacto del merge.
- **Respuesta live:** HTTP 200 y pantalla de acceso OIDC; SSO está activo. La comprobación no fue autenticada y no ejecutó el flujo de archivar desde navegador.
- **Pruebas locales en el worktree del PR:** `npm ci`, TypeScript, UI Review, UI Contract, preflight/extensión, 572/572 unitarias, `next build --webpack`, audio E2E 3/3, smoke E2E 4/4 y diff-check: PASS.
- **Cobertura pendiente/fallida sin atribución al parche:** Playwright focal UI 20/23 (tres fallos en renderizado de Grafo y navegación por teclado); suite E2E general de 141 casos iniciada y detenida tras timeouts/fallos; pytest/kernel/API no ejecutado por ausencia de dependencias/Docker/Neo4j.
- **GitHub Actions:** los seis jobs de dos intentos previos terminaron sin runner y `steps=[]`; CI no queda declarada verde.
- **Build hook productivo:** el log del deployment registra ejecución de `migrate-runtime` y anuncia la aplicación de migraciones 023–029. Fue un efecto automático de la configuración existente del proyecto durante el build; no se ejecutó SQL manual ni se inspeccionaron datos. Debe revisarse el efecto del esquema/configuración antes de cambios productivos adicionales.
- **No demostrado:** proveedor físico real no productivo, lectura de vuelta de bytes del audio, flujo autenticado live de «Archivar registro», telemetría de la sesión original y causa runtime exacta.
- **Estado:** código fusionado y publicado; aceptación E2E/garantías de producto PENDIENTES. CUSTODIA-04 permanece ABIERTA hasta cerrar los puntos anteriores.


## 6. Siguiente acción necesaria

1. Revisar de forma acotada el efecto del hook automático de migraciones 023–029 registrado en el build de producción y confirmar el estado esperado del esquema; no aplicar SQL adicional ni revertir migraciones sin evidencia y autorización específica.
2. Completar el test funcional autenticado del flujo «Reintentar y archivar» en una sesión controlada, con evidencia minimizada.
3. Ejecutar prueba con proveedor físico real no productivo y GET/read-back de bytes con recálculo de integridad.
4. Resolver GitHub Actions (runner sin pasos) y los tres fallos UI de Grafo por separado. No etiquetar CI completa como verde hasta ejecutar todos los gates requeridos.
5. Capturar diagnóstico runtime autorizado de la sesión original, si aún es posible, sin recopilar texto/audio privado fuera del soporte autorizado.

## 7. Seguridad y alcance de acciones

- No se consultaron ni trasladaron registros de audio personales, credenciales o datos de sesiones de producción.
- No hubo ejecución manual de SQL, cambio de proveedor, selector, CORS, llaves ni credenciales.
- El deployment de producción ejecutó automáticamente el hook preexistente `migrate-runtime`; los eventos de build registran migraciones 023–029 aplicadas. Se deja explícito como efecto colateral del despliegue para revisión.
- PR #354 permanece como antecedente abierto/divergido; no se cerró ni modificó en este ciclo.
- El original `ChatGPT-CUSTODIA-20261107-1157.txt` quedó preservado en `frentes/custodia/originales/` con SHA-256 `7E256B9888F2A0227632D39D22B98E9BD1316548E057E83514ADE61376A93CC5`, 42,629 bytes y lectura de vuelta exacta.
