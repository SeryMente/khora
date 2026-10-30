# Control de acceso de Jules por sujeto, fuente y rama

## Regla de autorización

Los scopes `jules:read` y `jules:write` habilitan por separado las herramientas de lectura y escritura.

- **Propietario/desarrollador único:** el sujeto autenticado coincide exactamente (sin distinguir mayúsculas/minúsculas) con `MCP_ALLOWED_EMAIL`. Puede operar sobre todas las fuentes y ramas que la cuenta configurada en `JULES_API_KEY` tenga disponibles. No necesita altas manuales en la ACL por repositorio o rama. Este acceso no amplía los permisos reales de la cuenta Jules del proveedor.
- **Cualquier sujeto adicional:** requiere concesión activa exacta `subject + source + branch + capability` en `khora_private.jules_source_acl`; sin fila, con contexto incompleto, consulta fallida o discrepancia, se deniega.

- Para el propietario, `sub` OAuth o el propietario del token manual se compara con `MCP_ALLOWED_EMAIL`; esta es una identidad de aplicación ya autenticada, no un campo proporcionado por el argumento de la herramienta.
- Para cualquier otro sujeto: `subject` se obtiene de `sub` OAuth o del propietario del token manual; coincidencia exacta.
- `source`: nombre de recurso literal de Jules, por ejemplo `sources/github/owner/repo`.
- `branch`: nombre de rama exacto, sensible a la grafía y sin normalización.
- `read_allowed` / `write_allowed`: capacidades separadas. El permiso de escritura no se deduce del de lectura ni viceversa.
- Solo las filas con `revoked_at IS NULL` participan para sujetos no propietarios. Sin fila, con contexto incompleto, consulta fallida o discrepancia: denegar.

## Almacenamiento y autoridad

La migración `033_jules_source_acl.sql` crea `khora_private.jules_source_acl`, fuera del esquema público/API. La ACL se conserva para sujetos adicionales; el servidor MCP no contiene herramientas para emitir ni modificar concesiones. La cuenta propietaria configurada es una excepción explícita de desarrollo y no requiere filas ACL.

El rol configurado en `KHORA_READONLY_DATABASE_URL` debe recibir únicamente `USAGE` sobre `khora_private` y `SELECT` sobre `khora_private.jules_source_acl`. No se debe suponer el nombre del rol, crearlo automáticamente, conceder permisos a `PUBLIC`, `anon` o `authenticated`, ni usar el pool de escritura para leer ACL. La asignación de permisos se realiza solo después de verificar el rol real que usa esa variable en el entorno autorizado. La migración no se aplica automáticamente.

## Uso directo del propietario/desarrollador

El propietario autenticado puede consultar fuentes, ramas, sesiones y actividades y crear sesiones, enviar mensajes y aprobar planes, siempre que el scope correspondiente esté presente. La fuente y la rama de creación se vuelven a comprobar contra `sources.get` de Jules. Para sesiones existentes se valida el contexto devuelto por el proveedor. Las herramientas Jules no requieren `norm:turn`; sus controles son `jules:read` o `jules:write`, identidad autenticada y reglas propias de la operación. `norm:turn` se reserva para las herramientas normativas Khora.

## Aplicación por herramienta

| Herramienta | Control adicional |
|---|---|
| `jules_list_sources` | Solo devuelve fuentes y ramas incluidas en concesiones de lectura; no publica ramas no autorizadas. |
| `jules_list_sessions` | Filtra sesiones por fuente y rama exactas; conserva el cursor del proveedor. |
| `jules_get_session` | Recupera el contexto de sesión y exige grant de lectura exacto antes de devolverlo. |
| `jules_list_activities` | Exige grant de lectura antes de listar actividades. |
| `jules_create_session` | Exige grant de escritura, consulta `sources.get`, valida el nombre y confirma la rama en `branches` o `defaultBranch` antes de crear. |
| `jules_send_message` | Relee la sesión, exige grant de escritura exacto y valida estado elegible. |
| `jules_approve_plan` | Relee sesión y plan dos veces; exige `plan_id` y `plan_sha256` coincidentes con el plan actual y `AWAITING_PLAN_APPROVAL`. El endpoint upstream solo aprueba el plan pendiente actual, sin parámetro condicional; la última lectura y el POST no son atómicos. |

## Escrituras ambiguas

Los reintentos automáticos se limitan a GET/HEAD. Los POST de creación, mensaje y aprobación no se reintentan en fallos de transporte ni respuestas 5xx: se devuelve `JULES_WRITE_RESULT_AMBIGUOUS`. El operador debe reconciliar la sesión/actividad antes de repetir una escritura. Un 429 se devuelve como rate limit, sin retry de POST.

## Operación y revocación

El cliente debe pasar el `plan_id` y `plan_sha256` que recibe en `planGenerated` a `jules_approve_plan`. El servidor vuelve a leer todas las páginas de actividades, comprueba ID y huella, relee sesión y plan por segunda vez y bloquea cualquier discrepancia. Jules documenta `approvePlan` como un POST de cuerpo vacío que aprueba el plan pendiente de la sesión; no documenta `plan_id`, ETag o condición `If-Match` en la solicitud. Por ello permanece una ventana de carrera entre la última lectura y el POST que solo el proveedor podría cerrar con una API condicional. Hasta disponer de esa garantía, T22 no se marca PASS. Para revocar se fija `revoked_at` y `revoked_by`; no se borran sesiones ni artefactos ya creados. Una revocación no invalida automáticamente otras fuentes/ramas ni modifica los grants OAuth del sujeto.

## Límites de prueba

Los tests del route fixture verifican el filtrado de herramientas, el bloqueo del proveedor con ACL fallida para sujetos adicionales, la excepción de propietario sin ACL ni `norm:turn` y el rechazo de un plan cuyo ID/huella cambian entre lecturas sintéticas. No prueban los privilegios del rol productivo ni la llamada real a Jules.
## Provisioning administrative (fuera de MCP)

Antes de emitir concesiones, verifica qué identidad exacta aparece en el claim `sub` del Bearer autorizado y qué rol Postgres usa realmente `KHORA_READONLY_DATABASE_URL`. Tras confirmar el rol, el propietario de la base puede conceder exclusivamente lectura del esquema privado:

```sql
-- Sustituye el rol solo después de verificar current_user en la conexión MCP.
GRANT USAGE ON SCHEMA khora_private TO verified_mcp_read_role;
GRANT SELECT ON TABLE khora_private.jules_source_acl TO verified_mcp_read_role;
```

Para una concesión inicial, el propietario registra el sujeto, el nombre literal de source, la rama exacta, capacidades independientes y quién concede:

```sql
INSERT INTO khora_private.jules_source_acl
  (subject, source, branch, read_allowed, write_allowed, granted_by)
VALUES
  ('<exact-oauth-subject>', 'sources/github/owner/repo', 'main', TRUE, FALSE, '<authorized-grantor>');
```

Para revocar, actualiza la fila activa y conserva su historial:

```sql
UPDATE khora_private.jules_source_acl
SET revoked_at = now(), revoked_by = '<authorized-revoker>'
WHERE id = <grant-id> AND revoked_at IS NULL;
```

No copies el contenido de secretos a la tabla ni uses comodines de source/rama. Las concesiones se administran con la conexión propietaria; el runtime MCP solo necesita SELECT y nunca tiene una herramienta de escritura de ACL.
## Observabilidad y redacción

El cliente sanea la ruta antes de emitir eventos: en los endpoints `sources/**` se reemplaza el recurso fuente completo por `/sources/:id`, evitando filtrar owner/repository; en `sessions/{id}` se reemplaza el ID por `/sessions/:id`, conservando el sufijo funcional como `/activities`. La ruta inválida se registra como `unknown`. No registrar nombres de repositorios privados, IDs de sesión, payloads ni claves.
