# Observabilidad MCP y acciones autorizadas de Jules — Khora

## 1. Identidad y control
- Frente único: **Observabilidad MCP**; identidad canónica `OBSERVABILIDAD-MCP`.
- Repositorio: `SeryMente/khora`; OCP: `docs/frentes/observabilidad-mcp/OBJETO-CANONICO.md`.
- OCP: **v0.3.0**. Control: generación 3, titular operativo conservado del control anterior.
- Las tareas provisionales «General» y «Jules» pertenecen a este mismo frente; no crean OCP, frente ni control paralelos.
- `MCP-OBS-DICTADO` permanece como identidad histórica del objeto agregado anterior, no como otro frente activo.

## 2. LEER PRIMERO
Leer README, DUG vigente, este OCP y `CONTROL-RESPONSABILIDAD.json`. La titularidad y alcance se determinan exclusivamente por el control vigente y sus autorizaciones expresas. No heredar autoridad de Dictado, Custodia ni otros frentes.

**Propósito original del operador (verbatim):**

> Lo que vamos a hacer es asegurarnos que el MSP de Cora permita que cualquier modelo que tenga acceso al MSP pueda acceder a los registros de observabilidad para un esfuerzo específico. Por ejemplo, yo lo que quería hacer era resolver algunas cuestiones que tienen que ver con el proceso de dictado, pero no lo voy a hacer sino hasta que tengas acceso al MSP y que a su vez el MSP te permita tener los registros de eventos con el nivel de riqueza suficiente para que tengas ojos sobre la situación y puedas determinar la solución más adecuada. Entonces, esto supone algunas tareas generales en cuanto a la función de observabilidad del MSP y específicas en cuanto al propósito de desarrollo concreto, que en este caso es resolver el bug de dictado. No sé si lo tengas ya descrito o si lo tenga que volver a describir.

**Procedencia:** conversación «DICTADO», adjunto `turn0file0`, registro inicial 2026-10-28 16:11:37, 41.447 bytes, SHA-256 `04390ddfd6b347cd7cc8afb31bde7aed7016055cac6cb1eb6fad74c0917c43c2`. La forma «MSP» se conserva literalmente.

**Interpretación operativa separada:** el repositorio denomina MCP al servidor/protocolo y herramientas de Khora; «MSP» se conserva en la cita original. El frente cubre el acceso de modelos/agentes autorizados a observabilidad y la integración controlada con Jules.

## 3. Referencia metodológica
- DUG consultado en `SeryMente/metodologia/main`: **v369 · NX-369m**; HTML canónico SHA `ea1eefd62a092079fa2cfdfa546cb739b63450eb`; último commit de `main` verificado `be621a72f653f5b908c500fd5ec3aedfae3effd4` (`2026-10-30T22:36:34Z`).
- Metacanon **1.26**; GOW **2.14**.
- CNP vigente (categoría A): P001, P004, P005, P038 y P043; consideración explícita en cada turno. MCP normativo: DESACTIVADO.
- Fuente normativa: `SeryMente/metodologia/main/gobernanza/METAPROMPT-CANONICO-SAMANTHA.html`.
- MCP-NORMATIVO: **DESACTIVADO**. No debe confundirse con el servidor MCP de producto Khora.
- Ante cambios transversales, prevalece Metodología; las propuestas no son canónicas hasta incorporarse a su repositorio.

## 4. Propósito y alcance

**Propósito:** proporcionar un único servidor MCP de Khora para que clientes compatibles y autorizados consulten observabilidad y ejecuten acciones acotadas sobre Jules, con identidad, scopes, permisos por recurso, privacidad, trazabilidad y controles fail-closed.

### 4.1 Observabilidad — tarea provisional «General»
Incluye endpoint `/api/mcp`, catálogo/contratos, OAuth/Bearer, scopes y gates; consultas de runtime/eventos con filtros, cursores, paginación, aislamiento por sesión y saneamiento; interoperabilidad de clientes y pruebas. El caso inicial de consumo es el diagnóstico de Dictado, sin asumir autoridad para modificar su UX o sus datos.

### 4.2 Integración Jules — tarea provisional «Jules»
La implementación de esta intervención expone siete herramientas:
1. `jules_list_sources`
2. `jules_list_sessions`
3. `jules_get_session`
4. `jules_list_activities`
5. `jules_create_session`
6. `jules_send_message`
7. `jules_approve_plan`

Las cuatro primeras herramientas requieren jules:read; las tres últimas requieren jules:write. Las siete herramientas Jules usan sus scopes propios y NO requieren norm:turn; el gate norm:turn permanece para las herramientas normativas de Khora. tools/list publica cada acción según el scope autenticado.

Propietario/desarrollador único: el sujeto autenticado debe coincidir, sin distinguir mayúsculas/minúsculas, con MCP_ALLOWED_EMAIL. Este propietario puede consultar y operar todas las fuentes y ramas que la cuenta conectada mediante JULES_API_KEY exponga en Jules, sin filas ACL ni altas manuales por repositorio. El servidor sigue validando contra Jules la existencia de la fuente, la rama y el contexto de cada sesión. Esta excepción no concede permisos adicionales en Google Jules ni en GitHub.

Cualquier otro sujeto permanece sujeto a la combinación exacta subject + source + branch + capability, mediante khora_private.jules_source_acl; ACL fail-closed, sin permisos implícitos ni concesión global. khora_lector solo recibe USAGE del esquema y SELECT de la tabla, no permisos DML. Las filas de otros sujetos requieren identidad, recurso y autorización comprobados.

La creación de sesión exige aprobación de plan y usa `AUTO_CREATE_PR`. La aprobación exige `plan_id` y `plan_sha256`, y relee sesión/actividades antes de actuar. Jules no ofrece una aprobación condicional atómica que elimine completamente la carrera entre comprobación y aprobación; el residual T22 queda documentado. No se oculta ni se presenta como garantía transaccional.

### 4.3 ChatGPT web — requisito de plataforma
La conexión MCP personalizada desde ChatGPT web, con compatibilidad completa y acciones de escritura/modificación, requiere un espacio ChatGPT Business o Enterprise/Edu. La documentación oficial consultada el 2026-10-30 confirma estos planes; no se ha comprobado el plan ni los permisos de esta cuenta: https://help.openai.com/en/articles/12584461-connecting-custom-mcp-servers-in-chatgpt.

Khora no puede cambiar ni eludir el plan, RBAC o los permisos de ChatGPT. La disponibilidad de un endpoint MCP y un build Vercel READY no prueban que el conector pueda instalarse ni que ChatGPT ejecute acciones de escritura.

### 4.4 Entorno y uso con RDC
RDC puede operar en un equipo autorizado y ejecutar un cliente local que hable MCP cuando dicho cliente esté instalado y autenticado. La superficie de Desktop Commander efectivamente conectada en esta sesión expone terminal, archivos y procesos; no expone captura de pantalla ni interacción con la interfaz del navegador. Por ello, esta conexión no permite afirmar que se inspeccionó o configuró visualmente ChatGPT. Esto permite preparar un cliente local como vía operativa separada cuando exista; no modifica permisos de la cuenta, no convierte el cliente local en integración nativa de ChatGPT y no autoriza extraer cookies, tokens de sesión ni secretos del navegador.

La verificación de B debe distinguir:
- **Integración nativa ChatGPT:** solo se acepta si la interfaz y el plan de la cuenta permiten agregar y ejecutar este servidor MCP con los permisos requeridos.
- **Cliente MCP local operado mediante RDC:** alternativa legítima para invocar Khora desde un cliente compatible instalado/autorizado en el equipo; no equivale a que ChatGPT Free tenga herramientas MCP nativas.
- **Handoff manual ChatGPT ↔ cliente local:** viable como asistencia humana, pero no se etiqueta como integración ni ejecución autónoma de ChatGPT.

### 4.5 Exclusiones
No incluye la pantalla/micrófono, transcripción o reparación UX de Dictado; cambios al frente/ACL/datos de Custodia; creación de un segundo almacén autoritativo; exposición de audio, transcripciones, secretos o payloads sensibles; permisos globales; administración general de Jules; cambios de credenciales no aprobados; ni escrituras de base de datos fuera de la migración ACL y sus concesiones expresamente autorizadas.

## 5. Roles y colaboración
- Operador: propietario del propósito y de las autorizaciones de alcance.
- Titular operativo: el que consta en `CONTROL-RESPONSABILIDAD.json`, sujeto a su generación y vigencia; esta intervención continúa la misma titularidad, no crea otro titular.
- «General» y «Jules»: tareas provisionales dentro de este mismo frente.
- Dictado, Custodia y Harmonia: consumidores o frentes relacionados, nunca subordinados por esta definición.

## 6. Autoridad y autorización
La intervención inicial C044 solo creó el OCP sin titularidad. La generación 2 del control autorizó únicamente las tres herramientas read-only de Custodia y excluyó merge/despliegue/escrituras. Esa autorización histórica no se extiende retroactivamente.

El operador amplió expresamente el alcance en esta conversación el **2026-10-30**: autorizó incorporar Jules, herramientas de escritura, la migración ACL productiva y la publicación posterior, manteniendo separados los permisos de lectura y escritura. La autorización se materializa en la generación 3 del control. La migración aplicada se limita a crear la ACL y conceder `USAGE`/ `SELECT` a `khora_lector`; no inserta autorizaciones de fuentes.

La publicación de código queda sujeta a pruebas y a los pasos de integración descritos en el control. Esta autorización no permite eludir permisos de plataforma, usar credenciales de usuario fuera de su propósito, conceder ACL sin fuente/identidad confirmadas ni tocar datos ajenos a Jules.

## 7. Perfil de entorno verificado
- Repositorio: `SeryMente/khora`; base de trabajo: `main` verificado antes de crear la rama de intervención.
- Rama de implementación: `feat/mcp-jules-clean-main-20261030-r1`.
- Servidor MCP: `khora-web/app/api/mcp/route.ts`; contrato normativo: `khora-web/docs/normative-check.md`.
- Cliente Jules: `khora-web/lib/jules/client.ts`; control ACL: `khora-web/lib/server/jules-access.ts`.
- Proyecto Neon: `khora`; base `neondb`, PostgreSQL 17; rama `main`.
- `KHORA_READONLY_DATABASE_URL` y `JULES_API_KEY` constan como variables sensibles de Production en Vercel; sus valores no se leen ni se exponen.
- `khora_private.jules_source_acl` existe en Neon Production. La lectura de tabla con rol `khora_lector` fue comprobada; la tabla está vacía. No se ha verificado todavía que la URL secreta de Vercel se conecte efectivamente como ese rol.
- Vercel Preview `dpl_2EWpm1hwXRQhqM1kYDBWGr18YNfW` permanece READY para el SHA de código anterior `2452d8c8498eeb0338e4efaed9d13eef70fb7f84`. La rama avanzó después con cambios de código y documentación hasta `fd266c6d818902eaa120d1b5afd3592e80bcb51c`; ese corte de código no está desplegado en Preview. El build local del corte sí terminó correctamente; no se hizo despliegue a Preview ni Production. Los endpoints MCP/OAuth de Preview habían devuelto 503 por configuración OAuth ausente en Preview; no se duplicaron secretos.
- La URL Production existente responde en metadata OAuth, pero sigue sirviendo el código previo a la integración Jules mientras la rama no se integre.
- En el head anterior se verificó que los jobs CI/UI Quality fallaban sin runner (`runner_id=0`, `runner_name` vacío). En el head `fd266c6`, seis jobs de CI/UI Quality/khora-ok terminaron `failure` y el detalle de cada job devuelve `steps=[]`; no hay evidencia de ejecución de pruebas remotas. La suite local sí fue ejecutada y está documentada en §15. No reintentar Actions sin cambio causal de infraestructura.

## 8. Seguridad y privacidad
- Scopes de lectura y escritura separados (jules:read / jules:write); las herramientas Jules no requieren norm:turn.
- Propietario autenticado MCP_ALLOWED_EMAIL: todas las fuentes/ramas disponibles en su cuenta Jules; ningún grant manual por repositorio.
- ACL por subject/source/branch/capacidad para cualquier sujeto adicional; ausencia de grant implica denegación.
- Herramientas de escritura no deben anunciarse a clientes sin los scopes necesarios.
- No registrar ni devolver API keys, OAuth secrets, refresh tokens, cookies o payloads privados.
- Operaciones Jules POST no idempotentes no se reintentan automáticamente ante resultado ambiguo.
- La aprobación de plan conserva el riesgo residual T22 documentado.
- Las pruebas deben verificar rechazo sin ACL, lectura autorizada, denegación de escritura sin `jules:write` y exposición mínima en `tools/list`.

## 9. Aceptación
El frente solo se considera aceptado cuando:
1. El código de `main` coincide con el SHA de la implementación aprobada.
2. Migración y privilegios ACL se verifican en la base productiva; `KHORA_READONLY_DATABASE_URL` conecta como rol mínimo esperado.
3. Subject OAuth, fuentes Jules y ramas reales se identifican sin adivinar, y los grants aprobados se insertan y leen de vuelta.
4. OAuth metadata, scopes, `tools/list` y handlers concuerdan en Production.
5. Suite automatizada y tests de contrato pasan; CI incluye evidencia de ejecución real.
6. La cuenta ChatGPT/espacio de trabajo permite conexión MCP personalizada con escritura; la aplicación se registra por OAuth y tools/list descubre las siete herramientas Jules.
7. Un cliente MCP compatible ejecuta lectura y escritura en la cuenta Jules configurada y verifica los límites/denegaciones.
8. Se documenta el cliente efectivamente usado: ChatGPT web nativo, o alternativa local/API claramente diferenciada.
8. Se verifica saneamiento de datos y se conserva el residual T22.

Estado actual: **IMPLEMENTACIÓN Y BUILD DE PREVIEW VERIFICADOS; CAMBIO DE ACCESO DEL PROPIETARIO INCORPORADO A LA RAMA; ACEPTACIÓN CHATGPT/JULES END-TO-END PENDIENTE**. El build de Preview no sustituye la conexión OAuth real desde ChatGPT ni una llamada real a Jules.

## 10. Formato de ciclo
Registrar titularidad/generación, DUG/Metacanon/GOW, SHA base y resultado, diferencia de rama, migración/read-back, tests, entorno y URL, identidad/scopes, aceptación, límites y siguiente acción. Distinguir propuesto, autorizado, intentado, ejecutado, verificado y aceptado.

## 11. Crónica
### C001 — creación documental — 2026-10-30
Se separó del OCP Dictado el objetivo de acceso MCP a registros. Se conserva el propósito original y su procedencia. C044 creó el OCP con control inicial sin titular; no se modificó producto en ese acto.

### C002 — titularidad y observabilidad inicial — 2026-10-30
Se adjudicó el control de generación 2 para tres herramientas Custodia de solo lectura y scopes especializados, con exclusión de merge y producción. Esta autorización quedó acotada y no autoriza por sí misma el trabajo Jules posterior.

### C003 — ampliación Jules y ACL — 2026-10-30
El operador autorizó ampliar el mismo frente para integrar siete herramientas Jules con scopes separados, ACL por subject/source/branch y posterior publicación. Se creó y probó la migración sobre una rama temporal Neon; el primer ensayo se canceló y eliminó. La versión ajustada se aplicó a Neon `main`: tabla ACL creada, solo `khora_lector` obtuvo `USAGE` y `SELECT`, read-back como ese rol correcto, 0 filas. No se han concedido grants de fuentes/ramas.

### C004 — autenticación, clon y validación local — 2026-10-30
Se autenticó GitHub CLI mediante el flujo interactivo del dispositivo PC-14 como `1interprete1`, sin exponer el token. Se materializó el clon en `C:\Users\PC 13\Desktop\Khora\khora-main`, directamente en la rama de intervención. La revisión local detectó y corrigió una fuga de segmentos propietario/repositorio en las rutas de observabilidad Jules y tres defectos de aserción de pruebas; también se retiró del README una segunda copia idéntica del índice de documentos canónicos. Todos los cambios se publicaron en la rama de la PR, nunca en `main`. La validación local de las pruebas focalizadas terminó 35/35; la suite unitaria completa 568/568; TypeScript, UI Review y navegación pasaron; `npm run build` terminó con código 0 usando un `AUTH_SECRET` aleatorio efímero de proceso, sin archivo `.env` ni `.env.local`. Next.js generó 78/78 páginas; permanecen warnings de APIs Edge y deprecación de middleware. La CI remota no ejecutó pasos; la PR sigue abierta y no se ha desplegado.
## 12. Reinstanciación
Continuar en el OCP y control únicos `docs/frentes/observabilidad-mcp/`. Leer el control generación vigente, comprobar SHA de `main`, rama/PR, estado de Neon/Vercel y evidencia de aceptación. No crear OCP paralelo para Jules ni asumir grant por defecto. No confundir uso de RDC con integración nativa ChatGPT.

## 13. Persistencia y revisión
Este documento en `main` es el objeto canónico único del frente. El control independiente reside en `CONTROL-RESPONSABILIDAD.json`. Las tareas provisionales General/Jules no tienen autoridad para crear objetos canónicos separados. La metodología general de `SeryMente/metodologia` prevalece en definiciones transversales.

## 14. Primer corte de reinstanciación RDC PC-14 — histórico · 2026-10-30

> Este corte conserva el estado observado inmediatamente tras reiniciar Windows. Sus afirmaciones de ausencia de clon y de autenticación se sustituyeron en la verificación posterior de §15.

- Se reconectó Remote Desktop Commander después de un nuevo inicio de Windows. El dispositivo activo devuelto por el inventario es PC-14, Device ID `308d583f-ac72-430f-91d4-95d22d9f33b9`. El ID `47d52d2e-1a6a-4f71-ba5d-baf8b660a88f` del handoff está Offline y no se usó.
- Perfil Windows inspeccionado: `C:\Users\PC 13`; las raíces de proyecto esperadas en el Escritorio no existen todavía. No se presupone persistencia del clon anterior.
- Node.js v26.13.0, Git 2.56.0 y GitHub CLI 2.103.3 están instalados. `gh auth status` devuelve que no hay sesión GitHub autenticada; no se extrajeron credenciales del navegador ni se inició login interactivo.
- El conector GitHub conserva acceso al repositorio: PR #345 sigue abierto, mergeable, head `2452d8c8498eeb0338e4efaed9d13eef70fb7f84`, base `8f9b98b61d58aa5c1dd1afee0c128c7ed4592ff7`; la rama está 7 commits ahead y 0 behind. No se ha mergeado ni desplegado a Production.
- Preview Vercel `dpl_2EWpm1hwXRQhqM1kYDBWGr18YNfW` permanece READY para el head anterior indicado.
- CI y UI Quality no llegaron a ejecutar pasos: los jobs terminan casi inmediatamente con `runner_id=0`, `runner_name=""`, `steps=[]`. El fallo no representa un resultado de tests; indica que no se asignó runner. No repetir reintentos sin cambio causal.
- Neon Production mantiene `khora_private.jules_source_acl`; lectura de privilegios en esta sesión confirma `khora_lector` con USAGE+SELECT y sin INSERT/UPDATE/DELETE. La tabla sigue sin concesiones.
- Bloqueos actuales: autenticación GitHub CLI local para clonar y ejecutar pruebas en este Windows; runner GitHub Actions no asignado; ausencia de identidad/fuente/rama Jules verificadas para un grant. La rama/PR usa el conector GitHub hasta resolver la CLI. No crear permisos globales ni tratar RDC como integración nativa de ChatGPT.
- Se actualizó la referencia metodológica de este OCP a DUG v366 / NX-366m, Metacanon 1.26 y GOW 2.13. La fuente normativa sigue siendo `SeryMente/metodologia/main`.

**Cierre de reinstanciación:** conexión RDC nueva identificada y verificada; clones locales ausentes, autenticación CLI ausente y no se afirma ejecución local de tests. La continuidad de código permanece recuperable desde la rama y PR persistentes.
## 15. Estado vivo — PC-14 autenticado y validado — 2026-10-30

- **Dispositivo:** PC-14 Online, Device ID `308d583f-ac72-430f-91d4-95d22d9f33b9`. El ID previo `47d52d2e-1a6a-4f71-ba5d-baf8b660a88f` sigue sin ser el dispositivo activo.
- **GitHub CLI:** autenticación interactiva verificada como `1interprete1`, HTTPS, scopes reportados `gist`, `read:org`, `repo`. No se extrajo ni se compartió el token.
- **Clon:** `C:\Users\PC 13\Desktop\Khora\khora-main`; rama `feat/mcp-jules-clean-main-20261030-r1`; working tree limpio; `git diff --check` limpio.
- **Estado Git en el corte de código:** head `fd266c6d818902eaa120d1b5afd3592e80bcb51c`; comparación con la base verificada `8f9b98b61d58aa5c1dd1afee0c128c7ed4592ff7`: **11 commits ahead, 0 behind**. `main` no fue modificado.
- **Toolchain:** Node.js v26.13.0, Git 2.56.0, GitHub CLI 2.103.3, npm 11.20.0. El binario local FFmpeg 6.1.1 existe en `node_modules`; dependencias locales no se incorporan al repositorio.
- **Pruebas focalizadas:** Jules retry, concordancia MCP/Jules y metadata OAuth/UI: **35/35 pass**.
- **Suite unitaria completa:** `npm run test:unit`, **568/568 pass**, 0 fail, 0 skipped.
- **Validaciones:** `npm run typecheck`, `npm run ui-review:check` y `npm run ui:contract` terminaron con código 0.
- **Build:** `npm run build` terminó con código 0. El build requirió un `AUTH_SECRET` aleatorio y efímero definido solo en el proceso local; el proceso lo eliminó al finalizar. No existe `.env` ni `.env.local`, y la verificación posterior del entorno no encontró la variable activa. Next.js compiló, pasó TypeScript, generó **78/78** páginas y terminó la optimización/trazas. Warnings pendientes: convención `middleware` deprecada y APIs de ciertas dependencias no compatibles con Edge Runtime; no bloquearon el build.
- **Cambios correctivos en esta rama:** redacción completa del sufijo de rutas `/sources/...` en observabilidad Jules; aserciones alineadas con `isError` opcional del SDK MCP; normalización CRLF en prueba documental; validación estructural de `sourceContext`; retirada de la segunda copia del bloque «Documentos canónicos» en README. Commits correctivos `348f3776e9854a484aea535ea541e4c1dd1e3245` y `fd266c6d818902eaa120d1b5afd3592e80bcb51c`.
- **GitHub Actions:** en el head `fd266c6`, CI, UI Quality y `khora-ok` terminaron failure; seis jobs sin pasos registrados (`steps=[]`). En el head anterior se constató `runner_id=0` y runner vacío. No se repitieron trabajos sin cambio causal.
- **PR:** [#345](https://github.com/SeryMente/khora/pull/345), abierta, mergeable, no mergeada; base `8f9b98b61d58aa5c1dd1afee0c128c7ed4592ff7`, head de código validado `fd266c6d818902eaa120d1b5afd3592e80bcb51c`.
- **Preview/Production:** Preview existente continúa en SHA anterior `2452d8c8498eeb0338e4efaed9d13eef70fb7f84`; no refleja el corte de código validado. No se hizo nuevo deploy a Preview ni Production.
- **Seguridad/aceptación pendiente:** ACL productiva continúa vacía; no se conoce un subject OAuth Jules, source ni branch reales verificadas; no hay grants ni llamada real a Jules. La conexión de `KHORA_READONLY_DATABASE_URL` con el rol efectivo sigue sin comprobarse. No se revisó visualmente la UI: RDC conectado expone terminal/archivos/procesos, no captura de pantalla ni control de navegador. La revisión visual personal del operador exigida por doble control sigue pendiente.
- **Cierre de estado:** implementación y validación local verificadas; integración CI/identidad Jules, revisión visual del operador, prueba end-to-end, merge y despliegue siguen pendientes. No se declara aceptación.

### C005 — UI local y actualización metodológica — 2026-10-30
Se verificó la fuente canónica actual de Metodología: DUG v368 · NX-368m, Metacanon 1.26 y GOW 2.14. Se leyó §ARR y se revisó el conjunto de 43 principios y sus remisiones; el CNP conserva P001, P004, P005, P038 y P043 con categoría A; MCP normativo continúa DESACTIVADO. El commit más reciente de Metodología `main` es `c90a9f84143089c3c02208fd27b3625f3e9f1e08` (21:47:15Z). Para la revisión de UX/UI se levantó el build local en PC-14, ligado exclusivamente a `127.0.0.1:4173`, con bypass de autenticación limitado a entorno de prueba. `/sistema/mcp` respondió HTTP 200 y renderizó la pantalla real. La interfaz fue abierta en Edge y se capturó una imagen local. Los GET de `/api/mcp/revocacion` y `/api/mcp/manual-token` respondieron 401 por ausencia deliberada de sesión/credenciales locales; no se conectó Neon Production, no se creó/revocó token y la pantalla muestra un error de estado local. La inspección automatizada no sustituye la revisión personal del operador. El servidor local permanece activo para esa revisión.
## 16. Estado vivo — revisión visual local y DUG v368 — 2026-10-30

- **DUG/GOW vigentes:** DUG v368 · NX-368m; Metacanon 1.26; GOW 2.14. HTML canónico SHA `2ba096f565807d7c19df0a9a8cab9e8410110a15`. El último commit de Metodología `main` es `c90a9f84143089c3c02208fd27b3625f3e9f1e08`, fechado `2026-10-30T21:47:15Z`; a las 22:27:52Z su edad era 0.0.40. `main` es la fuente normativa.
- **Adquisición:** §ARR fue leído antes del resto de instrucciones; se revisaron los 43 principios del DUG en su orden publicado y el vocabulario inicial de 26 términos. CNP: P001, P004, P005, P038 y P043 (categoría A). MCP normativo: DESACTIVADO.
- **Servidor de revisión local:** build de la rama servido en `http://127.0.0.1:4173/sistema/mcp`, PID npm `20032`, listener limitado a `127.0.0.1:4173`. `PLAYWRIGHT_TEST_RUN=1` y `KHORA_UI_REVIEW_MODE=1` se establecieron solo en el proceso local. Edge se abrió en esa URL. No existe exposición a red externa por el listener.
- **Render:** HTTP 200; título `Khora`; H1 `Control MCP & Revocación`. La captura automatizada fue guardada en el TEMP del PC-14, `khora-mcp-visual-review-afterwait.png`; captura anterior SHA-256 `4515982540FAFEE086A8C922F3C208284D4AE82E9238A272A16838DC9AB640FD` (tomada antes de esperar hidratación completa).
- **Límite local:** los GET locales `/api/mcp/revocacion` y `/api/mcp/manual-token` devolvieron 401; la página muestra `Error al cargar el estado MCP`. Es consecuencia de no tener una sesión/credenciales locales y no describe el estado Productivo. No se creó ni revocó ningún token; no se hicieron escrituras.
- **Doble control:** el diseño puede inspeccionarse, pero la revisión personal B/C del operador permanece **PENDIENTE**. No se convierte la captura automatizada en aprobación. Edge y el servidor local permanecen abiertos hasta la revisión.
- **Código y despliegue:** head `1959abfef713cef7a85f31fc524aa6be0f65b9fc`; PR #345 sigue abierta/no mergeada. No cambió `main`, no se desplegó Preview/Production.
- **Pendientes terminales:** revisión visual del operador; identificar subject/source/branch Jules; verificar rol efectivo de `KHORA_READONLY_DATABASE_URL`; ejecutar cliente MCP real autorizado y probar lectura/escritura/denegaciones; CI remoto sigue sin ejecutar pasos. ACL productiva sigue vacía.
- **Estado:** pantalla local disponible para inspección humana; no aprobada; implementación validada localmente; aceptación end-to-end pendiente.

## 17. Estado vivo — sincronización con main y corte final de revisión — 2026-10-30

- **Metodología:** DUG v368 · NX-368m; Metacanon 1.26; GOW 2.14. Último commit Metodología `main`: `c90a9f84143089c3c02208fd27b3625f3e9f1e08`, `2026-10-30T21:47:15Z`. A las 22:31:49Z su edad era 0.0.44. MCP normativo DESACTIVADO.
- **Khora main:** último commit `c6860f1501419239b4eef540150f934a5e20f2a3`, `2026-10-30T22:15:39Z`; edad a las 22:31:49Z: 0.0.16. Actualiza únicamente `docs/frentes/harmonia/OBJETO-CANONICO.md` de Harmonia v0.34 a v0.35 y documenta el PC-14 activo; no toca el código ni el OCP Observabilidad MCP.
- **Sincronización de rama:** se integró el único commit nuevo de `main` mediante merge commit de dos padres `d832edae2fb894625fb4924d9a4770a675daab79` (22:31:10Z), padres ordenados: rama anterior `709aa27013b2b9bbbb7ccfd991dd1061fcb724fa` y `main` `c6860f1501419239b4eef540150f934a5e20f2a3`. Tree `6df344199b30ca0519d73fe964ce070a24e6c994`; se cambió solo `docs/frentes/harmonia/OBJETO-CANONICO.md`. La rama vuelve a estar **14 commits ahead / 0 behind** respecto de `main`.
- **Clon local:** `C:\Users\PC 13\Desktop\Khora\khora-main`; HEAD `d832edae2fb894625fb4924d9a4770a675daab79`; rama remota sincronizada; working tree limpio y `git diff --check` limpio. El `FETCH_HEAD` local puede apuntar a la última rama descargada, no interpretarlo como alias permanente de `main`.
- **Código validado:** último head con código funcional probado `fd266c6d818902eaa120d1b5afd3592e80bcb51c`. Los commits posteriores `1959abf`, `709aa27` y `d832eda` son documentales/merge de un documento Harmonia; no alteran archivos de aplicación ni pruebas. Se conserva evidencia: 35/35 focalizadas, 568/568 unitarias, typecheck/UI Review/navegación y build de producción local código 0.
- **Actions:** el merge commit nuevo generó CI, UI Quality y `khora-ok`; seis jobs terminaron failure y cada consulta de pasos devolvió cero pasos (`steps=[]`). No hay ejecución remota acreditada. No reintentar sin corrección causal de infraestructura.
- **Revisión visual local:** Edge abierto en `http://127.0.0.1:4173/sistema/mcp`, servidor PID npm `20032`, listener solo `127.0.0.1:4173`. Captura después de hidratación completa en TEMP PC-14: `khora-mcp-visual-review-afterwait.png`, 90.172 bytes, SHA-256 `B64B6270CEAC8B11BADA6A9602A48E3BB2FADA127BB25A7B668B0CFD1D7908EB`. La ruta renderiza; los GET a endpoints locales de estado reciben 401 por ausencia deliberada de sesión/credenciales local, y la pantalla muestra ese error. No hubo emisión/revocación ni acceso a Neon Production. La presencia personal B/C del operador permanece **PENDIENTE**.
- **PR:** #345 sigue abierta, mergeable, no mergeada; head `d832edae2fb894625fb4924d9a4770a675daab79`, base `c6860f1501419239b4eef540150f934a5e20f2a3`. No se fusionó la PR.
- **Preview/Production:** Preview existente permanece en el SHA anterior `2452d8c8498eeb0338e4efaed9d13eef70fb7f84`; no refleja el head probado ni el merge de sincronización. No se hizo deploy a Preview ni Production.
- **Bloqueos restantes:** revisión visual personal del operador; rol efectivo de `KHORA_READONLY_DATABASE_URL`; identidad OAuth Jules, source y branch reales; grant exacto; prueba de cliente MCP autorizado. ACL Production sigue vacía; no se han ejecutado llamadas reales a Jules.
- **Estado:** base de rama reconciliada, UI local disponible, pruebas locales aprobadas; revisión personal y aceptación end-to-end pendientes. No mergear ni desplegar.


## 18. Simplificación del propietario y despliegue de revisión — 2026-10-30

- Autorización del operador: confirmó ser el único usuario/desarrollador y pidió acceso directo a ámbitos de desarrollo Jules sin altas manuales. La pantalla Control MCP fue aprobada visualmente por el operador el 2026-10-30.
- Política de propietario: MCP_ALLOWED_EMAIL identifica al sujeto autenticado único; este accede a las fuentes y ramas que la cuenta vinculada por JULES_API_KEY devuelve. Se eliminaron para Jules los pasos redundantes de grant individual y norm:turn; continúan obligatorios autenticación, scope de lectura/escritura correcto y comprobaciones de estado, fuente y rama contra el proveedor. Ningún permiso adicional se crea en Google Jules/GitHub. Los sujetos distintos del propietario conservan ACL exacta y fail-closed.
- Código/branch: PR #345, rama feat/mcp-jules-clean-main-20261030-r1, head 79df82884ff5bc4189da6581be0cd00169920e38; base c6860f1501419239b4eef540150f934a5e20f2a3. La PR sigue abierta y sin merge. Los cambios de aplicación y tests fueron incorporados antes del commit documental del OCP/control.
- Build Vercel Preview: deployment dpl_BDuQ2DTFZ8SaydkqeHZFm5qKrNN1, URL https://khora-3iswbayev-victorhugotorresmendez-8991s-projects.vercel.app, READY para commit 0282cd42d9fb7a11d087ebed397c91f131676708. El build remoto compiló Next.js 16.4.0, TypeScript y generó 78/78 páginas. Warnings: convención middleware deprecada y APIs de algunas dependencias no compatibles con Edge Runtime. No es Production y no incluye los últimos cambios documentales posteriores.
- Pruebas: la última suite completa acreditada (568/568) y las 35 pruebas focalizadas son anteriores a esta modificación de propietario. El build remoto verifica compilación y TypeScript, no ejecuta la suite unitaria. La regresión nueva está añadida al test de contrato, pero su ejecución real sigue pendiente.
- Actions: los workflows CI/UI Quality/khora-ok del commit inicial de esta simplificación terminaron sin pasos de runner acreditados; no interpretar esos resultados como pruebas de código.
- Base de datos: migración 033_jules_source_acl y permisos mínimos permanecen; la ACL sigue vacía, deliberadamente, porque el propietario no necesita una fila por fuente. No se concedieron accesos a otros sujetos.
- ChatGPT web: OpenAI documenta la compatibilidad completa MCP personalizada con acciones de escritura para Business y Enterprise/Edu. El plan/permisos efectivos de la cuenta del operador no se han comprobado. Véase §4.3 y la documentación oficial enlazada allí. Sin la habilitación del plan, el servidor por sí solo no permite utilizar acciones de escritura en ChatGPT web.
- Pendiente terminal: confirmar elegibilidad MCP del espacio/cuenta ChatGPT, instalar y autorizar la app OAuth, descubrir tools/list, comprobar lectura real desde Jules y realizar una acción de escritura controlada. No hacer merge ni desplegar Production antes de superar esas comprobaciones y actualizar la evidencia.
