# NORM-CHECK en KHORA

**Estado:** IMPLEMENTADO  
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

## MCP multiuso\n\nLa misma entrada MCP expone las capacidades existentes de Cora/KHORA —volcados, runtime, revisión— y las capacidades normativas. El recurso no se duplica por función.\n\nScopes vigentes:\n\n- `volcados:read` — lectura de volcados y revisión.\n- `runtime:read` — observabilidad del runtime.\n- `norm:turn` — apertura y verificación del ciclo normativo.\n\nUna plataforma puede solicitar uno o varios scopes sobre el mismo `/api/mcp`. Para plataformas con soporte OAuth se usa OAuth 2.0 + PKCE; como alternativa, el operador puede generar desde `/sistema/mcp` un Bearer Token manual con scopes y caducidad, copiarlo y colocarlo en el campo de credencial de la plataforma. KHORA almacena solo su hash y la revocación global por generación lo invalida junto con los tokens OAuth.\n\n## Flujo de máquina

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

## Flujo normativo por MCP\n\n1. `khora_norm_open_turn` fija el snapshot del SI y emite un token de turno.\n2. `khora_norm_apply_principle` registra cada principio una sola vez, en el orden canónico impuesto por KHORA.\n3. `khora_norm_verify_turn` valida el receipt contra el ledger server-side y persiste el intento.\n4. Solo `VERIFIED` marca el turno como cerrado en KHORA.\n5. `khora_norm_release_turn` emite `VERIFIED_RELEASE` solo con orden, ledger/hash y snapshot consistentes.\n6. `INVALID` e `INCOMPLETE` conservan el intento histórico y abren el siguiente `attempt`.\n\nEl mismo endpoint MCP sirve para el resto de capacidades de Cora/KHORA; no se crea una segunda entrada normativa. El transporte Bearer puede proceder de OAuth o de un token manual gestionado por KHORA.\n\n
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

Cora registra la frontera de cada request HTTP mediante el middleware transversal y registra además cada tool call de MCP. El evento de frontera contiene servicio, operación, ruta, método, correlación, resultado, código de estado, duración y razón de fallo, sin payloads ni secretos.

El bridge FastAPI conserva el `correlation_id`, registra la finalización de respuestas streaming y entrega el evento al mismo almacén durable. Jules, Notion y Ollama local registran sus dependencias/servicios críticos.

Los eventos de dominio existentes continúan siendo la fuente detallada para captura, dictado, transcripción, ingesta, revisión, grafo y demás operaciones internas. No se crea un segundo almacén.
