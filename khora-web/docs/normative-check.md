# Servidor MCP de Khora — documento canónico

**Estado:** propuesta en [revisión #296](https://github.com/SeryMente/khora/pull/296), no fusionada. **Base:** `dbc73afada1ad29abf46f4599d22cc3158a9a986`. Este documento reúne el contrato operativo del servidor multiuso; el [sprint](../../docs/SPRINT-MCP-OBSERVABILIDAD-DICTADO.md) conserva únicamente historia y evidencias. No acredita despliegue, recuperación completa ni compatibilidad no probada.

**Orientación:** [conexión](#conexión) · [catálogo](#catálogo) · [contratos](#contratos) · [ciclo](#ciclo-normativo) · [seguridad](#autorización-y-configuración) · [datos](#datos-y-efectos) · [diagnóstico](#diagnóstico) · [compatibilidad](#compatibilidad) · [pruebas](#pruebas-y-mantenimiento).

## Conexión

- **Producto:** Khora. **Protocolo:** Protocolo de Contexto de Modelos (MCP). **Componente:** un servidor multiuso, no uno por capacidad.
- **Recurso:** `https://khora-web.vercel.app/api/mcp`. GET/POST mediante transporte HTTP transmisible del SDK 1.30.0, sin identificador de sesión de transporte; el ciclo normativo sí persiste. No se acredita stdio ni un punto SSE separado.
- **Descubrimiento:** `/.well-known/oauth-protected-resource` y `/.well-known/oauth-authorization-server`; recurso, issuer y audiencia deben concordar. El SDK negocia su protocolo; la versión del paquete/servidor no es la versión negociada.
- **Petición:** Bearer en `Authorization`; JSON y aceptación de `application/json` / `text/event-stream` según el cliente. No poner credenciales en mensajes, URL, repositorio ni evidencias.

**Recorrido mínimo:** comprobar admisión real del cliente → configurar recurso → autorizar permisos efectivos mínimos → autenticar → descubrir `tools/list` → abrir ciclo → operar → registrar principios → verificar → liberar. Un Bearer manual no elimina los controles normativos ni demuestra compatibilidad.

Antes de ejecutar ese recorrido desde otra plataforma, resolver la identidad normativa: hoy el código impone **ChatGPT**, también en tokens, persistencia y formato visible. No suplantarla desde Notion. Cambiar identidad/admisión de clientes requiere aprobación específica; no forma parte de esta propuesta. No ofrecer instalación de un clic ni configuración importable sin soporte probado del cliente.

## Catálogo

`?` indica opcional; los demás campos son obligatorios. Toda herramienta sustantiva añade **`_norm_turn_token`** (mínimo 16 caracteres), **`_thinking_mode`** y **`_output_format_version`**. Modos: `THINKING`, `INSTANT`, `UNKNOWN`, `UNAVAILABLE`; no inventar una señal observada. La versión deriva de `REQUIRED_OUTPUT_FORMAT_VERSION`: **v1.7.6** en esta base. La gobernanza usa NORM-CHECK **v0.5.0**, verificador `norm-check/0.5.0`; servidor anunciado `khora-mcp` **1.3.0**. Son versiones distintas.

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

**Permisos efectivos:** las primeras seis herramientas requieren `volcados:read` **y** `norm:turn`; las cuatro de observabilidad, `runtime:read` **y** `norm:turn`. El permiso de negocio anunciado en `securitySchemes` se conserva; `norm:turn` es necesario para abrir/completar el ciclo, no una concesión implícita.

| Herramienta / propósito | Entradas (sin los tres controles sustantivos) | Permiso / salida y efecto |
|---|---|---|
| `khora_mcp_health` / diagnóstico de acceso completo | `thinking_mode`, `output_format_version` | Publica los tres permisos. Informa `ok`, `status`, `full_access`, `missing_scopes`, versiones/hashes o razón de indisponibilidad. Una concesión parcial produce `DEGRADED`, no prueba caída total ni exige ampliar permisos para una tarea parcial |
| `khora_norm_open_turn` / fijar ciclo y fuentes | `conversation_id?`, `turn_number?` entero positivo, `thinking_mode`, `output_format_version` | `norm:turn`; persiste/reutiliza turno, devuelve identidad, intento, token y snapshots; ver contrato ejecutable |
| `khora_norm_apply_principle` / registrar siguiente principio | `turn_token`, `folio` (`P` + tres dígitos), `status` (`A`/`N`/`C`), `anchor?`, `reason_code?` | `norm:turn`; ledger persistido, secuencia, total, siguiente principio, completitud; A/C requieren anchor válido y N razón válida |
| `khora_norm_verify_turn` / verificar y registrar | `turn_token`, `receipt` completo | `norm:turn`; `result`, `verification_record`, persistencia/cierre o siguiente intento; solo `VERIFIED` cierra |
| `khora_norm_release_turn` / liberar salida verificada | `turn_token` | `norm:turn`; `VERIFIED_RELEASE`, salida/hashes, token de liberación y caducidad; no libera un intento incompleto |

**No confundir capacidades:** listar/buscar no recupera verbatim; observabilidad no lee dictados; revisión devuelve representación, no una interfaz interactiva; salud diagnostica, no sustituye una operación. `DEGRADED` con permisos parciales no prueba caída total ni justifica conceder todos los permisos.

**Límites concretos:** listado/búsqueda usan límite predeterminado 20, máximo 100 y offset desde 0; la búsqueda omite filas que no puede descifrar. `eventos_desde` ordena por id ascendente y obtiene una fila adicional para calcular `hay_mas`; continuar con `cursor_siguiente`. Los eventos recientes no proporcionan una recuperación histórica exhaustiva. Severidades: `INFO/WARN/ERROR/CRITICAL`; resultados: `SUCCESS/FAILURE/PARTIAL/SKIPPED/PENDING`. La observación puede agregar sesiones activas fuera del filtro: no presentar `session_id` como aislamiento global. Estado con más de 15 segundos es obsoleto, no prueba de sesión cerrada.

## Contratos

**Fuente ejecutable única:** cada forma Zod registrada en [route.ts](../app/api/mcp/route.ts) genera el JSON Schema de `tools/list` mediante [mcp-tool-contract.ts](../lib/server/mcp-tool-contract.ts). No mantener una lista manual paralela. Publicación exterior: `additionalProperties: false`; una llamada directa al SDK elimina claves exteriores desconocidas en lugar de rechazarlas. El comprobante conserva extras, incluso anidados: no eliminar evidencia firmada.

El comprobante `receipt` se comparte con el verificador mediante [normative-receipt-schema.ts](../lib/server/normative-receipt-schema.ts). Todos estos campos son obligatorios:

| Campo | Contrato estructural |
|---|---|
| `protocol`, `protocol_version` | `NORM-CHECK`, `v0.5.0` |
| `cycle` | `id` no vacío; `attempt` entero ≥1 |
| `si` | `version`; `git_commit_sha` y `git_blob_sha` hexadecimales minúsculos de 40; `sha256` y `manifest_sha256` de 64 |
| `methodology` | `version`; commits/blobs de 40 y `sha256` de 64 |
| `input_sha256`, `output_sha256`, `evidence_sha256` | Hexadecimales minúsculos de 64 |
| `nonce` | Cadena de 16–128 caracteres |
| `principles` | Lista no vacía; `folio` y estado `A/N/C`; A/C exige `anchor` conforme a `^[A-Za-z][A-Za-z0-9._:-]{0,63}$`; N exige `reason_code` conforme a `^[A-Z0-9_:-]{1,32}$` |
| `output` | Texto candidato completo, no vacío; no un extracto ni un comprobante |
| `output_header`, `methodology_output_header` | Al menos 32 caracteres no blancos tras trim en la validación básica |
| `created_at` | Cadena ≥10 caracteres e interpretable por Date.parse |
| `runtime` | `platform = ChatGPT`, modo admitido y versión de salida vigente |

Los extras permitidos no sustituyen campos obligatorios ni se convierten silenciosamente. `cycle.id` solo blanco, fechas inválidas y encabezados blancos se rechazan semánticamente aunque un JSON Schema estructural pueda admitirlos. Los tipos públicos exportados se conservan; un campo auxiliar presente con tipo inválido no se repara.

**Ejemplos válidos sin secretos:** `input(name)` y `receipt()` en [mcp_contract_concordance.test.ts](../tests/unit/mcp_contract_concordance.test.ts) generan entradas completas para las quince herramientas y se prueban contra publicación y registro reales. Son fixtures sintéticos ejecutables en aislamiento: sus tokens/hashes no autorizan uso productivo ni acreditan un ciclo verificado. La estructura exacta evoluciona en el esquema, no en copias de JSON en guías.

## Ciclo normativo

1. **OPEN:** `khora_norm_open_turn` fija SI (Sistema de Instrucciones) y metodología de `SeryMente/metodologia`, contrastando H1 → lectura → H2; solo acepta snapshot estable. Emite identidad de ciclo, intento, nonce, token, manifiesto y encabezados. Token de turno: 12 horas según la implementación.
2. **TAREA:** las diez herramientas sustantivas verifican actor, ciclo, intento, nonce, snapshot y contexto de runtime antes de invocar el servicio. Los tres controles se retiran antes de pasar argumentos al manejador de negocio.
3. **APLICACIÓN:** `khora_norm_apply_principle` persiste el siguiente folio en el orden canónico; no admite saltos/reordenación. A=aplicado, N=no aplicable, C=conflicto resuelto. Las condiciones de anchor/razón también se comprueban en el servicio.
4. **VERIFY:** bloquea turno, coteja ledger completo/ordenado con receipt, calcula hashes y valida fuentes históricas, cobertura (faltantes, duplicados, desconocidos), encabezados y salida. Solo `VERIFIED` cierra; `INVALID/INCOMPLETE` conserva el intento y prepara el siguiente. No reutilizar token de intento anterior/cerrado.
5. **RELEASE:** solo tras verificación consistente libera salida/hash, orden y comprobante; emite `VERIFIED_RELEASE` y token de liberación de cinco minutos. No es permiso para saltar verificación en otro ciclo.

**Persistencia:** `normative_turns` mantiene turno/ledger; `normative_receipts`, intentos. `(cycle_id, attempt)` es único: no sobrescribir rechazos; existe respuesta idempotente para intentos ya guardados. El bootstrap/migraciones existentes se conservan; no se aplica ninguna migración por esta propuesta.

**Registro de salida:** `verification_record` es una proyección de `normative_receipts`, no otra fuente persistida. `schema = cycle-verification/v1`; incluye `cycle_id`, `attempt`, `status`, `evidence_sha256`, `si_version`, `si_git_commit_sha`, `si_sha256`, `manifest_sha256`, `methodology_version`, `methodology_git_commit_sha`, `order_verified`, `application_log_sha256`, `verifier_version`, `recorded_at`, `receipt_id` (nullable). Primer almacenamiento y respuesta idempotente lo conservan. Contrato: [norm-check.ts](../lib/server/norm-check.ts), `buildCycleVerificationRecord`.

**Límite:** un comprobante estructural no prueba comprensión ni corrección semántica profunda. La salida canónica de seis líneas y su identidad literal se validan en [normative-output.ts](../lib/server/normative-output.ts). El servidor bloquea herramientas, no el texto nativo del cliente: una garantía de cierre conversacional exige un runtime/adaptador que controle ese bucle. Si Khora no está disponible, no inventar verificación positiva.

## Autorización y configuración

OAuth usa PKCE; los metadatos anuncian authorization_code, refresh_token y offline_access. La renovación depende también del cliente. `KHORA_API_KEY` es compatibilidad servidor-a-servidor, no credencial de usuario/modelo. Los Bearer de OAuth validan firma, issuer, audiencia, actor, scopes y generación; los manuales validan hash, recurso, vigencia, revocación individual y generación. No basta que un token tenga formato correcto. El challenge inicial anuncia runtime:read; no representa el conjunto mínimo efectivo de todas las herramientas.

| Configuración del servidor | Uso; valores nunca incluidos en este documento |
|---|---|
| `MCP_CANONICAL_URL` | Recurso exacto; de su origen se deriva issuer |
| `MCP_OAUTH_CLIENT_ID`, `MCP_OAUTH_CLIENT_SECRET` | Cliente preconfigurado; secreto solo en el servidor |
| `MCP_OAUTH_REDIRECT_URIS` | Redirecciones separadas por comas |
| `MCP_JWT_SECRET` | Firma/verificación; jamás sustituir con claves de ejemplo |
| `MCP_ALLOWED_EMAIL` | Identidad autorizada |
| `KHORA_READONLY_DATABASE_URL` | Acceso de lectura; obligatorio en producción para esta ruta |

`getMcpConfig()` devuelve null si falta configuración obligatoria o la URL no es válida; la ruta responde 503. Los valores de fallback se limitan al modo de prueba; no activar ese modo como arreglo productivo. La configuración no demuestra por sí sola que el rol SQL tenga privilegios correctos: comprobarlos en el entorno autorizado.

**Admisión:** cliente estático configurado; registro dinámico con redirecciones HTTPS en notion.com/notion.so y sus subdominios; documentos de identidad HTTPS específicos de chatgpt.com. No ampliar listas para forzar una prueba. El descubrimiento anuncia autorización en `/oauth/authorize`, tokens en `/api/oauth/token` y registro en `/api/oauth/register`; contrastar siempre metadatos del despliegue.

**Bearer manual:** se emite en el Control MCP existente, una sola vez en claro; almacena hash/prefijo. Scopes no vacíos, admitidos y sin duplicados; caducidad 30/90/365 días, predeterminada 90. Puede revocarse individualmente; la generación global invalida manuales y OAuth. Autenticar actualiza `ultimo_uso_en`: no es una lectura sin efectos. Nada de esto se modifica aquí.

## Datos y efectos

| Familia | Fuente y efectos que deben distinguirse |
|---|---|
| Contenido/revisión | `volcado`, versiones y auditoría; descifrado de texto/HTML real autorizado. Lectura del corpus, no prueba de cobertura de toda captura/dictado |
| Observabilidad | `khora_runtime_state` y `eventos_sistema`; tiempos, sesiones y eventos persistidos, no telemetría privada de la mente/ventana del modelo |
| Gobernanza | Fuentes versionadas de metodología, turnos/ledger y comprobantes; lecturas históricas, caché por blob y escrituras normativas |
| Envoltura de servicio | Eventos de llamada con operación, correlación, resultado, duración y razón; no incluir payloads/secretos. Middleware HTTP y bridge FastAPI conservan trazabilidad en los almacenes existentes |
| Autenticación | Consulta de generación y token; actualización de uso del manual. No confundir sufijo `read` del permiso con ausencia total de escrituras |

**Recuperación íntegra:** conciliar inventario/páginas → resolver identificadores → consultar versiones → leer texto completo autorizado → revisar descifrado/errores → conciliar lo recibido e integridad. El historial puede degradarse a vacío ante errores SQL; un vacío no acredita ausencia de versiones. Una búsqueda omite contenido ilegible. No publicar dictados, HTML autobiográfico ni muestras sensibles en el repositorio. Corroborar por separado captura/transcripción → volcado: no toda captura está necesariamente en esa tabla.

**Superficies existentes:** Seguridad → Control MCP (`/sistema/mcp`): OAuth, tokens, scopes y revocación; Sistema → Evidencia normativa (`/sistema/otros`): últimos 50 comprobantes, totales, detalle y verificación manual; Sistema → Registro (`/sistema/registro`): observabilidad. REST legado GET/POST `/api/norm-check` no es otro servidor MCP. No se rediseñan estas interfaces.

## Diagnóstico

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

La revocación negativa debe probarse con credenciales de prueba y alcance autorizado, nunca revocando accesos productivos para obtener evidencia.

### Auditoría de resultados y tokens · 2026-10-16

**Estado: diagnóstico confirmado; correcciones de runtime NO implementadas.** Base auditada: `dbc73afada1ad29abf46f4599d22cc3158a9a986`. Desde Notion se registró la conexión, se descubrieron las quince herramientas y una llamada real a salud devolvió `UNAVAILABLE`, `missing_scopes: []`, `reason: SI_MAIN_FETCH_404`. Esto acredita acceso a la comprobación, no lectura de dictados, ciclo completo ni revisión exacta del despliegue.

**Tres credenciales distintas:** (1) Bearer OAuth/manual para acceder a Khora, incluido `volcados:read`; (2) `turn_token` emitido por Khora tras abrir el ciclo; (3) credencial del servidor para leer GitHub privado. No son intercambiables. `SeryMente/metodologia` existe, es privado y su `main` contiene `SI-METACOGNITIVO.md` y `METODOLOGIA.md`, comprobado por la conexión GitHub autorizada. En `norm-check.ts`, las consultas de revisión, contenido, historial y blobs salen sin `Authorization`: esta ruta no consume `GITHUB_TOKEN`, aunque otras partes del repositorio sí lo usan. El primer 404 ocurre en `/commits/main`, no al leer dictados ni necesariamente al localizar el archivo. No se inspeccionaron valores secretos ni configuración desplegada; no se conoce la presencia, vigencia o alcance de una credencial GitHub en producción. La conexión GitHub del agente no se transmite automáticamente al servidor Khora.

| Capa / resultados inventariados | Defecto observado / criterio de corrección pendiente |
|---|---|
| Descubrimiento, transporte y configuración | Conservar códigos de protocolo, negociación y challenge; diferenciar JSON/esquema/método/aceptación, configuración y fallo interno. El SDK cubre parte del transporte: no llamar validado a lo no probado |
| Bearer OAuth/manual y renovación | La entrada colapsa varias causas en 401; `verifyJwtDetailed` ya distingue errores que `verifyJwt` pierde. El manual agrupa ausencia, caducidad y revocación. Mantener respuestas públicas resistentes a enumeración y razones seguras correlacionadas en diagnóstico autorizado; no revelar existencia de tokens |
| Registro/consentimiento OAuth y tokens manuales | Mantener `invalid_client`, `invalid_grant`, etc. y HTTP/challenges; errores de cuerpo, origen, campos y dependencias deben tener acción segura. No publicar secretos, cuentas esperadas, URL internas ni mensajes de excepción crudos |
| Permisos y normativa | Separar permiso faltante, token ausente/inválido/caducado/revocado, ciclo cerrado/intento obsoleto, identidad/formato, orden y evidencia. No recomendar reabrir en todos los casos; `conversation_id` y `turn_number` deben llegar juntos o ninguno |
| GitHub / fuentes normativas | `SI_MAIN_FETCH_404` omite dependencia, operación y autenticación ausente; no tiene tiempo límite explícito en esas consultas. Distinguir HTTP, red, tiempo agotado, límite de peticiones, payload, referencia, contenido e integridad; un 404 externo no prueba inexistencia |
| Listado, lectura y búsqueda | Listado/lectura actual señalan descifrado, pero la lectura histórica devuelve un texto centinela sin bandera y buscar omite ilegibles. Señalar parcialidad, elementos afectados y cobertura; no confundir cero coincidencias con corpus íntegramente buscado |
| Versiones/auditoría | Dos capturas de cualquier error SQL devuelven `[]`; distinguir vacío confirmado de consulta fallida, sin exponer SQL ni cadenas de conexión |
| Revisión y observabilidad | Revisión devuelve objetos `error` envueltos sin `isError`; pueden registrarse como éxito. Distinguir pantalla inválida, fallo HTTP/red/renderizado y estado ausente/obsoleto; lo obsoleto no es caída ni sesión cerrada |
| Verificación/liberación | Conservar `VERIFIED`, `INVALID`, `INCOMPLETE` y sus razones, intento y efectos persistidos; un rechazo funcional no equivale a excepción de transporte ni autorización de salida |
| Telemetría e inesperados | La envoltura clasifica solo `isError` y registra a veces `Error` como razón. Unificar resultado y correlación, distinguir resultado de negocio/persistencia; causa desconocida explícita, sin inventarla ni devolver stack/payload privado |

**Contrato propuesto, pendiente de revisión específica:** todos los resultados deben distinguir éxito con datos, vacío confirmado, parcial/incompleto, obsoleto/ausente, rechazo/bloqueo y fallo. Para cada problema: `code` estable, `message` claro, `stage`, `operation`, `dependency` cuando corresponda, evidencia segura observada, `retryable`, acción de recuperación y `correlation_id`; declarar impacto/efectos conocidos y cobertura si es parcial. Usar un registro único por familia de códigos, compartido por cliente y telemetría; no duplicar cadenas ni romper formatos MCP/OAuth. Un inesperado usa fallback seguro con causa no determinada e identificador rastreable; no prometer adivinar fallos no observables.

**Aceptación de la corrección:** probar cada rama inventariada, las quince herramientas y límites compartidos; incluir datos/cero/ilegibles/parcial, falta de permisos, credencial caducada/revocada de prueba, turnos/recibos, errores de red/tiempo/límite/servicio/SQL y mensajes hostiles con secretos sintéticos. Comprobar flags, códigos, HTTP/challenges, acciones, correlación, redacción y no-filtración, además de compatibilidad de clientes. Fallar si una rama conocida queda sin clasificar o un fallo parcial se presenta como recuperación completa. La revisión estática no acredita ejecución de todas esas ramas.

**Evidencia de esta auditoría:** cuatro reproducciones locales causales, con código real y límites externos sintéticos: consulta normativa sin autenticación, búsqueda incompleta presentada como vacía, errores de versiones/auditoría convertidos a vacío y fallo de descifrado histórico sin bandera. Confirman defectos existentes, no correcciones ni acceso productivo. Pendiente aprobar el contrato público/privado de diagnóstico y el uso de credencial servidor con lectura mínima del repositorio normativo; no cambiar permisos, identidad, redirecciones ni compuertas por esta auditoría.


## Compatibilidad

| Recorrido | Estado demostrado | Pendiente |
|---|---|---|
| Notion | Conexión registrada, catálogo descubierto y salud invocada; `SI_MAIN_FETCH_404`, sin scopes faltantes reportados | Recuperación GitHub privada, identidad normativa legítima, tarea completa y lectura de dictados |
| ChatGPT | Identidad contemplada; conexión no probada en esta revisión | Cliente/versionado, autenticación, operación, verificación y liberación reales |
| Segundo cliente independiente | No verificado | Identificar cliente y resolver admisión/identidad aprobadas antes de probar |
| SDK HTTP aislado | Ruta real y transporte real con dependencias externas sustituidas | No prueba criptografía, OAuth, base de datos ni plataforma comercial |

**Aceptación abierta:** conexiones reales Notion + otro cliente; comprobaciones integrales; persistencia y recuperación completas; permisos insuficientes/revocación controlados; concordancia de revisión desplegada. Medir tiempo hasta primera operación válida, intervenciones iniciales y recurrentes, campos, fallos y recuperación; registrar plataforma/versión, fecha, método, muestra y evidencia. No existe aún línea base real de fricción. HTTP público, código, tools/list, llamada autenticada y recuperación íntegra son evidencias diferentes.

## Pruebas y mantenimiento

Las pruebas cargan el archivo real de la ruta, ejecutan registro, guardas y transporte HTTP del SDK; sustituyen identidad/almacenamiento/servicios externos mediante una lista cerrada de dependencias que rechaza imports inesperados. No reconstruyen `withNormTurn` ni la lista de excepciones. Un validador JSON Schema independiente coteja la publicación con Zod, incluidos campos obligatorios anidados y evidencia condicional. Los rechazos comprueban que no se alcanza el servicio.

Con dependencias del lockfile instaladas, ejecutar desde `khora-web`:

```sh
node --import tsx --test tests/unit/mcp_contract_concordance.test.ts tests/unit/mcp_tool_auth_metadata.test.ts tests/unit/norm_check_parser.test.ts
```

La prueba documental coteja las quince filas contra el catálogo ejecutable y comprueba versión/enlace desde README. Resultados y entorno del último ciclo: [Addendum C007](../../docs/SPRINT-MCP-OBSERVABILIDAD-DICTADO.md). No sustituye `npm run typecheck`, compilación/suite integrales ni pruebas autenticadas del despliegue. GitHub negó acceso a check-runs; las vistas previas de proveedores quedaron bloqueadas por sus planes. El escáner remoto no estaba habilitado: revisión local acotada no es certificación exhaustiva.

**Regla de mantenimiento:** cambio de herramienta/entrada → misma forma Zod y catálogo → pruebas positivas/negativas → evidencia versionada. Cambios de permisos, admisión, identidad o experiencia requieren presencia/aprobación específica; no esconderlos en un refactor documental. No fusionar ni desplegar por la aprobación de este borrador.

**Mapa de implementación:**
- [Ruta y registro](../app/api/mcp/route.ts) → [metadatos/esquemas](../lib/server/mcp-tool-contract.ts).
- [Configuración y admisión](../lib/server/mcp-config.ts) → [tokens manuales](../lib/server/mcp-manual-token.ts).
- [Contenido](../lib/server/mcp-tools.ts) · [revisión](../lib/server/mcp-ui-review.ts) · [observabilidad](../lib/server/mcp-observability.ts).
- [Servicio normativo](../lib/server/mcp-normative.ts) → [estructura compartida](../lib/server/normative-receipt-schema.ts) → [verificador/registro](../lib/server/norm-check.ts) → [formato visible](../contracts/FORMATO-REGISTRO-VERIFICACION-CICLO.schema.json).
- [Especificación metodológica](https://github.com/SeryMente/metodologia/blob/main/ESPECIFICACION-EVIDENCIA-NORMATIVA-POR-CICLO.md): autoridad externa versionada, no otro manual de conexión.
