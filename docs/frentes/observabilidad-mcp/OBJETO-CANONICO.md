# Khora MCP — interfaz de capacidades, observabilidad e integración Jules

## 1. Identidad y control
- Frente único vigente: **Khora MCP**; identidad canónica `KHORA-MCP`.
- Nombre e identidad histórica: **Observabilidad MCP** / `OBSERVABILIDAD-MCP`. La ruta heredada `docs/frentes/observabilidad-mcp/` se conserva; no se migra ni duplica el OCP o su control.
- Repositorio: `SeryMente/khora`; OCP único: `docs/frentes/observabilidad-mcp/OBJETO-CANONICO.md`; control único: `docs/frentes/observabilidad-mcp/CONTROL-RESPONSABILIDAD.json`.
- OCP: **v0.3.9**. Control de responsabilidad: **generación 4**, titular operativo `chatgpt-khora-mcp-01a18f79-2078-7501-bc18-5ce14475d245`.
- La plataforma no expuso un identificador nativo de conversación: `owner_thread` permanece `null`. UUIDv7 local de continuidad: `01a18f79-2078-7501-bc18-5ce14475d245`; no es un ID nativo.
- Folio nuevo de conversación: **PENDIENTE / NO ASIGNADO**; FOL1 no ha sido cotejado ni activado. Se conserva el folio anterior en la generación archivada.
- Las tareas provisionales «General» y «Jules» pertenecen a este mismo frente; no crean OCP, frente ni control paralelos.
- `MCP-OBS-DICTADO` permanece como identidad histórica del objeto agregado anterior, no como otro frente activo.

## 2. LEER PRIMERO
Leer README, DUG vigente, este OCP y `CONTROL-RESPONSABILIDAD.json`. La titularidad y alcance se determinan exclusivamente por el control vigente y sus autorizaciones expresas. No heredar autoridad de Dictado, Custodia ni otros frentes.

**Propósito original del operador (verbatim):**

> Lo que vamos a hacer es asegurarnos que el MSP de Cora permita que cualquier modelo que tenga acceso al MSP pueda acceder a los registros de observabilidad para un esfuerzo específico. Por ejemplo, yo lo que quería hacer era resolver algunas cuestiones que tienen que ver con el proceso de dictado, pero no lo voy a hacer sino hasta que tengas acceso al MSP y que a su vez el MSP te permita tener los registros de eventos con el nivel de riqueza suficiente para que tengas ojos sobre la situación y puedas determinar la solución más adecuada. Entonces, esto supone algunas tareas generales en cuanto a la función de observabilidad del MSP y específicas en cuanto al propósito de desarrollo concreto, que en este caso es resolver el bug de dictado. No sé si lo tengas ya descrito o si lo tenga que volver a describir.

**Procedencia:** conversación «DICTADO», adjunto `turn0file0`, registro inicial 2026-10-28 16:11:37, 41.447 bytes, SHA-256 `04390ddfd6b347cd7cc8afb31bde7aed7016055cac6cb1eb6fad74c0917c43c2`. La forma «MSP» se conserva literalmente.

**Interpretación operativa separada:** el repositorio denomina MCP al servidor/protocolo y herramientas de Khora; «MSP» se conserva en la cita original. El frente cubre el acceso de modelos/agentes autorizados a observabilidad y la integración controlada con Jules.

## 3. Referencia metodológica
- DUG consultado en `SeryMente/metodologia/main`: **Samantha v373 · NX-373m**; HTML canónico Blob SHA `cac4525de77d4f47a8a59c25201968ecf2056b90`; commit metodológico más reciente observado `f74082148d28b575c232e8fc291607bef8861794` (`2026-10-31T02:52:13Z`, UTC). Metacanon **1.26**; GOW **2.14**. §ARR releído en esta sesión.
- CNP vigente (categoría A): P001, P004, P005, P038 y P043; consideración explícita en cada turno. MCP normativo: DESACTIVADO.
- Fuente normativa: `SeryMente/metodologia/main/gobernanza/METAPROMPT-CANONICO-SAMANTHA.html`.
- MCP-NORMATIVO: **DESACTIVADO**. No debe confundirse con el servidor MCP de producto Khora.
- Ante cambios transversales, prevalece Metodología; las propuestas no son canónicas hasta incorporarse a su repositorio.

## 4. Propósito y alcance

**Propósito:** administrar la interfaz programática única mediante la cual clientes, modelos y agentes compatibles y autorizados descubren y utilizan las capacidades que Khora ofrece externamente, con identidad, scopes, permisos por recurso, privacidad, trazabilidad y controles fail-closed.

**Alcance funcional vigente (decisión del operador, 2026-10-30):** comprende recursos, herramientas, prompts e instrucciones especializadas, su catálogo y descubrimiento, endpoint/transporte y contratos, conexión e interoperabilidad entre modelos/plataformas/entornos de desarrollo, autenticación/autorización, operación/observabilidad, seguridad y evolución/versionado. La observabilidad y la integración Jules son capacidades dentro de ese frente único, no la totalidad de su alcance.

**Convención terminológica local:** dentro de este frente, «MSP» y «MCP» pueden utilizarse como formas intercambiables para referirse al servidor/protocolo de Khora; la denominación formal del estándar es Model Context Protocol (MCP). Esta convención no crea otro protocolo o servicio.

El alcance funcional deseado no acredita que cada clase de recurso, herramienta o prompt esté ya registrada en producción. La disponibilidad efectiva se establece por descubrimiento del catálogo real (`tools/list` y capacidades correspondientes) y pruebas autorizadas.

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
La conexión MCP personalizada con acciones de escritura/modificación requiere ChatGPT Business o Enterprise/Edu en la web. Pro admite conexión MCP con lectura/obtención, no acciones de escritura. Algunos clientes pueden crear un espacio Business nuevo con una sola licencia de pago (disponibilidad limitada; depende de la opción mostrada en el checkout); si no aparece, se aplica el mínimo estándar de dos licencias. Fuentes oficiales consultadas el 2026-10-30: https://help.openai.com/en/articles/12584461-connecting-custom-mcp-servers-in-chatgpt y https://help.openai.com/en/articles/20001624-chatgpt-business-single-seat-configuration. El plan/espacio de esta cuenta no se ha comprobado.

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
- `khora_private.jules_source_acl` existe en Neon Production. `khora_lector` tiene únicamente `USAGE` + `SELECT`; ACL sin grants de terceros. El usuario propietario no consulta esa ACL. El rol de `KHORA_READONLY_DATABASE_URL` para una eventual identidad adicional no se ha verificado.
- Vercel Preview `dpl_2EWpm1hwXRQhqM1kYDBWGr18YNfW` permanece READY para el SHA de código anterior `2452d8c8498eeb0338e4efaed9d13eef70fb7f84`. La rama avanzó después con cambios de código y documentación hasta `fd266c6d818902eaa120d1b5afd3592e80bcb51c`; ese corte de código no está desplegado en Preview. El build local del corte sí terminó correctamente; no se hizo despliegue a Preview ni Production. Los endpoints MCP/OAuth de Preview habían devuelto 503 por configuración OAuth ausente en Preview; no se duplicaron secretos.
- Production ya sirve el código de integración Jules desde `main`: commit `953e69484eabb4e8dc8221d1d8fc188373531bfa`, deployment READY `dpl_6Ndatsufuk5iLFzvbzHpwNQCh6HB`, alias `https://khora-web.vercel.app`. Los metadatos OAuth y Protected Resource devuelven HTTP 200 y publican `jules:read`/`jules:write`; `/api/mcp` sin Bearer devuelve HTTP 401 con `WWW-Authenticate` de metadata OAuth, como corresponde antes de autenticar.
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
2. Migración y privilegios ACL se verifican en la base productiva; `KHORA_READONLY_DATABASE_URL` está configurada. El rol efectivo se verifica al habilitar sujetos adicionales que consulten ACL; el propietario evita esa consulta.
3. El `sub` OAuth del propietario se coteja con `MCP_ALLOWED_EMAIL`, y la cuenta Jules configurada publica fuentes/ramas reales; grants exactos solo para sujetos adicionales.
4. OAuth metadata, scopes, `tools/list` y handlers concuerdan en Production.
5. Suite automatizada y tests de contrato pasan; CI incluye evidencia de ejecución real.
6. La cuenta ChatGPT/espacio de trabajo permite conexión MCP personalizada con escritura; la aplicación se registra por OAuth y tools/list descubre las siete herramientas Jules.
7. Un cliente MCP compatible ejecuta lectura y escritura en la cuenta Jules configurada y verifica los límites/denegaciones.
8. Se documenta el cliente efectivamente usado: ChatGPT web nativo, o alternativa local/API claramente diferenciada.
9. Se verifica saneamiento de datos y se conserva el residual T22.

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
- Suite unitaria completa: npm run test:unit, 568/568 pass, 0 fail, 0 skipped.
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


## 19. Revalidación del acceso de propietario y configuración de despliegue — 2026-10-30

- **Autorización y alcance:** el operador confirmó que es el único usuario/desarrollador, aprobó visualmente la pantalla Control MCP y solicitó retirar altas manuales por repositorio. La política de propietario se conserva en el control de generación 3.
- **Código:** la rama `feat/mcp-jules-clean-main-20261030-r1` incorpora el sujeto propietario por coincidencia de `MCP_ALLOWED_EMAIL`; el propietario opera todas las fuentes/ramas que la API de la cuenta `JULES_API_KEY` devuelva. Las siete herramientas Jules requieren únicamente `jules:read` o `jules:write`; no `norm:turn`. Las herramientas normativas conservan su gate. Los demás sujetos continúan sujetos a ACL exacta y fail-closed.
- **UI:** los ámbitos `jules:read` y `jules:write` están incluidos por defecto al crear un Bearer manual para el desarrollador.
- **Validación PC-14:** `npm run typecheck` terminó con código 0. Las pruebas focalizadas MCP/Jules/token: **34/34 PASS**. Suite unitaria: **568/568 PASS**, 0 fallos, 0 omitidas, ejecutada sobre 82 archivos de prueba excepto `methodology_contract_sync.test.ts`, que requiere GitHub CLI autenticado y no se ejecutó en este equipo. Esa prueba no se declara aprobada ni fallida.
- **Dependencias:** `npm ci` instaló 576 paquetes y reportó 14 advisories (4 moderate, 9 high, 1 critical). No se ejecutó `npm audit fix` ni se elevaron dependencias; clasificar/remediar esos advisories queda como trabajo separado antes de una auditoría de seguridad completa.
- **Preview:** `dpl_BDuQ2DTFZ8SaydkqeHZFm5qKrNN1` está READY para el corte de aplicación `0282cd42d9fb7a11d087ebed397c91f131676708`; Next.js 16.4.0, TypeScript y 78/78 páginas terminaron correctamente. Ese Preview no tiene las variables MCP/OAuth configuradas y por ello los endpoints de metadata devuelven 503. No se copiaron secretos a Preview.
- **Production — metadatos de configuración:** Vercel confirma variables sensibles con destino `production` para `MCP_OAUTH_CLIENT_ID`, `MCP_OAUTH_CLIENT_SECRET`, `MCP_OAUTH_REDIRECT_URIS`, `MCP_JWT_SECRET`, `MCP_ALLOWED_EMAIL`, `MCP_CANONICAL_URL`, `KHORA_READONLY_DATABASE_URL` y `JULES_API_KEY`. No se descifraron ni leyeron valores. La ruta MCP mantiene su comprobación de presencia de `KHORA_READONLY_DATABASE_URL`; para el propietario el acceso Jules evita la consulta ACL.
- **GitHub Actions:** CI, UI Quality y `khora-ok` para el head `c63daa5d54ae4a2c35ecbaecfc231feab431aa60` terminaron con failure; sus jobs no reportaron pasos de ejecución. No es un resultado de tests ni se repitieron sin corrección causal de runner.
- **ChatGPT web:** la elegibilidad depende del plan/espacio de trabajo. La documentación oficial consultada establece que Pro admite MCP personalizado de lectura/consulta, mientras la escritura/modificación requiere Business o Enterprise/Edu. la configuración Business de una sola licencia está disponible solo para algunos clientes nuevos; cuando no aparece en checkout, rige el mínimo estándar de dos licencias. No se ha inspeccionado el plan efectivo ni la elegibilidad de este operador.
- **Publicación y aceptación:** PR #345 sigue abierta, mergeable y no mergeada. `main` no se modificó; Production no se desplegó. No hubo autorización OAuth real desde ChatGPT ni llamadas reales a Jules. Antes de declarar completada la integración nativa se requiere conectar el cliente real y verificar lectura y una escritura controlada; la cuenta debe permitir MCP de escritura.

## 20. Integración publicada en Production y smoke test OAuth — 2026-10-30

- **Merge:** PR #345 se integró correctamente en `main` mediante squash, commit firmado `953e69484eabb4e8dc8221d1d8fc188373531bfa` (`2026-10-30T23:20:56Z`). La rama principal ahora contiene el acceso del propietario, las siete herramientas Jules, UI de scopes por defecto, pruebas y OCP v0.3.2. Control de responsabilidad generación 3.
- **Production Vercel:** deployment `dpl_6Ndatsufuk5iLFzvbzHpwNQCh6HB`, target `production`, state **READY**, SHA exacto `953e69484eabb4e8dc8221d1d8fc188373531bfa`; alias canónico `https://khora-web.vercel.app`. Build completado en aproximadamente 2 minutos; Next.js 16.4.0 generó las rutas y publicó `/sistema/mcp` y las rutas OAuth. La fase configurada de build ejecutó `scripts/migrate-runtime.mjs` y registró la aplicación de migraciones runtime/OAuth 023–029. La migración Jules 033 ya constaba aplicada y leída de vuelta en Neon antes de este despliegue.
- **Smoke test remoto (PC-14, sin credenciales):** `/.well-known/oauth-authorization-server` HTTP 200; `/.well-known/oauth-protected-resource` HTTP 200; ambos publican `jules:read` y `jules:write`, con issuer/resource canónicos `https://khora-web.vercel.app`. `GET /api/mcp` sin Authorization devuelve HTTP 401 y `WWW-Authenticate` apunta al Protected Resource metadata: rechazo de autenticación esperado, no `MCP_CONFIG_MISSING`.
- **Secretos:** las variables sensibles requeridas permanecen definidas con destino Production. No se descifraron ni leyeron valores durante esta intervención.
- **Base de datos:** ACL `khora_private.jules_source_acl` permanece sin grants de terceros. El propietario está exento de consulta ACL por coincidencia autenticada con `MCP_ALLOWED_EMAIL`; la frontera de sus recursos es la cuenta conectada por `JULES_API_KEY`. No se ejecutó inserción de ACL ni se concedieron permisos a otros sujetos.
- **Validación:** `npm run typecheck` PASS; 34/34 pruebas focalizadas MCP/Jules/token PASS; 568/568 unitarias PASS en 82 archivos salvo la única prueba `methodology_contract_sync.test.ts` dependiente de GitHub CLI autenticado, no disponible en la instancia. La build de Production completó correctamente. GitHub Actions del head de intervención no llegó a ejecutar pasos; no se presenta como CI aprobada.
- **Limitaciones pendientes:** no se completó OAuth desde la interfaz de ChatGPT, no se ha cotejado el claim `sub` de una sesión real contra `MCP_ALLOWED_EMAIL`, ni se ha realizado una llamada autenticada a Jules. La disponibilidad de escritura depende de que el espacio ChatGPT sea Business o Enterprise/Edu. Pro admite solo MCP de lectura/obtención. La opción Business con una licencia se ofrece de forma limitada a algunos clientes nuevos; verificar checkout antes de asumir dos asientos.
- **Estado:** servidor MCP de Khora publicado en Production y metadatos verificados; herramientas Jules preparadas con scopes directos; integración nativa ChatGPT/Jules **pendiente de conectar y probar con una cuenta elegible**. Fuentes de requisitos: https://help.openai.com/en/articles/12584461-connecting-custom-mcp-servers-in-chatgpt y https://help.openai.com/en/articles/20001624-chatgpt-business-single-seat-configuration.
## 21. Transferencia de titularidad y expediente de conversación — 2026-10-30

- **Renombramiento del frente:** el operador definió «Khora MCP» el 2026-10-30 10:20:23. Se adopta `KHORA-MCP` como identidad vigente; `Observabilidad MCP` / `OBSERVABILIDAD-MCP` se conserva como antecedente y en la ruta física heredada para mantener referencias estables.
- **Transferencia:** el operador instruyó expresamente «asume responsabilidad del frente» en esta conversación. Se verificó el control anterior en generación 3 y Blob SHA `ada0d78ee10a7d40ae0bc870c27ec4ea6d8d335a`; el control fue actualizado por compare-and-swap de ese SHA y quedó en generación **4**, commit `8cda6636afb9b1a34fcf6e5187d1645007a2151a`; la verificación de lectura de vuelta quedó asentada en `5b188d2f707df437b12d42a5b637826ea140dd8b`. Titular actual: `chatgpt-khora-mcp-01a18f79-2078-7501-bc18-5ce14475d245`. Evento de transferencia: `KHORA-MCP-TRANSFER-01A18F79-2078-7501-BC18-5CE14475D245`. El titular previo y su historial de generación 3/2/1 permanecen archivados dentro del mismo control.
- **Identificadores:** el UUIDv7 `01a18f79-2078-7501-bc18-5ce14475d245` es local y no nativo. No se recibió ID nativo de conversación (`owner_thread=null`). No se asignó un folio nuevo; FOL1 queda pendiente/no asignado.
- **Adjunto original:** procedencia local `C:\Users\PC 13\Downloads\ChatGPT-Khora MCP-20261030-1856.txt`; conversación exportada «Khora MCP», creación 2026-10-30 10:13:37, última actualización exportada 17:57:52 y exportación 18:56:16 (hora local del equipo). Tamaño **201,805 bytes**, **4,661 líneas**; SHA-256 `3ED8B0605E6828B08E1AA8E325E1BF5A81E0B31943B67E5865C7E8576056F7DF`.
- **Persistencia:** original íntegro en `docs/frentes/observabilidad-mcp/historial/ChatGPT-Khora MCP-20261030-1856.txt`; commit de adjunto `637cd3b0f2183bf7f3c534acd2732b9961d0ffa2`; Blob SHA `c9ecb2e7cdfc5ce0ee50c5821e979588eeeb0a90`. La lectura de vuelta desde GitHub se escribió a un archivo temporal de verificación en PC-14; su SHA-256 coincidió exactamente con el original (`3ED8B0605E6828B08E1AA8E325E1BF5A81E0B31943B67E5865C7E8576056F7DF`) y su tamaño fue 201,805 bytes. La copia original de Downloads no se movió ni modificó.
- **Contenido del expediente:** conserva la definición y ampliación del alcance de Khora MCP, la convención local MSP/MCP, el inventario de scopes/capacidades discutido, el handoff histórico del puente local ChatGPT Free → RDC → PC-8 y las iteraciones de implementación General/Jules, incluida la actualización de estado de producción. Es fuente primaria de procedencia conversacional, no reemplaza los contratos ni el estado técnico comprobado en el repositorio.
- **Límite de autoridad del adjunto:** las instrucciones incrustadas para otro modelo, PC-8 o sesiones previas se conservan como contenido histórico. No constituyen por sí solas autorizaciones actuales para ejecutar operaciones, acceder a secretos, modificar Custodia, fusionar ramas, crear permisos adicionales o desplegar. La transferencia de responsabilidad no amplía el `bootstrap_scope` ni altera los límites técnicos y de plataforma ya registrados.
- **Metodología aplicada:** P037 para transferencia; P041 para preservar el original y cotejar lectura de vuelta; P042 para no inventar folios; P038 para prevalencia de `main`; MCP normativo permanece **DESACTIVADO**.
- **Estado del frente al asumir:** la implementación de integración Jules y el smoke test de metadatos OAuth en Production están documentados en §20. La integración OAuth real desde ChatGPT y la invocación autenticada real de Jules siguen pendientes; no se declara aceptación end-to-end.

## 22. Puente local Jules por RDC con OAuth de Khora — actualización 2026-10-31

### 22.1 Instrucciones directas del operador

> Por lo que veo no vamos a poder utilizarlo en la versión gratuita, ¿verdad? Si es así, que funcione con RDC. Existe un ámbito de la metodología llamado entorno persistente, que va a permitir disponer de carpetas de trabajo canónicas en el escritorio o la carpeta escritorio de la sesión del usuario de la sesión de Windows de la sesión de entorno persistente actual. Esas carpetas de trabajo pueden servir para que construyas alguna suerte de MSP local que pueda ser accedido mediante RDC para que podamos circunnavegar las limitaciones de la versión gratuita de ChatGPT que nos impiden conectarnos directamente al MSP de Jules. Si esa es la opción que tenemos que tener por no tener una versión pagada de ChatGPT, entonces resuelve e implementa de extremo a extremo, a menos que tengas una mejor idea. Hazlo con agilidad, ya que este frente es el cuello de botella para todo el proyecto general.

> Una aclaración. Entorno persistente es un ámbito que no está todavía funcionando y no puede ser utilizado como si lo estuviese para resolver este frente urgente. El arreglo que te dije, tómalo en cuenta y establécelo de manera provisional desde el frente de trabajo, de forma que sea compatible con entorno persistente cuando ya quede implementado ese ámbito de la metodología.

> La sesión local activa de RDC es la única disponible y es la que debes usar. Cualquier trabajo previo local se habrá perdido.

> El paso de obtener el bearer debe de ser hecho que no sea manual, yo no debo de tener que hacer eso, si una plataforma tiene acceso MCP a Khora, debe de poder obtener acceso al ámbito de Jules del MCP para desarrollo, para eso le di el acceso.

> Nunca usaré comandos manuales, para eso tienes RDC.

### 22.2 Decisión vigente

Se adopta un cliente MCP local de transporte estándar por stdin/stdout, iniciado y operado por ChatGPT mediante la sesión RDC autorizada. El cliente se autentica ante Khora Production mediante OAuth 2.1 Authorization Code + PKCE, usando la identidad real del propietario. No crea un segundo servidor MCP local, no abre un puerto de escucha permanente y no copia credenciales del navegador.

Se descarta como flujo vigente la provisión manual de un Bearer. El diseño inicial de PR #347 que pedía generar un token manual, copiarlo, pegarlo en PowerShell y ejecutar Setup no cumple las instrucciones del operador. Se conserva como antecedente del historial, no como procedimiento de instalación.

La cuenta propietaria admitida por MCP_ALLOWED_EMAIL recibe jules:read y jules:write directamente desde la política de Khora, sin grants manuales por repositorio ni por rama y sin requerir norm:turn como permiso auxiliar para las herramientas Jules. La autorización sigue vinculada a la identidad autenticada y a la cuenta Jules configurada en el servidor; no concede acceso a otra cuenta ni amplía los recursos que Jules realmente expone. Los demás sujetos conservan ACL exacta y fail-closed.

Consentimiento OAuth: el cliente puede registrar dinámicamente su cliente público y abrir automáticamente el navegador local en la pantalla oficial de autorización de Khora. El propietario debe confirmar expresamente el consentimiento mostrado por Khora para jules:read y jules:write; si no hay sesión, se usa el login normal. Esta confirmación en navegador es la única intervención humana inicial de seguridad. No se solicita al operador crear, transportar, revelar ni pegar tokens, ni ejecutar comandos manuales.

### 22.3 Arquitectura y ciclo de autorización

Flujo:

ChatGPT → RDC → cliente MCP local stdio → OAuth Khora Production → /api/mcp → herramientas Jules → Jules API

1. El cliente crea un servidor HTTP efímero ligado exclusivamente a 127.0.0.1, en un puerto aleatorio no privilegiado, y registra en Khora un cliente público con redirect URI exacta /oauth/callback.
2. Genera state, code_verifier y code_challenge S256 localmente; abre el navegador a la ruta OAuth de Khora. No lee cookies ni reutiliza credenciales fuera de OAuth.
3. Khora coteja la sesión autenticada contra MCP_ALLOWED_EMAIL y presenta el consentimiento de los scopes. El callback verifica el peer loopback, Host, ruta, state, issuer y código de un solo uso.
4. El intercambio de código se realiza en /api/oauth/token con PKCE S256 y el resource canónico https://khora-web.vercel.app/api/mcp.
5. El refresh token rotatorio se cifra con DPAPI CurrentUser. El access token permanece solo en memoria y se renueva antes de expirar; la nueva copia del refresh token se guarda y relee antes de utilizar el access token renovado.
6. Tras conectar, el cliente verifica tools/list y solo declara ready si están presentes las siete herramientas Jules. ChatGPT envía las solicitudes en JSON por stdin y recibe los resultados por stdout a través de RDC.

La excepción DCR para clientes nativos acepta solamente http://127.0.0.1:<puerto>/oauth/callback, con puerto 1024–65535, sin credenciales, query ni fragmento. Rechaza localhost, IPv6 loopback, LAN, formas numéricas/hexadecimales alternativas de IPv4, puertos privilegiados y rutas diferentes. El servidor temporal no acepta tráfico desde LAN ni permanece abierto después del callback.

### 22.4 Workspace y custodia local provisional

- Sesión RDC observada: PC-14, Windows PC-14\PC 13; workspace provisional recién materializado en C:\Users\PC 13\Desktop\Khora\khora-main.
- El estado local anterior se considera perdido según la instrucción del operador; esta ruta es la única copia de trabajo local de este ciclo.
- Cliente: khora-web\tools\jules-rdc-bridge\bridge.mjs.
- Lanzador controlado por RDC: khora-web\tools\jules-rdc-bridge\jules.ps1; el usuario no tiene que ejecutar comandos.
- Custodia del refresh token: .khora-local\jules-rdc-bridge\oauth-refresh.dpapi, excluida de Git, cifrada con DPAPI CurrentUser y ACL restringida a la cuenta Windows activa y SYSTEM. La escritura realiza lectura de vuelta del ciphertext y cotejo del JSON descifrado.
- Los access tokens no se guardan en archivo ni se emiten a stdout/stderr; solo se mantienen en memoria. La credencial DPAPI contiene client ID público y refresh token OAuth, nunca JULES_API_KEY.
- JULES_API_KEY permanece exclusivamente en Khora Production. El cliente local no consulta ni extrae secretos del navegador, Vercel, GitHub o Khora.
- Cambiar de perfil Windows o equipo invalida la capacidad de descifrar el refresh token; se requerirá un nuevo consentimiento OAuth.
- Esta ubicación es provisional y no declara operativo OEP/Entorno Persistente. Cuando OEP se implemente se podrá reubicar el workspace conforme a su contrato, sin presentar esta carpeta como entorno cifrado integral.

### 22.5 Capacidades y límites del puente

- Siete herramientas MCP: jules_list_sources, jules_list_sessions, jules_get_session, jules_list_activities, jules_create_session, jules_send_message y jules_approve_plan.
- Paginación, límites de tamaño, validación de identificadores, rutas de fuentes, rama inicial y SHA-256 del plan antes de la aprobación.
- El cliente no introduce otra API key Jules, no crea ACL por repositorio para el propietario, no repite automáticamente POST no idempotentes con resultado ambiguo y no inicia trabajos Jules hasta recibir una petición válida del operador.
- La aprobación del plan sigue limitada por la API Jules: el proveedor no ofrece precondición atómica plan_id/ETag/If-Match; el doble preflight no se anuncia como transacción ni elimina completamente la ventana de carrera (T22 parcial).
- RDC es un canal de operación local autorizado, no un bypass de políticas de OpenAI. No convierte el MCP remoto en conector nativo con permisos de escritura para una cuenta ChatGPT que no los tenga; es una vía de cliente local distinta.
- La disponibilidad, los scopes y las fuentes reales solo se declaran tras consentimiento OAuth, respuesta autenticada de /api/mcp, descubrimiento de las siete herramientas y lectura real de fuentes Jules.

### 22.6 Verificaciones realizadas en PC-14

- Workspace Khora clonado y sincronizado inicialmente con PR #347; merge de dos padres incorporó el main observado y preservó el historial de la sección anterior de este OCP. La rama local es feat/jules-rdc-local-bridge-20261030.
- npm ci --no-audit --no-fund: PASS, 576 paquetes instalados.
- node --check tools/jules-rdc-bridge/bridge.mjs: PASS.
- Parser PowerShell 5.1 para jules.ps1 y credential.ps1: PASS.
- npm run typecheck: PASS.
- npm run ui-review:check: PASS.
- npm run ui:contract: PASS.
- npm run test:unit: 572/572 PASS.
- Callback DCR: pruebas de allowlist loopback y rechazos de alias, IPv6, LAN, IP numérica/hexadecimal, puertos privilegiados, path/query y metadatos alterados: PASS.
- DPAPI con refresh token exclusivamente sintético: almacenamiento, descifrado, read-back y Status PASS; archivo de prueba eliminado. No se guardó una credencial real.
- .khora-local está excluido por .gitignore.
- npm run build local: PASS, Next.js 16.4.0 compiló y generó 78/78 páginas; el prebuild ejecutó typecheck, UI Review, contrato de navegación y 572/572 unitarias. El primer intento sin AUTH_SECRET se detuvo al recopilar rutas; el build completo posterior usó únicamente una clave aleatoria efímera de prueba en el entorno del proceso, no persistida ni desplegada, y la variable fue eliminada al terminar. No se descargaron ni copiaron secretos de Vercel Production; los archivos temporales de entorno se eliminaron.
- Vercel reconoce el proyecto khora-web (prj_hRN86BKITXYKTnNlp0ygVhaMwFfx) en el team victorhugotorresmendez-8991s-projects. La rama debe validarse mediante un Preview construido en el entorno remoto de Vercel, que posee sus variables de entorno, antes de fusionar/desplegar.
- No se realizó autorización OAuth real, no existe refresh token de operador en DPAPI, no se ha confirmado tools/list con credencial real, no se ha consultado aún el catálogo real de fuentes Jules y no se ha creado una sesión Jules.

### 22.7 Estado y siguiente compuerta

Implementación local, 572/572 pruebas y build de producción local con 78/78 páginas: PASS. Preview remoto de la rama: PENDIENTE; no se ha desplegado Production ni realizado consentimiento OAuth real o aceptación end-to-end.

Siguiente secuencia controlada por ChatGPT mediante RDC y herramientas conectadas: terminar la verificación de diff/OCP; publicar la rama y actualizar PR #347; generar Preview remoto con la configuración real de Vercel; comprobar build y endpoints OAuth/DCR; integrar a main y desplegar Production solo tras el Preview correcto; iniciar el puente por RDC; obtener consentimiento OAuth del propietario en el navegador; verificar tools/list y una lectura real de fuentes/sesiones Jules. La autorización humana no se reemplaza por extracción de sesión ni por emisión manual de Bearer. No se crea ni aprueba una tarea Jules real durante el smoke test de lectura.


## 23. Nueva sesión RDC y reconstrucción integral de General — 2026-10-31

### 23.1 Reentrada y fuentes

- Instrucción del operador: asumir perdida la totalidad del entorno local anterior y reiniciar desde las fuentes persistentes. No se reutilizaron procesos, clones, archivos temporales, variables de entorno, credenciales ni resultados de PC-14.
- Dispositivo RDC nuevo: PC10RCIF4EI4, UUID d0bbb2a3-d7b4-45e1-8870-652c2c3844fc, Windows, usuario central\mantenimientorci, perfil C:\Users\MantenimientoRCI, Desktop Commander 0.3.1, Node 24.0.0, Git 2.45.2, PowerShell 5.1.26100.9711. GitHub CLI se encontró instalado y autenticado como 1interprete1; solo se usó para comprobar acceso Git, no se mostró ni copió el token.
- Clon limpio materializado desde GitHub en C:\Temp\khora-general-mcp-custodia-pc10-20261031. Rama local: work/obs-mcp-custodia-tools-20261030-01a18dcb; base recibida desde el ref remoto 649e417b7cc1074c7097c9c3c570085a21292cf. main observado: bbe50f61866aca2a676fc3f1b89ce49e64979e3c. Merge-base: d82952a17192787f49b4c804b4ae3ca7847288e0.
- DUG releído desde SeryMente/metodologia/main: Samantha v373 · NX-373m, Metacanon 1.26, GOW 2.14, HTML Blob SHA cac4525de77d4f47a8a59c25201968ecf2056b90; commit metodológico más reciente observado f74082148d28b575c232e8fc291607bef8861794. §ARR leído antes de los principios; MCP normativo continúa DESACTIVADO. Principios aplicados: P001, P004, P005, P037, P038, P041, P042 y P043.
- Control vigente de Khora MCP releído desde main: generación 4, titular chatgpt-khora-mcp-01a18f79-2078-7501-bc18-5ce14475d245, owner_thread=null; no se efectuó transferencia ni se incrementó la generación.

### 23.2 Reconciliación selectiva de main

La primera comparación del grafo indicó 43 commits propios y nueve commits exclusivos de main, sobre la base común d82952a…. Después main avanzó dos commits adicionales de Harmonia. Se revisaron las once rutas antes de seleccionar la incorporación.

Nueve commits permitidos fueron reaplicados en la rama General mediante cherry-pick, sin reutilizar artefactos de PC-14:

- Harmonia, control generación 10: b00a5d7683fec8d4474fefd237e3389cbbf66a6e → commit local 30721d0bb0b343f3d46bd1d5918c337acdf6e51a.
- Archivo original de Harmonia: 97c4e5c56e6db0cef144cfdf0542138efd67f7a6 → b30c220d8714fdcfa85ba9f87dbf01d060bf533f.
- Procedencia Harmonia: 12c719e3e2bdb4416cc81039c1e2ac24cc781ef4 → b6ce3e6cf16bae2a6d6142577174828c8856a0f4.
- OCP Harmonia generación 10: 5e20dc61eebf4c686e7edc46d42daa4f1cad6808 → 9b803f45203bd7ed8b50e4c94ec06c82b3273831.
- Puente Jules RDC + OAuth 2.1/PKCE: 4530e03a33c5e1743ab9646eb6c862b3c458c605 → 8957b8e0435fe8023aad8c1e8b763001b8eccdec. El único conflicto fue en este OCP; se conservó §22 para el puente y se mantuvo el registro técnico de Custodia para §23. Ruta MCP, DCR, configuración, pruebas y control de responsabilidad se combinaron conservando el contrato de las herramientas Custodia.
- Evidencia CI/RDC de Harmonia: 702ac339a2ded3f890c3a06319e1047fb40073a5 → 047608f5fc8a0b6f424cbd7b651f04cff6f8da93.
- Versión OCP Harmonia 0.37: bbe50f61866aca2a676fc3f1b89ce49e64979e3c → 0a2af8537068f722ec42cc32112e459b452cab83.
- Transferencia documental Harmonia a generación 11 en PC-10: d742e13b4d2ccc1a07a72eb1205b38a65d1a120c → 64054333bdf7ea86b11fdc07decc01875c1c9b10.
- OCP Harmonia v0.38 y cierre de sesión PC-10: a99784b9ae49b946d48318f0f0f8fb115e43c8cc → bce72856ba660fac9f519e57051258049066e8b6.

Dos commits se excluyeron deliberadamente por el límite de autorización que prohíbe modificar el frente Custodia:
- 97700994b72ce0f06f0b17c1b848a42f610e82e2: cambia frentes/custodia/CONTROL-RESPONSABILIDAD.json a generación 5.
- f87ca6c5c8d75eeb23eeb80a5309c360314c73a8: cambia frentes/custodia/OBJETO-CANONICO.md a CUSTODIA-v0.13.
No se cherry-pickearon, editaron, revertieron ni sobrescribieron esos dos archivos.

Después de los cherry-picks, y antes de este último registro OCP, el grafo local informaba 52 commits propios y once commits de main no antecesores (resultado de cherry-picks, no de equivalencia de árboles). Nueve de esos once cambios permitidos ya están reaplicados bajo nuevos SHA locales; solo se excluyeron los dos commits de Custodia. El commit documental de §23 será el commit adicional de continuidad sobre ese corte. La comparación de árbol mantiene exactamente las dos rutas de Custodia citadas como divergencia documental excluida; el resto del delta corresponde a las herramientas Custodia de General, scopes/contratos, puente Jules, migración 034, pruebas y OCP Khora. La rama local permanece nueve commits por delante del ref remoto original 649e417… .

### 23.3 Validación reproducida en PC-10

- Restauración limpia npm ci --no-audit --no-fund: PASS; 683 paquetes añadidos desde el lockfile. No se ejecutó npm audit fix ni se actualizaron dependencias.
- Pruebas focalizadas MCP/Custodia/Jules/OAuth/DCR/migración: 63/63 PASS, 0 fallos, 0 omitidas.
- npm run typecheck: PASS.
- npm run ui-review:check: PASS.
- npm run ui:contract: PASS.
- npm run test:unit: 589/589 PASS, 0 fallos, 0 omitidas. Incluyó methodology_contract_sync.test.ts, que en PC-14 no se pudo ejecutar por ausencia de GitHub CLI.
- npm run build: código 0. El prebuild repitió TypeScript, UI Review, contrato de navegación y 589/589 tests; Experience preflight indicó not_requested; la extensión Harmonia v0.3.5 se construyó. Next.js 16.4.0 compiló y generó 78/78 páginas.
- Warnings no bloqueantes del build: convención middleware deprecada y APIs Edge Runtime de process.cwd, CompressionStream y DecompressionStream en dependencias Next/Auth/Jose. No se ejecutó codemod ni se modificaron esas dependencias.
- node --check tools/jules-rdc-bridge/bridge.mjs: PASS.
- Parser PowerShell 5.1 para jules.ps1 y credential.ps1: PASS.
- .khora-local/ está cubierto por .gitignore; no existe directorio de credenciales locales en el workspace nuevo. No se realizó OAuth real, no se creó refresh token DPAPI y no se leyó ni escribió ninguna credencial de proveedor.
- AUTH_SECRET fue generado aleatoriamente solo en el proceso del build y eliminado en el bloque finally; en una shell nueva AUTH_SECRET está ausente.
- Pruebas Blob utilizaron bytes cifrados sintéticos y mocks HTTP. No se conectó a DB, Blob ni endpoints productivos. La migración 034_custodia_mcp_read_contract.sql no se ejecutó en Neon ni Production.

### 23.4 Estado y compuerta de integración

- La reconstrucción local PC-10 fue publicada mediante fast-forward en la rama General. En el cotejo de entrada a esta iteración, el ref remoto y HEAD local coincidían en \`370a874ba8253f68cfbf2a11bb44badeb727b035\`, hijo de \`b197137737262c94bdb5564ee9181c978f27d60f\`; el ref de \`main\` era \`a99784b9ae49b946d48318f0f0f8fb115e43c8cc\`.
- OCP único de Khora MCP: v0.3.9 en la iteración actual. Control de responsabilidad permanece en generación 4; titular operativo sin transferencia ni cambio de generación.
- El diff directo de árbol entre la rama y \`main\` conserva diferencias históricas en las dos rutas de Custodia. El diff de contribuciones desde el merge-base \`d82952a17192787f49b4c804b4ae3ca7847288e0\` demuestra que la rama no ha añadido, editado, cherry-pickeado ni revertido ninguna de esas dos rutas.
- Se preparó \`REVISION-TITULAR-CUSTODIA-LECTURA.md\` con los puntos de dictamen, evidencia y límites. Estado: **PREPARADO PARA REVISIÓN; NO ACEPTADO POR EL TITULAR**. El criterio de revisión/aceptación del titular sigue pendiente.
- No se creó PR, no se fusionó en \`main\`, no se desplegó y no se ejecutó la migración 034 en Neon.
- La simulación de merge de tres vías detecta conflicto de contenido únicamente en este OCP; el árbol candidato conserva literalmente las dos rutas canónicas de Custodia de \`main\`. No se creó merge commit ni se aplicó la simulación al workspace.
- Los cinco checks remotos Vercel del commit \`370a874…\` fallan con un destino que solicita \`upgradeToPro=github-private-org-to-hobby\`. Es un gate remoto de cuenta/plan y no evidencia de fallo del build local.
- OAuth real, conexión Neon/rol efectivo de \`KHORA_READONLY_DATABASE_URL\`, lectura real de Blob y aceptación del titular siguen **PENDIENTES**.
- El siguiente paso prioritario es obtener el dictamen expreso del titular de Custodia sobre el documento de revisión; no interpretar el silencio como aceptación ni integrar a \`main\` antes de resolver el conflicto documental del OCP.

## 24. Contrato de lectura Custodia — iteración 2026-10-31

### 24.1 Defectos técnicos identificados y corregidos en General

- **Propiedad:** `owns()` utilizaba `OWNER=$1` aunque el array de parámetros era `[sessionId, actor]`; $1 era la sesión y no el actor. El predicado ahora compara con $2. La prueba de regresión verifica los parámetros exactos y la denegación de un actor distinto.
- **Aislamiento de las lecturas secundarias:** la lectura de partes en Revisiones e Integridad ahora une sesión/archivo y repite el predicado de titular en la misma sentencia SQL que recupera metadata de partes.
- **Presupuesto físico acumulado:** `khora_custodia_verificar_integridad` limita cada invocación/página a 32 MiB de respuesta Blob y 45 s de recorrido físico; cada fetch tiene un máximo individual de 30 s limitado por el tiempo restante. El presupuesto no se reinicia entre partes de una misma página. Si el tamaño declarado excede los bytes restantes, la siguiente lectura no se inicia.
- **Límite de stream:** sin Content-Length, el último bloque del stream puede hacer que el contador observado exceda el presupuesto nominal hasta el tamaño de ese bloque; el bloque que rebasa el saldo no se copia al buffer cifrado ni se descifra. El proveedor/stream no ofrece en este punto un límite de transporte más estricto.
- **Contabilidad:** el resultado informa bytes efectivamente recibidos, tiempo de Blob y estado agotado también cuando la lectura siguiente se evita anticipadamente por tamaño declarado. El presupuesto de 45 s comienza antes del recorrido de partes Blob y no incluye el guard de rol, la autorización de sesión o las consultas de metadata SQL.
- **Alcance temporal:** el presupuesto se aplica a una invocación MCP/página. Se reinicia en una nueva llamada con cursor; no existe aún presupuesto de extremo a extremo para todas las páginas de una sesión. Ese límite de recorrido completo queda sujeto a dictamen del titular.

### 24.2 Privilegios efectivos y alcance del lector

- La migración 034 verifica que `khora_lector` esté preaprovisionado como rol de grupo `NOLOGIN`, no privilegiado. No crea login, secreto ni credencial.
- Los grants se expresan por columna para las cuatro tablas Dictado y cuatro columnas de `volcado`; se limpian grants anteriores directos a nivel de tabla/columna del rol y grants `PUBLIC` para las cuatro tablas Dictado.
- No se revocan los grants `PUBLIC` de la tabla global `volcado` para no afectar otras superficies Khora sin autorización. El guard falla cerrado si esos permisos heredados dan a la conexión lectura de columnas fuera del contrato.
- El guard del runtime exige pertenencia heredante al grupo lector, rol seguro, SELECT por columna de la allowlist, ausencia de SELECT de tabla completa o columnas adicionales en las cinco relaciones Custodia y ausencia de DML/privilegios de secuencia efectivos en los esquemas de aplicación visibles. Los catálogos internos de PostgreSQL se excluyen de la inspección de DML.
- Esto demuestra el contrato del guard y los grants en fixtures PostgreSQL aislados; no demuestra qué rol usa la variable desplegada `KHORA_READONLY_DATABASE_URL`. El usuario efectivo de esa conexión productiva permanece **NO VERIFICADO**.

### 24.3 Migración y conservación

- `034_custodia_mcp_read_contract.sql` se ejecutó dos veces en PostgreSQL aislado con esquema nuevo y con esquema Dictado preexistente, preservando el registro sintético histórico. Ambas variantes comprobaron idempotencia y permisos efectivos.
- Los tests verifican SELECT de columnas permitidas, ausencia de SELECT de tabla completa/columnas prohibidas, ausencia de INSERT/UPDATE/DELETE/TRUNCATE y secuencias; además, el guard rechaza fallback privilegiado, login ajeno, DML en una tabla de otro módulo y lectura heredada de `volcado.payload`.
- La prueba FK confirma `ON DELETE SET NULL` para el vínculo a `volcado`, `ON DELETE CASCADE` de sesión a filas de partes y bloqueo por referencias de checkpoint/MP3 mientras existan. La cascada relacional no elimina el objeto físico de Vercel Blob; puede dejar objetos huérfanos. La política de retención/limpieza queda a decisión del titular.
- No se alteraron FKs ni datos reales; la migración no se ejecutó en Neon.

### 24.4 Evidencia local y gates remotos — separados

**Evidencia local reproducible de esta iteración**

- `npm run typecheck`: PASS.
- Pruebas focalizadas Custodia + migración: 23/23 PASS, sin fallos ni omitidas.
- npm run test:unit: 597/597 PASS, 0 fallos, 0 omitidas.
- Build Next.js: **NO EJECUTADO** en esta iteración.
- npm run ui-review:check: PASS. npm run ui:contract: PASS; ambos reejecutados en esta iteración.
- PGlite usa un motor PostgreSQL aislado en memoria con fixtures sintéticos. No es Neon Production y las pruebas mock no son lecturas físicas de Vercel Blob.

**Gates remotos y evidencia productiva pendientes**

- Vercel/GitHub: los cinco contextos del commit técnico `821784087388e7bb687f642a97dbe421f7940c9e` aparecen en failure y sus destinos apuntan al requisito de upgrade de cuenta `github-private-org-to-hobby`. Este resultado remoto no contradice el éxito del TypeScript ni de las pruebas locales; tampoco acredita Preview/CI aprobado.
- OAuth real end-to-end: PENDIENTE.
- Identidad/privilegios efectivos de `KHORA_READONLY_DATABASE_URL` en entorno autorizado: PENDIENTE; no se leyó su valor ni se usó credencial productiva.
- Neon Production, ejecución de 034 y consultas de datos Custodia: PENDIENTES y no realizadas.
- Lectura/descifrado de Blob reales de Production: PENDIENTE y no realizada.
- Dictamen del titular de Custodia: PENDIENTE.

### 24.5 Diff, simulación de merge y límite de autorización

- Rama aislada: `work/obs-mcp-custodia-tools-20261030-01a18dcb`; ref al inicio de la revisión `370a874ba8253f68cfbf2a11bb44badeb727b035`; commit técnico publicado y validado `821784087388e7bb687f642a97dbe421f7940c9e`; `main` `a99784b9ae49b946d48318f0f0f8fb115e43c8cc`; merge-base `d82952a17192787f49b4c804b4ae3ca7847288e0`.
- `git diff --name-status $(git merge-base origin/main HEAD) HEAD -- frentes/custodia/CONTROL-RESPONSABILIDAD.json frentes/custodia/OBJETO-CANONICO.md` no devuelve rutas: la rama no contribuye cambios a esos objetos.
- El diff directo `origin/main` ↔ rama sí muestra el snapshot anterior de ambos objetos en la rama. No confundir esa diferencia de árbol heredada con modificaciones de la rama en esta iteración.
- Repetida sobre el HEAD publicado `821784087388e7bb687f642a97dbe421f7940c9e`, la simulación `git merge-tree --write-tree origin/main HEAD` detectó un único conflicto de contenido en `docs/frentes/observabilidad-mcp/OBJETO-CANONICO.md`; las rutas de código MCP y configuración se auto-mergean. El conflicto documental corresponde a la versión/continuidad de §1 y a las secciones agregadas por esta rama. No se aplicó el árbol candidato ni se creó merge commit.
- En ese árbol candidato, los blobs de Custodia son exactamente los de main: control `1917f056e8fc084f2f6f023ebf73e167e8a41467`; OCP Custodia `c4f715f0fd91905f5d380b5d3e8dbf677ce7b813`. El cotejo de árbol contra `origin/main` para esas dos rutas retorna igualdad.
- No se creó PR, merge commit ni deployment. El conflicto pendiente pertenece al OCP de Khora MCP y exige conservar el contenido válido de §22/§23/§24 sin tocar los objetos canónicos de Custodia.

### 24.6 Dictamen requerido y estado de aceptación

El expediente `REVISION-TITULAR-CUSTODIA-LECTURA.md` concentra los puntos abiertos: autoridad/fallback de titular, igualdad/normalización de actor, acceso indirecto a snapshot cifrado, scope y gate MCP, política KHC1/legado, presupuesto por página y entre páginas, cascada/retención física y privilegios reales del rol de conexión.

**Estado del criterio de cierre:** código corregido en General y pruebas reproducibles preparadas/verificadas; diff de Custodia conciliado en simulación; OCP actualizado. Sin embargo, el contrato aún no ha sido revisado/aceptado por el titular. Por ello la aceptación funcional de Custodia permanece **PENDIENTE**, no se declara cierre total y no se habilita integración a `main`.
