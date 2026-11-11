# R7 · Contratos OAuth/MCP: identidad ligada al titular y ausencia de escritura CUSTODIA

**Fecha:** 2026-11-11  
**Frente/tarea:** CUSTODIA / CUSTODIA-01  
**Objetivo del ciclo:** comprobar si los mecanismos OAuth/MCP existentes ofrecen identidad delegada de titular y una herramienta con permiso de archivo canónico.  
**Resultado:** el contrato vigente ofrece lectura de Volcados/runtime, ciclo normativo y escritura externa de Jules; no ofrece scopes/herramientas de Custodia ni escritura de Volcados. La emisión de tokens requiere sesión NextAuth del titular. El MCP normativo permanece desactivado y no se invocó.

## 1. Contratos y blobs cotejados en `main`

Commit de referencia: `c708901caa2500eb48d6723b709cee7db0d9904b`.

| Archivo | Blob SHA | Hallazgo |
|---|---|---|
| `khora-web/lib/server/mcp-tool-contract.ts` | `65e12aa8bf22b87bd9a193e50f08c17721815dca` | 24 herramientas; scopes `volcados:read`, `runtime:read`, `norm:turn`, `jules:read`, `jules:write`. No hay `custodia:*`, `volcados:write` o `dictado:write`. |
| `khora-web/app/api/mcp/route.ts` | `0b103032fcd3df22531b0438d5a94b4a47aa9948` | Valida actor, generación, issuer/audience y scopes; no expone handlers de archivo primario. |
| `khora-web/lib/server/mcp-tools.ts` | `b6b0d4c8e740d661b73406786b503eec25994d9f` | Herramientas de consulta de Volcados usan `getMcpReadOnlyDb()`, con SQL SELECT y descifrado solo para lectura. |
| `khora-web/lib/server/mcp-db.ts` | `364ba7691ff73184b21b803dce4c1422068366a0` | En Production exige `KHORA_READONLY_DATABASE_URL`; existe la entrada de esa variable en metadatos de Production. |
| `khora-web/lib/server/mcp-manual-token.ts` | `1d51f8aca2c0fb139593d2478d6eb3c620e46c89` | Scopes manuales permitidos: lectura runtime/Volcados, normativo y Jules read/write; no archivo CUSTODIA. Token ligado al campo `usuario`. |
| `khora-web/app/api/mcp/manual-token/route.ts` | `b6b0ae69c3b8948e880a45d7bfe476f418e7bba6` | GET/POST/DELETE exige sesión NextAuth; POST toma el usuario exclusivamente de `auth()`. |
| `khora-web/app/oauth/authorize/page.tsx` | `3772ff87cda67db7a3a16b1f473b0a7b1c6cce00` | OAuth exige sesión NextAuth y coincidencia con `MCP_ALLOWED_EMAIL`; scopes permitidos no incluyen archivo. |
| `khora-web/app/api/oauth/token/route.ts` | `184cfe2542f870626f75184e6b83b13ac839739c` | Intercambio Authorization Code + PKCE/refresh; scopes aceptados no incluyen escritura de dictados. |

## 2. Matriz de herramientas y scopes activos

Las herramientas para listar/leer audio y Volcados usan `volcados:read`. Las herramientas de telemetría usan `runtime:read`; las normativas usan `norm:turn`; Jules tiene herramientas de lectura/escritura externa con `jules:read`/`jules:write`.

El código declara 24 herramientas y una matriz explícita. No hay nombre de herramienta que llame a `guardarDictado()` o `archivarVolcado()`, ni tool para crear un Volcado desde `dictado_checkpoint`, vincularlo a `dictado_session` o materializar un manifiesto. `mcp-tools.ts` usa la base de datos de lectura y no implementa INSERT de archivo.

Las propuestas/documentos históricos mencionan `custodia:metadata:read` y `custodia:integrity:verify`. Esos nombres no figuran en la matriz activa `MCP_TOOL_SCOPES`, ni en scopes soportados por OAuth o tokens manuales. Son antecedentes/propuestas, no permisos productivos vigentes. Tampoco se encontró scope de recuperación/escritura CUSTODIA.

## 3. Vínculo de tokens con el titular

- La pantalla OAuth lee `auth()` y exige que el email coincida con `MCP_ALLOWED_EMAIL`; el usuario consiente scopes. Authorization Code/PKCE transporta ese sujeto al `sub` del JWT.
- El endpoint de tokens manuales obtiene el mismo email mediante NextAuth. No acepta un `usuario` libre en el cuerpo HTTP; el servidor lo toma de la sesión y lo pasa a `createManualMcpToken()`.
- Los tokens manuales se ligan a `usuario`, recurso canónico, scopes y generación de revocación. No hay actor de servicio genérico que represente automáticamente al dueño.
- Un bearer de lectura no confiere el rol de propietario de una sesión, ni autoriza `guardarDictado()`.

## 4. Límite y no-acciones

MCP normativo permanece **DESACTIVADO** conforme a la instrucción vigente. Este ciclo fue inspección estática de archivos versionados y metadatos de configuración; no se invocó `/api/mcp`, OAuth, el endpoint de tokens manuales o herramientas MCP. No se creó token, no se consultaron tokens emitidos en Neon, no se recuperó cookie, no se usó RDC/Chrome/monitor y no se leyeron secretos.

No hubo llamadas de escritura, Volcados nuevos, cambios de código de producto, scopes, variables, permisos o deployment.

## 5. Dictamen

OAuth/MCP no ofrece una identidad de servicio no interactiva para archivo CUSTODIA. La autorización del actor deriva de una sesión NextAuth del mismo titular; los scopes activos permiten lectura de Volcados/runtime y escritura Jules, no la creación de Volcados. Los scopes CUSTODIA que aparecen en historial no están implementados en el contrato activo.

No es correcto emitir un token de lectura y tratarlo como permiso de archivo, ni ampliar scopes o crear actor de servicio dentro de CUSTODIA-01 sin diseño/autorización separados. El único escritor canónico continúa siendo `POST /api/dictado` con NextAuth, `reclamarSesion()` y `guardarDictado()`.

**Estado sin cambio:** 95 sesiones atribuibles, 16 ya enlazadas excluidas, 79 sin Volcado; 1.039 partes de audio por metadata (785 B2/254 Blob), 29 checkpoints textuales potencialmente significativos y 216 fragmentos locales preservados. Cero Volcados nuevos. CUSTODIA-01 permanece EN CURSO.
