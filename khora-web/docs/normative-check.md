# NORM-CHECK en KHORA

**Estado:** IMPLEMENTACIÓN INICIAL  
**Versión:** v0.2.0 — MCP multiuso + ciclo normativo  
**Fecha:** 2026-10-06

## Superficie

- UI: /sistema/otros
- MCP canónico multiuso: `/api/mcp`
- Herramientas MCP normativas: `khora_norm_open_turn`, `khora_norm_verify_turn`
- REST legado/manual: GET/POST `/api/norm-check`
- Persistencia: normative_receipts
- Verificador: khora-web/lib/server/norm-check.ts

El acceso de plataformas se concentra en un único recurso MCP: `/api/mcp`. OAuth identifica al cliente y los scopes limitan capacidades; no existe un servidor MCP separado para gobernanza. `KHORA_API_KEY` queda reservado para compatibilidad servidor-a-servidor y nunca se entrega al modelo ni a la UI. El mismo `/api/mcp` admite además un Bearer Token manual generado por KHORA para clientes que no puedan completar OAuth.

## MCP multiuso\n\nLa misma entrada MCP expone las capacidades existentes de Cora/KHORA —volcados, runtime, revisión— y las capacidades normativas. El recurso no se duplica por función.\n\nScopes vigentes:\n\n- `volcados:read` — lectura de volcados y revisión.\n- `runtime:read` — observabilidad del runtime.\n- `norm:turn` — apertura y verificación del ciclo normativo.\n\nUna plataforma puede solicitar uno o varios scopes sobre el mismo `/api/mcp`. Para plataformas con soporte OAuth se usa OAuth 2.0 + PKCE; como alternativa, el operador puede generar desde `/sistema/mcp` un Bearer Token manual con scopes y caducidad, copiarlo y colocarlo en el campo de credencial de la plataforma. KHORA almacena solo su hash y la revocación global por generación lo invalida junto con los tokens OAuth.\n\n## Flujo de máquina

1. El cliente obtiene el snapshot vigente con `GET /api/norm-check?mode=snapshot` usando `X-KHORA-KEY`.
2. El snapshot devuelve versión, blob SHA, SHA-256, manifest SHA-256 y la totalidad dinámica de principios.
3. Al cerrar el ciclo, el cliente envía el Cycle Receipt a `POST /api/norm-check`.

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

## Interfaz

«Otros» se abre desde el botón Sistema de la barra inferior. La pantalla permite:

- consultar los últimos 50 comprobantes;
- ver totales VERIFIED/INVALID/INCOMPLETE;
- abrir el detalle de un comprobante;
- pegar un receipt JSON y solicitar la verificación server-side.

## Flujo normativo por MCP\n\n1. `khora_norm_open_turn` fija el snapshot del SI y emite un token de turno.\n2. El modelo ejecuta la tarea con ese snapshot.\n3. `khora_norm_verify_turn` valida el receipt y persiste el intento.\n4. Solo `VERIFIED` marca el turno como cerrado en KHORA.\n5. `INVALID` e `INCOMPLETE` dejan el turno abierto y avanzan `attempt`.\n\nEl mismo endpoint MCP sirve para el resto de capacidades de Cora/KHORA; no se crea una segunda entrada normativa. El transporte Bearer puede proceder de OAuth o de un token manual gestionado por KHORA.\n\n## Enforcement del ciclo por MCP

Las herramientas MCP sustantivas de KHORA están protegidas por un gate de ciclo. Cada llamada requiere `_norm_turn_token` emitido por `khora_norm_open_turn`; KHORA valida que el token corresponda al actor, ciclo, intento, nonce y snapshot exactos antes de ejecutar la herramienta.

Después de `VERIFIED`, el ciclo queda `CLOSED` y el token deja de ser reutilizable. Tras `INVALID` o `INCOMPLETE`, el intento cambia y el token anterior deja de ser válido; el cliente debe abrir/usar el nuevo attempt.

El servidor MCP también publica instrucciones operativas para que el cliente ejecute `OPEN → tarea → VERIFY`, pero esas instrucciones son una guía del protocolo. Un servidor MCP remoto no puede impedir técnicamente que una interfaz de chat nativa produzca texto sin llamar primero a una herramienta. La garantía fuerte de “ningún turno sin verificación” requiere un runtime/adaptador que controle ese loop y bloquee el cierre hasta `VERIFIED`.

## Límite

La comprobación estructural es determinista. La auditoría semántica profunda no forma parte del fast path y podrá añadirse después.

## Vínculo canónico

Especificación metodológica: SeryMente/metodologia/ESPECIFICACION-EVIDENCIA-NORMATIVA-POR-CICLO.md
