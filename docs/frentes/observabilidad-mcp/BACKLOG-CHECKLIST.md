# Checklist maestro de backlog — KHORA-MCP

**Tipo:** documento vivo de seguimiento del backlog; no crea tareas, frentes, módulos, controles, responsables ni folios nuevos.  
**Corte:** 2026-11-01 · America/Mexico_City.  
**OCP padre:** [OBJETO-CANONICO.md](./OBJETO-CANONICO.md), versión v0.3.12.  
**Control vigente:** [CONTROL-RESPONSABILIDAD.json](./CONTROL-RESPONSABILIDAD.json), generación 9.  
**Índice de tareas formales:** [Tareas provisionales](./📁%20🧭%20-%20Tareas%20provisionales/README.md).  
**Titular global:** `chatgpt-khora-mcp-01a199dd-30ba-7843-92ae-278ff01d4229`.  
**Corresponsable arquitectónico Jules:** `chatgpt-khora-mcp-module-jules-01a19912-7918-7602-af7a-e2828585e314`.

## Convenciones de estado

- `[x]` Evidencia ejecutada y cotejada.
- `[ ]` Pendiente de ejecutar o revisar.
- `[!]` Bloqueado por una compuerta, dependencia o autorización.
- `[~]` En curso; existe avance, pero no satisface el cierre.

Los estados se aplican a cada punto, no al conjunto de una tarea. No se cierran tareas por compilación, despliegue, documentación o metadatos aislados. El cierre exige el criterio del núcleo de tarea, evidencia adecuada y lectura de vuelta. La autorización global no sustituye los permisos específicos de Production, secretos, bases de datos, migraciones o escrituras upstream.

---

## 1. TASK-001 — Continuidad documental y reconstrucción del workspace

**Estado:** `completada`  
**Núcleo:** [KHORA-MCP-TASK-001](./📁%20🧭%20-%20Tareas%20provisionales/📁%20🧩%20-%20KHORA-MCP-TASK-001%20-%20Continuidad%20y%20reconstrucci%C3%B3n%20del%20workspace/README.md)

### Continuidad documental

- [x] Recuperar y preservar el export conversacional del 1 de noviembre.
- [x] Cotejar tamaño, SHA-256 y lectura de vuelta exacta del export.
- [x] Persistir el manifiesto documental con alcance expresamente limitado a los exports incluidos.
- [x] Actualizar OCP, índice y TASK-001 con la evidencia de persistencia y transferencia de responsabilidad.
- [x] Verificar el control global en generación 9, conservar la titularidad saliente y mantener la autoridad arquitectónica modular Jules.

### Workspace RDC — ciclo de trabajo 1

- [x] Identificar el dispositivo conectado: `015RENTA01`, Windows x64, perfil `C:\Users\PC`.
- [x] Localizar Git portable preexistente bajo `%LOCALAPPDATA%\KhoraTools\MinGit-2.56.0.4`; ejecutar y verificar `git version 2.56.0.windows.4`. No se instaló ni sobrescribió software en este ciclo.
- [x] Conservar intacta la rama local `feat/khora-mcp-module-jules-20261101` en `khora-jules-main`; el árbol local está limpio y su HEAD coincide con la rama remota en `c5f56d070e0a5f4cb0956f5f2ee6094e18a05f73`.
- [x] Verificar que esa rama Jules está divergida de `main`: 27 commits ahead, 32 behind, merge-base `8850b47fdfc2b24a670f653b1e3cf883f2bde055`. No se hizo merge ni rebase.
- [x] Crear un checkout independiente desde `origin/main` en `C:\Users\PC\Desktop\Khora\khora-mcp-main`, sin sobrescribir carpetas preexistentes.
- [x] Leer de vuelta `HEAD`, `origin/main`, remoto y estado Git del nuevo checkout: ambos SHA `16b84131e4a61dfaca618570e4c241597fa38cf8`; rama `main`; árbol limpio.
- [x] Ejecutar `node --check` sobre `khora-web/tools/jules-rdc-bridge/bridge.mjs`: PASS.
- [x] Parsear `jules.ps1` y `credential.ps1` con el parser de PowerShell: PASS.
- [x] Verificar que Git ignora `.khora-local/` y que la carpeta no existe en el checkout restaurado.
- [x] Confirmar que `khora-web/node_modules` no está materializado en el nuevo checkout.
- [x] Verificar que `.env.local`, `.vercel`, `khora-web/node_modules` y `.khora-local` están ausentes del checkout restaurado, sin leer contenidos; confirmar las reglas de exclusión aplicables, incluida `.khora-local/` para la ruta DPAPI.
- [x] Materializar las dependencias desde `package-lock.json`; `npm ls --depth=0 --omit=optional` terminó con exit 0 y árbol completo. La invocación npm ci tuvo código 1 en el wrapper PowerShell por una advertencia emitida en stderr; esa llamada no se declara exit 0.
- [x] Ejecutar en el checkout actual suite unitaria (572/572), typecheck, UI Review, contrato de navegación y build (Next.js 16.4.0, 78/78 páginas); todos finalizaron con exit 0.
- [x] Cotejar las pruebas del checkout nuevo con el SHA exacto `a9bed89b3bb0c48291b836348e2d264f11ece5f8` de `main` y registrar los resultados de ejecución.

**Salvedad de instalación:** `npm ci --no-audit --no-fund` materializó los paquetes, pero el wrapper PowerShell reportó código 1 al elevar una advertencia deprecada de npm desde stderr. La verificación independiente `npm ls --depth=0 --omit=optional` terminó con código 0 y mostró el árbol completo. Se conserva esta diferencia en vez de afirmar que npm ci salió con 0.  
**Estado de cierre:** completada; pruebas y build del checkout nuevo aprobados.

### Integridad del workspace

- [x] Mantener separado el checkout incompleto preexistente `khora-main`; no contiene `.git` y no se modificó.
- [x] Mantener separado el checkout `khora-jules-main` y su rama divergente; no se reescribió su historial.
- [x] Preservar sin cambios las carpetas históricas `khora-main` y `khora-jules-main`; no se borraron, renombraron, fusionaron ni reescribieron.
- [x] Registrar el estado local final y leer de vuelta la evidencia en TASK-001, el índice, OCP v0.3.12 y este checklist.

## 2. TASK-002 — General: acceso MCP, catálogo y observabilidad

**Estado:** `en_curso`  
**Núcleo:** [TASK-002 — General](./📁%20🧭%20-%20Tareas%20provisionales/📁%20🧩%20-%20KHORA-MCP-TASK-002%20-%20General%20-%20acceso%20y%20observabilidad/README.md)

- [ ] Revalidar el endpoint `/api/mcp`, transporte y negociación desde un cliente MCP real.
- [ ] Inventariar las capacidades efectivamente expuestas: herramientas, recursos, prompts e instrucciones especializadas.
- [ ] Comparar `tools/list` y capacidades descubiertas con los contratos y handlers reales de `main`.
- [ ] Probar OAuth, identidad del sujeto, scopes y publicación selectiva; distinguir metadatos públicos de invocaciones autenticadas.
- [ ] Probar gates positivos y negativos: propietario, `jules:read`, `jules:write`, `norm:turn` cuando aplique y denegación fail-closed.
- [ ] Verificar ACL por `subject + source + branch + capability` para sujetos adicionales, sin grants implícitos.
- [ ] Verificar migración ACL, privilegios mínimos y rol efectivo de `KHORA_READONLY_DATABASE_URL` sin revelar secretos.
- [ ] Ejecutar una consulta de observabilidad autenticada con datos reales, filtros, cursores y paginación.
- [ ] Comprobar aislamiento por sesión, saneamiento y exposición mínima de resultados.
- [ ] Verificar interoperabilidad con los clientes MCP comprendidos en el alcance.
- [ ] Resolver Preview mediante configuración segura no productiva; no copiar secretos de Production.
- [ ] Mantener Dictado como consumidor de diagnóstico: sin cambios de UX, audio, transcripciones ni datos.

### Evidencia estática y comprobación pública — Ciclo 2

- [x] Revisar la matriz de scopes declarada por `MCP_TOOL_SCOPES`: herramientas de audio/volcados, runtime, normativas y Jules usan scopes diferenciados.
- [x] Inspeccionar el handler `/api/mcp`: config obligatoria, guard de `KHORA_READONLY_DATABASE_URL` en Production, validación Bearer/JWT o token manual, issuer/audience, generación de revocación y rechazo por scope insuficiente.
- [x] Confirmar que `tools/list` filtra capacidades por scopes del token; los handlers Jules usan `jules:read` / `jules:write` sin `norm:turn`, mientras el host aplica su gate normativo al resto de herramientas sustantivas.
- [x] Revisar estáticamente las consultas de observabilidad: parámetros SQL, filtros opcionales por sesión/componente/severidad/resultado/fase/scope/categoría, límite de 1–200, ventana de 1–86400 segundos y cursor incremental con `id > cursor`.
- [x] Consultar Production sin credenciales: OAuth Authorization Server metadata HTTP 200; Protected Resource metadata HTTP 200; `GET /api/mcp` sin Bearer HTTP 401 y `WWW-Authenticate` apuntando al recurso protegido canónico.
- [x] Revisar el contrato de privacidad del `ObservationEnvelope`: rechaza patrones de audio/transcripción y claves prohibidas en métricas, y limita cadenas de métricas a 200 caracteres.
- [x] Verificar que la ingesta estructurada limpia patrones conocidos de credenciales en mensaje/detalle y que una prueba unitaria comprueba la exclusión de campos de transcripción en telemetría de Dictado. La suite no se ejecutó en este ciclo.
- [x] Comprobar que la auditoría MCP registra metadatos y no args, tokens, texto, SQL, stack ni excepciones crudas; esto no constituye un sanitizador del payload exitoso devuelto al cliente.

### Hallazgo de privacidad pendiente — no aceptado como seguro todavía

- [!] Reconciliar la exposición de `detalle` y `metrics` por `mcp-observability.ts`: las consultas devuelven esos campos directamente y no filtran por `privacy_class`.
- [!] Revisar la ruta heredada `RegistrarEventoParams`: el campo `metrics` se serializa a la columna sin pasar por `cleanSecretos` ni por `validateObservationPrivacy`; la redacción por patrones cubre mensaje/detalle, no equivale a validar todo contenido posible.
- [!] Verificar si `runtime:read` autoriza deliberadamente una vista global. El filtro `session_id` es opcional y, por sí solo, no prueba aislamiento por sujeto/sesión.
- [ ] Definir el filtro de privacidad/minimización esperado y agregar pruebas que cubran ambas rutas de ingesta, todos los campos retornados por MCP y el aislamiento entre sesiones/sujetos.
- [ ] Ejecutar las pruebas y confirmar el comportamiento con una identidad real de solo lectura, sin consultar ni exportar contenido sensible.

**Límite de evidencia:** los GET públicos solo verifican metadatos y el rechazo sin credencial. No se ejecutó OAuth real, `tools/list` autenticado, invocación de herramientas, query a Neon ni verificación del rol efectivo de la base de datos.

**Cierre:** catálogo/contratos leídos de vuelta, permisos positivos y negativos probados con identidad real y al menos una consulta de observabilidad autenticada satisfactoria.

## 3. Custodia — contrato de lectura MCP

**Estado:** pendiente de reconciliación; no existe una tarea independiente numerada en el índice.  
**Referencia:** OCP y rama histórica `work/mcp-custodia-read-contract-20261031`.

- [ ] Recuperar el contrato y el estado remoto actual de la rama.
- [ ] Confirmar el baseline y determinar si existen cambios funcionales propios; el corte histórico registró que quedó en un baseline de gobierno sin commits funcionales propios.
- [ ] Reconstruir el alcance de las tres herramientas read-only de Custodia y sus contratos.
- [ ] Validar scopes, límites por recurso y denegación ante sujetos no autorizados.
- [ ] Implementar/ejecutar pruebas de contrato y lectura con datos no sensibles.
- [ ] Integrar únicamente dentro del host MCP único, sin almacén ni endpoint autoritativo paralelo.
- [ ] Preservar Custodia B2 y sus ramas; cualquier cambio cruzado requiere coordinación.

**Clasificación pendiente:** decidir si este bloque se integra en TASK-002 o continúa como subbloque sin ID hasta que su alcance quede confirmado. No asignar un ID local nuevo sin instrucción.

## 4. TASK-003 — Jules: puente local OAuth y RDC

**Estado:** `en_curso`  
**Núcleo:** [TASK-003 — Jules](./📁%20🧭%20-%20Tareas%20provisionales/📁%20🧩%20-%20KHORA-MCP-TASK-003%20-%20Jules%20-%20puente%20local%20OAuth%20y%20RDC/README.md)  
**Autoridad arquitectónica:** corresponsable modular Jules; coordinar con ella cambios internos, de contrato, scopes, ACL, pruebas y aceptación.

- [x] Verificar que existe una rama remota de modularización Jules y que su clon local corresponde exactamente a su HEAD.
- [x] Identificar los artefactos añadidos en la rama: `mcp-jules.ts`, contexto/registro modular y documento del módulo.
- [x] Detectar la divergencia respecto de `main` actual: 27 ahead / 32 behind; preservar rama y no integrarla a ciegas.
- [ ] Comparar la rama Jules con el OCP/control actuales y preparar un plan de reconciliación coordinado.
- [ ] Completar pruebas locales del puente con dependencias instaladas y sin sustituir resultados históricos por resultados actuales.
- [ ] Verificar cliente `stdio`, callback loopback, OAuth 2.1 Authorization Code + PKCE y registro dinámico.
- [ ] Obtener consentimiento OAuth explícito del propietario en la interfaz oficial.
- [ ] Aprovisionar DPAPI CurrentUser en el SID vigente y comprobar escritura, descifrado, ACL y lectura de vuelta.
- [ ] Confirmar que el access token vive solo en memoria y que `JULES_API_KEY` permanece exclusivamente en Production.
- [ ] Descubrir las siete herramientas con `tools/list` y sus scopes efectivos.
- [ ] Ejecutar lecturas autenticadas reales de fuentes, sesiones y actividades.
- [ ] Verificar denegaciones y comportamiento fail-closed.
- [ ] Verificar elegibilidad del espacio ChatGPT para escritura y documentar el cliente realmente utilizado.
- [ ] Diseñar una prueba de escritura limitada solo tras autorización específica del operador.
- [ ] Conservar explícitamente el riesgo residual T22: el doble preflight no elimina la carrera entre comprobación y aprobación remota del plan.

**Cierre:** consentimiento real, DPAPI verificado en el perfil vigente, siete herramientas descubiertas, lecturas auténticas y límites de escritura aceptados. Crear sesiones, enviar mensajes o aprobar planes no forma parte del smoke test de lectura.

## 5. Cierre transversal y aceptación del frente

- [ ] Obtener CI con pasos realmente ejecutados; jobs con `steps=[]` no son evidencia de tests.
- [ ] Revalidar dependencias y advisories registrados históricamente antes de declarar auditoría completa.
- [ ] Confirmar que `main` contiene exactamente el código aceptado.
- [ ] Conciliar migraciones, privilegios y controles de acceso con el estado efectivo de Production.
- [ ] Verificar concordancia OAuth ↔ scopes ↔ `tools/list` ↔ handlers.
- [ ] Ejecutar suite automatizada y contratos con evidencia de ejecución real.
- [ ] Ejecutar aceptación end-to-end de lectura y escritura mediante un cliente elegible y autorizado.
- [ ] Verificar saneamiento, privacidad, denegaciones y no-reintento de operaciones no idempotentes ambiguas.
- [ ] Documentar SHA, entorno, URL, identidad, scopes, pruebas, límites y resultado.
- [ ] Actualizar OCP, índice y núcleos de tarea con el estado final y evidencia leída de vuelta.

## 6. Decisiones de alcance y consistencia documental

- [ ] Reconciliar la redirección estratégica del control —OCP MCP local-only y cambios de retirada de Jules de Cora— con el alcance operativo del OCP padre. No interpretar esta nota como autorización para producción.
- [ ] Resolver la clasificación de Custodia sin crear tareas paralelas ni IDs improvisados.
- [ ] Corregir las referencias de generación obsoletas de TASK-002 y TASK-003: sus encabezados todavía citan generación 5; el control vigente es generación 9.
- [ ] Mantener una sola identidad de frente, un OCP y un control; Jules y General siguen siendo partes del mismo KHORA-MCP.
- [ ] Mantener FOL1 PREPARADO, NO ACTIVO; no asignar folio global ni de sesión.

---

## Registro de ciclos

### Ciclo de trabajo 1 — restauración y verificación estática · 2026-11-01

**Ejecutado y verificado:** dispositivo/perfil RDC, MinGit preexistente, clon nuevo de `main`, igualdad exacta HEAD/origin, árbol limpio, sintaxis Node del puente, parseo PowerShell y exclusión/ausencia de `.khora-local`. Se preservó la rama Jules divergente sin reescritura.

**No ejecutado:** instalación de dependencias, suite completa, typecheck, UI Review, contrato y build del checkout nuevo. La política de seguridad que bloqueó npm ci en el corte anterior sigue siendo una compuerta; no fue eludida.

**Resultado del ciclo:** continuidad documental y checkout principal restablecidos; TASK-001 permanece `en_curso` hasta pruebas completas. El siguiente paso es resolver la instalación de dependencias por una vía permitida o documentar su bloqueo definitivo, y en paralelo auditar los contratos/estado efectivo de General sin usar credenciales ni efectuar escrituras.

### Ciclo de trabajo 2 — auditoría estática y metadata pública · 2026-11-01

**Ejecutado y verificado:** lectura estática de los contratos de scopes, autenticación, revocación, `tools/list`, consultas de runtime y flujo de privacidad de eventos; tres GET públicos de Production con resultados 200/200/401; evidencia de redacción de patrones conocidos y prueba existente para telemetría de Dictado.

**Hallazgo:** la consulta MCP devuelve `detalle` y `metrics` sin filtro visible por `privacy_class`; el camino heredado de ingesta puede guardar `metrics` sin la validación de privacidad del envelope estructurado. El filtro por `session_id` es opcional. Se registra como riesgo por revisar, no como vulnerabilidad explotable demostrada. No se cambió código ni se consultó la base de datos.

**No ejecutado:** OAuth autenticado, descubrimiento real de herramientas, consultas a Neon, pruebas automatizadas, rol efectivo DB, aislamiento real por sujeto y lectura real de observabilidad.

**Resultado del ciclo:** baseline General parcialmente inspeccionado; su aceptación sigue pendiente y se añade una compuerta explícita de privacidad/sesión antes de declarar seguro el acceso a runtime. No se modificó Production, secretos, base de datos ni ramas.

### Ciclo de trabajo 3 — sincronización del checkout y artefactos locales · 2026-11-01

**Ejecutado y verificado:** checkout principal limpio antes de sincronizar; `git fetch origin main` y fast-forward no forzado `16b84131e4a61dfaca618570e4c241597fa38cf8 → 22c6a7c8ec83d6e705d8dce747f9c4ba43972b63`; read-back confirmó `HEAD = origin/main`, rama `main` y árbol limpio. Se comprobó que `.env.local`, `.vercel`, `khora-web/node_modules` y `.khora-local` no existen en el checkout; `.env.local`, `.vercel` y `node_modules` están ignorados y la ruta DPAPI dentro de `.khora-local/` está cubierta por la regla raíz. No se leyó contenido secreto ni se copió ningún artefacto.

**No ejecutado:** instalación de dependencias, suite, typecheck, UI Review, contrato o build. La compuerta previa de npm permanece sin cambio causal.

**Resultado del ciclo:** la continuidad del checkout queda sincronizada y su higiene local verificada. TASK-001 sigue `en_curso` por la instalación/pruebas pendientes.

### Ciclo de trabajo 4 — dependencias, validación completa y cierre TASK-001 · 2026-11-01

**Entorno:** RDC `015RENTA01`, perfil `C:\Users\PC`, checkout `C:\Users\PC\Desktop\Khora\khora-mcp-main`, rama `main`. El conjunto de pruebas/build se ejecutó sobre el commit `a9bed89b3bb0c48291b836348e2d264f11ece5f8`, igual a `origin/main` en ese corte.

**Dependencias y herramientas:** Node `v24.22.2`, npm `11.19.1`, MinGit `2.56.0.windows.4`; lockfile v3 con 690 entradas y siete paquetes con install scripts. El paquete completo quedó materializado y `npm ls --depth=0 --omit=optional` terminó con exit 0. `npm ci --no-audit --no-fund` se reportó como exit 1 por el wrapper PowerShell al convertir una advertencia npm deprecada de stderr en error; no se oculta ni se etiqueta esa invocación como exit 0.

**Pruebas:** `typecheck`, `ui-review:check`, `ui:contract`: PASS, exit 0. `test:unit`: **572/572 PASS**, cero fallos/omitidos, exit 0. El test de sincronización del contrato Metodología pasó con GitHub CLI portable `2.103.3`, instalada bajo LOCALAPPDATA, usada sin autenticación ni cambio permanente de PATH.

**Build:** `npm run build`: PASS, exit 0; Next.js `16.4.0`; TypeScript OK; **78/78** páginas generadas; trazas y optimización completadas. Warnings no bloqueantes: convención `middleware` deprecada (migración recomendada a `proxy`) y referencias a APIs incompatibles con Edge Runtime en dependencias.

**Higiene/seguridad:** `.env*`, `.vercel` y `.khora-local` ausentes; dependencias y build ignorados por Git. El preflight de almacenamiento fue `not_requested`; no hubo consulta ni escritura a DB. `AUTH_SECRET` fue aleatorio, efímero y retirado del entorno al finalizar. Se produjo localmente el ZIP de Harmonia `0.3.5` (221,728 bytes; SHA-256 `5B0060C3B1C56CE5713A05FE732CD01417463D8E7E0BDEF70ED5C5D416A418B4`) y fue retirado después de verificar que no estaba versionado.

**Resultado:** el criterio de TASK-001 se satisface y la tarea se marca `completada` en su núcleo y en el índice. El OCP se elevó a v0.3.12 (§28). No se realizó consentimiento OAuth, DPAPI real, llamada Jules autenticada, escritura Jules, migración, grant, merge funcional ni despliegue. TASK-002 y TASK-003 permanecen abiertas.

## Límites permanentes

- No descargar, copiar, imprimir ni introducir secretos de Production en el host local o Preview.
- No extraer cookies, sesiones de navegador ni Bearers manuales.
- No ejecutar creación de sesiones Jules, envío de mensajes o aprobación de planes sin autorización específica del operador.
- No aplicar migraciones, conceder ACL, desplegar, fusionar ramas o alterar Production por inferencia.
- No reescribir ni fusionar la rama Jules divergente sin coordinar con su responsable arquitectónico.
- Toda actualización de este documento debe conservar la procedencia, registrar estado observado y realizar lectura de vuelta del archivo actualizado.

### Ciclo de trabajo 2 — reconciliación y E2E · 2026-11-01

**RDC:** `015RENTA01`, Device ID `aacf2eb5-17f4-428e-9242-c24a1fe4a2ec`; entorno de sesión renovado, sin asumir persistencia volátil. Se verificó el checkout Jules en `c5f56d070e0a5f4cb0956f5f2ee6094e18a05f73`.

**UI Quality:** 15/20 PASS y 5 FAIL en tres specs Playwright/Chromium. Los cinco fallos quedan abiertos: checkpoint de reanudación de dictado; expectativa obsoleta de error shell en `/grafo`; fixture de grafo no interceptado en desktop y mobile; splash desktop no desaparece dentro del umbral del test de tema. No se atribuyen al módulo Jules sin evidencia adicional.

**Reconciliación Git:** `main` avanzó a `0c8fa8ae96fe0b022262770ed67d1bdb1a209aca`; control generación 9 y OCP actualizado. Se inició merge local de `FETCH_HEAD` sobre la rama Jules; conflicto único del índice provisional resuelto restaurando primero el blob exacto de `main` (`80453d7f4f0edeb3d1369926193d55fcd989a36b`). Merge aún no comprometido ni publicado al registrar este ciclo. No se modificaron control ni OCP canónicos manualmente.

**Pendiente:** completar constancia de reconciliación, validar JSON/manifiestos, `git diff --check`, confirmar ausencia de conflictos y commit de merge; después push con lectura de vuelta. Mantener PR #349 abierta y draft hasta aceptación de CI y compuertas humanas. No desplegar Production.