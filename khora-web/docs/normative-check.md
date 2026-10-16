# NORM-CHECK en KHORA

**Estado:** implementación existente; ampliación C007 en propuesta revisable
**Versión:** v0.5.0 — Evidencia ordenada y ledger server-side por ciclo
**Fecha:** 2026-10-07

## Superficie

- UI: /sistema/otros
- MCP canónico multiuso: `/api/mcp`
- Herramientas MCP normativas: `khora_norm_open_turn`, `khora_norm_apply_principle`, `khora_norm_verify_turn`, `khora_norm_release_turn`
- REST legado/manual: GET/POST `/api/norm-check`
- Persistencia: normative_receipts
- Verificador: khora-web/lib/server/norm-check.ts

El acceso de plataformas se concentra en un único recurso MCP: `/api/mcp`. OAuth identifica al cliente y los scopes limitan capacidades; no existe un servidor MCP separado para gobernanza. `KHORA_API_KEY` queda reservado para compatibilidad servidor-a-servidor y nunca se entrega al modelo ni a la UI. El mismo `/api/mcp` admite además un Bearer Token manual generado por KHORA para clientes que no puedan completar OAuth.

## MCP multiuso

La misma entrada MCP expone las capacidades existentes de Khora —volcados, runtime, revisión— y las capacidades normativas. El recurso no se duplica por función.

Scopes vigentes:

- `volcados:read` — lectura de volcados y revisión.
- `runtime:read` — observabilidad del runtime.
- `norm:turn` — apertura y verificación del ciclo normativo.

Una plataforma puede solicitar uno o varios scopes sobre el mismo `/api/mcp`. Para plataformas con soporte OAuth se usa OAuth 2.0 + PKCE; como alternativa, el operador puede generar desde `/sistema/mcp` un Bearer Token manual con scopes y caducidad, copiarlo y colocarlo en el campo de credencial de la plataforma. KHORA almacena solo su hash y la revocación global por generación lo invalida junto con los tokens OAuth.

## Flujo de máquina

1. `khora_norm_open_turn` adquiere el `main` actual dos veces (H1 → SI@H1 → H2) y solo acepta el snapshot si H1=H2; fija versión, commit SHA, blob SHA, SHA-256, manifest SHA-256 y la totalidad dinámica de principios.
2. `khora_norm_apply_principle` registra cada principio en el ledger server-side y KHORA solo acepta el siguiente folio del orden canónico.
3. `khora_norm_verify_turn` bloquea el turno, exige ledger completo y ordenado, compara ese ledger con el receipt y persiste el hash `application_log_sha256` junto con el receipt.
4. Solo un resultado `VERIFIED` permite cerrar el turno y `khora_norm_release_turn` emite `VERIFIED_RELEASE` únicamente cuando el receipt conserva orden, hash del ledger y commit del snapshot.
5. La salida conversacional no se bloquea si KHORA no está disponible; en ese caso no se declara verificación positiva.

## Verificación

KHORA resuelve el git blob SHA indicado por el receipt desde SeryMente/metodologia y recupera la versión histórica exacta del SI. Del contenido recuperado deriva el manifest dinámicamente.

Se validan:

- versión del SI;
- SHA-256 del SI;
- SHA-256 del manifest;
- cobertura por folio;
- faltantes, duplicados y desconocidos;
- estados A/N/C y sus anchors/reason codes;
- SHA-256 de evidencia;
- identidad de ciclo e intento.

Los blobs del SI se cachean por SHA para reducir latencia cuando se reutiliza una misma versión.

## Persistencia

La combinación cycle_id + attempt es única. Un rechazo no se sobrescribe: el cliente debe crear un nuevo attempt.

Existe además una migración SQL 025 y un bootstrap perezoso de la tabla para evitar que un despliegue quede inutilizable si la migración todavía no se ha aplicado.

## Navegación UI

La superficie normativa y su control de acceso deben ser alcanzables sin conocer URLs internas:

- **Navegación principal → Seguridad** abre `/sistema/seguridad`.
- Dentro de **Seguridad** están los submódulos **Entorno Persistente**, **Bóveda** y **Control MCP**.
- **Control MCP** abre la consola existente de `/sistema/mcp`: OAuth, Bearer manuales, scopes y revocación.
- **Navegación principal → Sistema → Evidencia normativa** abre `/sistema/otros`: consulta, detalle y verificación de receipts.
- **Navegación principal → Sistema → Registro** abre `/sistema/registro`: observabilidad y eventos persistidos.

## Interfaz

«Evidencia normativa» se abre desde el submenú Sistema de la barra inferior. La pantalla permite:

- consultar los últimos 50 comprobantes;
- ver totales VERIFIED/INVALID/INCOMPLETE;
- abrir el detalle de un comprobante;
- pegar un receipt JSON y solicitar la verificación server-side.

## Flujo normativo por MCP

1. `khora_norm_open_turn` fija el snapshot del SI y emite un token de turno.
2. `khora_norm_apply_principle` registra cada principio una sola vez, en el orden canónico impuesto por KHORA.
3. `khora_norm_verify_turn` valida el receipt contra el ledger server-side y persiste el intento.
4. Solo `VERIFIED` marca el turno como cerrado en KHORA.
5. `khora_norm_release_turn` emite `VERIFIED_RELEASE` solo con orden, ledger/hash y snapshot consistentes.
6. `INVALID` e `INCOMPLETE` conservan el intento histórico y abren el siguiente `attempt`.

El mismo endpoint MCP sirve para el resto de capacidades de Khora; no se crea una segunda entrada normativa. El transporte Bearer puede proceder de OAuth o de un token manual gestionado por KHORA.


## Registro canónico de verificación por ciclo

P028 del SI exige que cada ciclo quede registrado con una correspondencia verificable entre su identidad, el resultado y la evidencia que lo sustenta.

La fuente única de persistencia continúa siendo `normative_receipts`; el registro de salida es una proyección, no una segunda copia persistida.

Formato estable:

```json
{
  "schema": "cycle-verification/v1",
  "cycle_id": "...",
  "attempt": 1,
  "status": "VERIFIED",
  "evidence_sha256": "...",
  "si_version": "v1.6.7",
  "si_git_commit_sha": "...",
  "si_sha256": "...",
  "manifest_sha256": "...",
  "order_verified": true,
  "application_log_sha256": "...",
  "verifier_version": "norm-check/0.5.0",
  "recorded_at": "...",
  "receipt_id": "..."
}
```

La herramienta MCP `khora_norm_verify_turn` devuelve este registro en `verification_record` tanto para el primer almacenamiento como para respuestas idempotentes. Los intentos `INVALID` e `INCOMPLETE` conservan su propio registro y no se sobrescriben.

## Enforcement del ciclo por MCP

Las herramientas MCP sustantivas de KHORA están protegidas por un gate de ciclo. Cada llamada requiere `_norm_turn_token` emitido por `khora_norm_open_turn`; KHORA valida que el token corresponda al actor, ciclo, intento, nonce y snapshot exactos antes de ejecutar la herramienta.

Después de `VERIFIED`, el ciclo queda `CLOSED` y el token deja de ser reutilizable. Tras `INVALID` o `INCOMPLETE`, el intento cambia y el token anterior deja de ser válido; el cliente debe abrir/usar el nuevo attempt.

El servidor MCP también publica instrucciones operativas para que el cliente ejecute `OPEN → tarea → VERIFY`, pero esas instrucciones son una guía del protocolo. Un servidor MCP remoto no puede impedir técnicamente que una interfaz de chat nativa produzca texto sin llamar primero a una herramienta. La garantía fuerte de “ningún turno sin verificación” requiere un runtime/adaptador que controle ese loop y bloquee el cierre hasta `VERIFIED`.

## Límite

La comprobación estructural es determinista. La auditoría semántica profunda no forma parte del fast path y podrá añadirse después.

## Vínculo canónico

Especificación metodológica: SeryMente/metodologia/ESPECIFICACION-EVIDENCIA-NORMATIVA-POR-CICLO.md


## Observabilidad de fronteras de servicio

Khora registra la frontera de cada request HTTP mediante el middleware transversal y registra además cada tool call de MCP. El evento de frontera contiene servicio, operación, ruta, método, correlación, resultado, código de estado, duración y razón de fallo, sin payloads ni secretos.

El bridge FastAPI conserva el `correlation_id`, registra la finalización de respuestas streaming y entrega el evento al mismo almacén durable. Jules, Notion y Ollama local registran sus dependencias/servicios críticos.

Los eventos de dominio existentes continúan siendo la fuente detallada para captura, dictado, transcripción, ingesta, revisión, grafo y demás operaciones internas. No se crea un segundo almacén.

## Catálogo y conexión del servidor multiuso — propuesta C007

**Alcance de esta revisión:** concordancia de contratos, documentación y pruebas aisladas. No autoriza nuevos clientes OAuth, permisos adicionales, cambios de identidad de plataforma ni retirada del ciclo normativo. La propuesta no acredita fusión, despliegue ni conexión autenticada. Base inspeccionada: `dbc73afada1ad29abf46f4599d22cc3158a9a986`.

### Una entrada, capacidades diferentes

Recurso canónico: `https://khora-web.vercel.app/api/mcp`. MCP es el Protocolo de Contexto de Modelos; Khora es el producto y este servidor es un componente. OAuth y Bearer son mecanismos de autorización, no capacidades de negocio. Las quince herramientas registradas se distribuyen así:

En las tablas, `?` significa opcional. Las diez herramientas **sustantivas** (volcados, revisión y observabilidad) añaden siempre `_norm_turn_token`, `_thinking_mode` y `_output_format_version` a sus entradas. La versión exigida deriva de `REQUIRED_OUTPUT_FORMAT_VERSION`; en esta base es **v1.7.6**, sin promoverla a otra versión. Los modos admitidos son `THINKING`, `INSTANT`, `UNKNOWN` y `UNAVAILABLE`; no inventar un modo observado.

| Herramienta / propósito | Entradas de negocio | Salida principal / límite |
|---|---|---|
| `khora_resumen` / dimensionar volcados | `fecha_inicio?`, `fecha_fin?`, `estado?` | `por_estado`, `total`, `filtros_aplicados`; agregados, no contenido |
| `khora_listar_volcados` / inventariar | `estado?`, `fecha_inicio?`, `fecha_fin?`, `orden?` (`ASC`/`DESC`), `limite?`, `offset?` | `volcados`, `limite`, `offset`, `total_retornados`; extracto de 300 caracteres, no verbatim completo; máximo 100 |
| `khora_leer_volcado` / recuperar texto | `id` (folio o UUID), `version?` | Actual: metadatos, `texto`, `error_descifrado`; histórica: `volcado_id`, `folio`, `titulo`, `version`, `texto`, `sha256`, `motivo`, `creado_en`, `usuario`, `es_version_historica` |
| `khora_buscar_volcados` / localizar una frase | `busqueda`, `limite?`, `offset?` | `busqueda`, `total_coincidencias`, `limite`, `offset`, `resultados` con fragmentos y posición; máximo 100; no texto completo |
| `khora_versiones_volcado` / conciliar versiones | `volcado_id` | Identidad, estado, versión/aprobación, `versiones`, `auditoria`; no sustituye la lectura de cada versión |
| `khora_ui_review` / revisar representación | `pantalla?`, `volcado?`, `solo_metadatos?` | Inventario o HTML con corpus real; controles sin respuesta. Pantallas: ingreso, archivo, revision, aprobacion, ingesta, registro, grafo |
| `khora_observacion_instantanea` / estado observado | `session_id?` | `runtime`, actividad de cinco minutos, última observación, sesiones, fallos, `event_cursor`, almacenamiento e interpretación; umbral de estado obsoleto 15 000 ms |
| `khora_estado_vivo` / consulta de estado unificada | Ninguna | Reutiliza la observación instantánea sin filtro; no es una fuente distinta |
| `khora_eventos_desde` / lectura incremental | `cursor?` entero ≥0, `limite?` entero 1–200, `session_id?` | `cursor_entrada`, `cursor_siguiente`, `limite`, `retornados`, `hay_mas`, `eventos`; continuar con el cursor devuelto |
| `khora_eventos_recientes` / diagnóstico retrospectivo | `segundos?`, `limite?`, `session_id?`, `component?`, `severity?`, `outcome?`, `fase?`, `scope?`, `category?` | `ventana_segundos`, `limite`, `retornados`, `eventos`; ventana 1–86400 s (300 predeterminado), 1–200 eventos (50 predeterminado) |

Las primeras seis requieren efectivamente **`volcados:read` + `norm:turn`**; las cuatro de observabilidad, **`runtime:read` + `norm:turn`**. El permiso de negocio anunciado en `securitySchemes` se conserva; `norm:turn` es una dependencia para abrir y completar el ciclo, no un permiso implícito ni una ampliación automática.

| Herramienta / propósito | Entradas (sin los tres controles sustantivos) | Permiso / salida y efecto |
|---|---|---|
| `khora_mcp_health` / diagnóstico de acceso completo | `thinking_mode`, `output_format_version` | Publica los tres permisos. Informa `ok`, `status`, `full_access`, `missing_scopes`, versiones/hashes o razón de indisponibilidad. Una concesión parcial produce `DEGRADED`, no prueba caída total ni exige ampliar permisos para una tarea parcial |
| `khora_norm_open_turn` / fijar ciclo y fuentes | `conversation_id?`, `turn_number?` entero positivo, `thinking_mode`, `output_format_version` | `norm:turn`; persiste/reutiliza turno, devuelve identidad, intento, token y snapshots; ver contrato ejecutable |
| `khora_norm_apply_principle` / registrar siguiente principio | `turn_token`, `folio` (`P` + tres dígitos), `status` (`A`/`N`/`C`), `anchor?`, `reason_code?` | `norm:turn`; ledger persistido, secuencia, total, siguiente principio, completitud; A/C requieren anchor válido y N razón válida |
| `khora_norm_verify_turn` / verificar y registrar | `turn_token`, `receipt` completo | `norm:turn`; `result`, `verification_record`, persistencia/cierre o siguiente intento; solo `VERIFIED` cierra |
| `khora_norm_release_turn` / liberar salida verificada | `turn_token` | `norm:turn`; `VERIFIED_RELEASE`, salida/hashes, token de liberación y caducidad; no libera un intento incompleto |

Las lecturas usan los almacenes actuales (`volcado` e historial para contenido; `khora_runtime_state` y `eventos_sistema` para observabilidad). **Lectura del contenido no significa ausencia de escrituras:** el envoltorio registra eventos de llamada; la gobernanza escribe turnos, ledger y comprobantes. El HTML y el texto recuperados pueden ser sensibles: no copiarlos a incidencias, ejemplos o evidencias públicas.

### Fuente ejecutable de los contratos y comprobante

`app/api/mcp/route.ts` registra una sola forma Zod por herramienta. `lib/server/mcp-tool-contract.ts` deriva de esa forma el JSON Schema publicado en `tools/list`, incluidos los tres controles sustantivos, y conserva los permisos originales. No mantener una segunda lista manual de entradas. Se conserva `additionalProperties: false` en la publicación exterior; el SDK elimina claves exteriores desconocidas al analizar llamadas directas, mientras los extras del comprobante se preservan. Esta diferencia preexistente de claves desconocidas se declara, no se presenta como rechazo universal del SDK.

`lib/server/normative-receipt-schema.ts` comparte la estructura de `receipt` entre publicación, registro y comprobación básica del verificador. Sus campos obligatorios son:

- `protocol`, `protocol_version`; `cycle.id`, `cycle.attempt`.
- `si.version`, `si.git_commit_sha`, `si.git_blob_sha`, `si.sha256`, `si.manifest_sha256`.
- `methodology.version`, `methodology.git_commit_sha`, `methodology.git_blob_sha`, `methodology.sha256`.
- `input_sha256`, `nonce`, `principles` (no vacío), **`output` completo**, `output_sha256`, `output_header`, `methodology_output_header`, `evidence_sha256`, `created_at`.
- `runtime.platform`, `runtime.reasoning_mode`, `runtime.output_format_version`.

Se publican longitudes, patrones y dependencias estructurales: hashes hexadecimales minúsculos; nonce de 16–128 caracteres; intento entero positivo; A/C con anchor y N con `reason_code`. No se eliminan extras firmados. Los tipos públicos exportados se conservan. Campos auxiliares presentes con tipos inválidos se rechazan; no se convierten ni se reparan silenciosamente.

**Estructura no equivale a verificación:** fechas interpretables, encabezados no vacíos, hashes calculados, snapshots históricos, cobertura, orden, ledger, identidad y estado del ciclo siguen comprobándose en el verificador/servicio. Un comprobante que pase JSON Schema puede seguir siendo `INVALID` o `INCOMPLETE`. La restricción **`runtime.platform = "ChatGPT"` permanece**; también permanece el formato visible vinculado a esa identidad. No falsificar ese campo desde Notion ni declarar portabilidad resuelta.

### Recorrido mínimo seguro y límites por cliente

1. Comprobar que el cliente admite un servidor remoto compatible con la implementación de transporte, descubrimiento de herramientas y un método de autorización admitido. No confundir que el cliente soporte MCP con que Khora lo admita efectivamente.
2. Configurar el recurso canónico. Los metadatos se descubren en `/.well-known/oauth-protected-resource` y `/.well-known/oauth-authorization-server`. OAuth usa PKCE; el Bearer manual existente solo se incorpora en un campo privado de credenciales, nunca en un mensaje, URL, ejemplo o repositorio.
3. Solicitar permisos mínimos **efectivos** para la familia elegida, incluido el ciclo. No conceder los tres por defecto únicamente para obtener salud global verde. La identidad/consentimiento no se automatizan por sustitución del operador.
4. Tras autenticar, ejecutar `tools/list` y contrastar sus quince nombres y esquemas. Una respuesta HTTP o los metadatos públicos no equivalen a este paso autenticado.
5. En un cliente cuyo contexto normativo sea legítimamente admitido: abrir turno, consumir snapshots, realizar la tarea sustantiva con los controles, registrar principios en el orden impuesto, verificar el comprobante y liberar solo tras `VERIFIED`. Los rechazos conservan su evidencia; seguir el intento/token que emita el servidor. No inventar tokens, hashes, snapshots ni una prueba de comprensión.
6. Para un volcado autorizado, conciliar inventario/paginación y versiones, leer el texto, revisar errores de descifrado y comprobar integridad sin publicar contenido sensible. Buscar puede omitir filas ilegibles; el historial puede degradarse a vacío ante errores SQL. Ni un resultado vacío ni un extracto prueban recuperación exhaustiva. La cobertura dictado → volcado requiere conciliación independiente.

Los límites del servidor siguen vigentes: registro dinámico restringido a redirecciones de Notion admitidas; documentos de identidad de cliente limitados a ChatGPT. La ruta incorpora identidad ChatGPT en el ciclo. Eliminar esa dependencia o ampliar clientes es una decisión de seguridad/arquitectura **fuera de C007**, no una instrucción de configuración al usuario.

| Plataforma / recorrido | Estado de aceptación C007 | Qué falta |
|---|---|---|
| Notion | Pendiente de prueba autenticada; no acreditado en esta conversación | Conexión Khora disponible, autorización legítima, ciclo sin identidad falsificada, operación y lectura completas |
| ChatGPT | Identidad contemplada en código; conexión no verificada aquí | Autenticación, operación real, verificación/liberación y evidencia por versión de cliente |
| Segundo cliente independiente | No verificado | Identificar cliente/versionado y resolver decisiones de admisión/identidad antes de probar |
| Cliente SDK de prueba en memoria | Solo concordancia de contratos | No es prueba de un despliegue, OAuth, Postgres ni compatibilidad de una plataforma comercial |

No hay aún tiempo a primera operación válida ni cantidad demostrada de intervenciones iniciales/recurrentes. Registrar plataforma, versión, fecha, método y tamaño de muestra cuando exista la prueba real; no presentar duración de tests como fricción de instalación. No se ofrece configuración importable ni instalación de un clic sin soporte del cliente comprobado.

### Diagnóstico y recuperación

| Señal | Interpretación y recuperación segura |
|---|---|
| HTTP 503 | Configuración ausente o falta del acceso de lectura obligatorio en producción; revisar configuración del despliegue sin revelar valores |
| HTTP 401 y `WWW-Authenticate` | Bearer ausente/inválido, audiencia/issuer o generación revocada; autenticar por el flujo admitido, no desactivar validaciones |
| `insufficient_scope` | Falta el permiso de la operación; comprobar concesión y dependencia normativa, solicitar solo lo necesario |
| `NORMATIVE_TURN_REQUIRED` | Token/ciclo/runtime no válido; abrir/reabrir mediante el servicio, no reutilizar un token cerrado o de otro intento |
| Error de esquema | Comparar entradas con `tools/list`, incluidos receipt.output, versión y controles; no fabricar evidencia para satisfacerlo |
| `INVALID` / `INCOMPLETE` | Leer razones, conservar intento y corregir causa; no declarar cierre ni saltar ledger |
| Estado obsoleto / historial vacío | Consultar frescura y errores; no deducir ausencia de actividad ni integridad del corpus |
| Autorización o identidad de cliente no admitida | Detener ese recorrido y documentar incompatibilidad/bloqueo; no añadir redirecciones ni identidad falsa para forzar éxito |

La revocación por generación y la caducidad permanecen en la autenticación existente. La prueba negativa con credenciales revocadas deberá usar alcance de prueba autorizado; esta revisión no revoca accesos productivos.

### Pruebas y reproducibilidad

Las pruebas `tests/unit/mcp_contract_concordance.test.ts` extraen las expresiones de esquema de las quince llamadas reales a `gatedTool`, comprueban el JSON serializado con un validador independiente y lo comparan con Zod; ejercitan campos obligatorios, evidencia condicional y extras. Una pareja SDK cliente/servidor en memoria anuncia y llama las quince herramientas con manejadores de prueba, rechazando un comprobante sin output antes del manejador. Un caso invoca además el verificador real con entrada malformada y exige que no acceda a red. `mcp_tool_auth_metadata.test.ts` conserva cobertura de permisos/publicación y presencia de controles. El parser normativo existente se ejecuta como regresión.

Resultado y entorno exactos de C007 se registran en el [sprint existente](../../docs/SPRINT-MCP-OBSERVABILIDAD-DICTADO.md). La comprobación dirigida aislada no sustituye el typecheck/build completo ni la suite integral, y los manejadores de prueba no acreditan permisos, revocación, persistencia o lectura de datos reales. La aceptación multiplataforma permanece abierta.
