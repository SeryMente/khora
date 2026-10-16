import { randomUUID } from "node:crypto";

export type DiagnosticContext = { operation: string; correlation_id?: string; stage?: string };
export type McpDiagnostic = {
  code: string; message: string; stage: string; operation: string; dependency: string | null;
  retryable: boolean; recovery: string; correlation_id: string; evidence: Record<string, string | number>;
};
// Only code-authored, allowlisted evidence enters public diagnostics. Never copy Error/cause/request payloads.
export class McpDiagnosticError extends Error {
  constructor(public readonly code: string, public readonly evidence: { upstream_status?: number; authentication?: "sent" | "missing"; operation?: string } = {}) { super(code); }
}
const normativeCodes = new Set(["SI_PRINCIPLE_STATE_INVALID","APPLICATION_LOG_INCOMPLETE", "APPLICATION_LOG_MISMATCH", "EVIDENCE_SHA256_MISMATCH", "MANIFEST_SHA256_MISMATCH", "MCP_CONFIG_MISSING", "METHODOLOGY_BLOB_ENCODING_INVALID", "METHODOLOGY_BLOB_FETCH_", "METHODOLOGY_BLOB_SHA_INVALID", "METHODOLOGY_COMMIT_SHA_INVALID", "METHODOLOGY_CURRENT_FETCH_", "METHODOLOGY_CURRENT_PAYLOAD_INVALID", "METHODOLOGY_HEADER", "METHODOLOGY_HISTORY_FETCH_", "METHODOLOGY_HISTORY_PAYLOAD_INVALID", "METHODOLOGY_LAST_UPDATED_MISSING", "METHODOLOGY_MAIN_CHANGED_DURING_SNAPSHOT", "METHODOLOGY_MAIN_CONFIRM_FETCH_", "METHODOLOGY_MAIN_CONFIRM_SHA_INVALID", "METHODOLOGY_MAIN_FETCH_", "METHODOLOGY_MAIN_SHA_INVALID", "METHODOLOGY_OUTPUT_HEADER_MISMATCH", "METHODOLOGY_OUTPUT_IDENTITY_INCOMPLETE", "METHODOLOGY_SHA256_MISMATCH", "METHODOLOGY_SNAPSHOT_FAILED", "METHODOLOGY_VERSION_MISMATCH", "METHODOLOGY_VERSION_MISSING", "METHODOLOGY_VERSION_NAME_MISSING", "NORMATIVE_RUNTIME_INVALID", "NORMATIVE_RUNTIME_MISMATCH", "OUTPUT_FORMAT_", "OUTPUT_HEADER_MISMATCH", "OUTPUT_SHA256_MISMATCH", "PRINCIPLES_ALREADY_COMPLETE", "PRINCIPLES_DUPLICATED", "PRINCIPLES_MISSING", "PRINCIPLES_ORDER_MISMATCH", "PRINCIPLES_UNKNOWN", "PRINCIPLE_ANCHOR_REQUIRED", "PRINCIPLE_FOLIO_INVALID", "PRINCIPLE_ORDER_MISMATCH", "PRINCIPLE_REASON_CODE_REQUIRED", "RECEIPT_SCHEMA_INVALID", "SI_BLOB_ENCODING_INVALID", "SI_BLOB_FETCH_", "SI_BLOB_SHA_INVALID", "SI_COMMIT_SHA_INVALID", "SI_CURRENT_FETCH_", "SI_CURRENT_PAYLOAD_INVALID", "SI_HEADER", "SI_HISTORY_FETCH_", "SI_HISTORY_PAYLOAD_INVALID", "SI_LAST_UPDATED_MISSING", "SI_MAIN_CHANGED_DURING_SNAPSHOT", "SI_MAIN_CONFIRM_FETCH_", "SI_MAIN_CONFIRM_SHA_INVALID", "SI_MAIN_FETCH_", "SI_MAIN_SHA_INVALID", "SI_NO_CANONICAL_PRINCIPLES", "SI_OUTPUT_DATE_INVALID", "SI_OUTPUT_IDENTITY_INCOMPLETE", "SI_PRINCIPLES_DUPLICATED", "SI_SECTION_MISSING", "SI_SHA256_MISMATCH", "SI_SNAPSHOT_FAILED", "SI_SNAPSHOT_UNAVAILABLE", "SI_UPDATED_AT_IN_FUTURE", "SI_VERSION_MISMATCH", "SI_VERSION_MISSING", "SI_VERSION_NAME_MISSING", "TURN_ACTOR_INVALID", "TURN_ACTOR_MISMATCH", "TURN_ALREADY_CLOSED", "TURN_APPLICATION_LEDGER_INVALID", "TURN_ATTEMPT_CHANGED", "TURN_ATTEMPT_REPLAY", "TURN_CREATE_FAILED", "TURN_ID_INCOMPLETE", "TURN_ID_INVALID", "TURN_NOT_FOUND", "TURN_NOT_OPEN", "TURN_NOT_VERIFIED", "TURN_PRINCIPLES_INCOMPLETE", "TURN_RECEIPT_ATTEMPT_MISMATCH", "TURN_RECEIPT_CYCLE_MISMATCH", "TURN_RECEIPT_NONCE_MISMATCH", "TURN_RECEIPT_RUNTIME_MISMATCH", "TURN_RECEIPT_SCHEMA_INVALID", "TURN_RECEIPT_SNAPSHOT_MISMATCH", "TURN_RELEASE_OUTPUT_INVALID", "TURN_RELEASE_SNAPSHOT_MISMATCH", "TURN_RUNTIME_MISMATCH", "TURN_RUNTIME_PERSISTENCE_MISMATCH", "TURN_TOKEN_", "TURN_TOKEN_CLAIMS_INVALID", "TURN_TOKEN_INVALID", "TURN_TOKEN_REPLAY_AFTER_CLOSE", "TURN_TOKEN_REVOKED", "TURN_TOKEN_STATE_MISMATCH", "TURN_VERIFICATION_EVIDENCE_INCOMPLETE", "TURN_VERIFICATION_RECORD_MISSING", "TURN_VERIFIED_ATTEMPT_MISMATCH"]);
for (const suffix of ["INVALID_FORMAT", "INVALID_HEADER", "INVALID_SIGNATURE", "INVALID_PAYLOAD", "EXPIRED"]) normativeCodes.add("TURN_TOKEN_" + suffix);
const authorizationCodes = new Set(["MCP_AUTH_MISSING", "MCP_MANUAL_TOKEN_INACTIVE", "MCP_AUTH_RESOURCE_MISMATCH", "MCP_AUTH_ISSUER_MISMATCH", "MCP_AUTH_CLAIMS_INVALID", "MCP_AUTH_REVOKED", "MCP_AUTH_INVALID_FORMAT", "MCP_AUTH_INVALID_HEADER", "MCP_AUTH_INVALID_SIGNATURE", "MCP_AUTH_INVALID_PAYLOAD", "MCP_AUTH_EXPIRED", "OAUTH_CODE_INACTIVE", "OAUTH_REDIRECT_MISMATCH", "OAUTH_PKCE_MISMATCH", "OAUTH_RESOURCE_MISMATCH", "OAUTH_CODE_CONSUMED", "OAUTH_REFRESH_INACTIVE", "OAUTH_SCOPE_INVALID", "OAUTH_SCOPE_EXCEEDED", "OAUTH_CLIENT_REJECTED"]);
const messages: Record<string, [string, string, string, boolean]> = {
  NORM_GITHUB_CREDENTIAL_MISSING: ["Falta la credencial del servidor para leer la fuente normativa privada.", "Configurar KHORA_NORM_GITHUB_TOKEN con lectura exclusiva del repositorio normativo; no usar el token de dictados.", "github", false],
  NORM_GITHUB_CREDENTIAL_REJECTED: ["GitHub rechazó la credencial normativa del servidor.", "Revisar vigencia y autorización de la credencial del servidor por el canal privado.", "github", false],
  NORM_GITHUB_FORBIDDEN: ["GitHub denegó la consulta normativa autenticada.", "Comprobar permisos de lectura y políticas de la organización sin ampliar acceso a dictados.", "github", false],
  NORM_GITHUB_NOT_FOUND_OR_INACCESSIBLE: ["GitHub devolvió 404 a una consulta normativa autenticada; no distingue recurso inexistente de inaccesible.", "Verificar repositorio, referencia y acceso de la credencial del servidor.", "github", false],
  NORM_GITHUB_RATE_LIMITED: ["GitHub limitó las peticiones normativas.", "Esperar el restablecimiento del límite antes de reintentar; no repetir en bucle.", "github", true],
  NORM_GITHUB_TIMEOUT: ["Se agotó el tiempo de la consulta normativa a GitHub.", "Reintentar de forma acotada; si persiste, revisar disponibilidad de GitHub.", "github", true],
  NORM_GITHUB_NETWORK: ["Falló la comunicación normativa con GitHub.", "Revisar conectividad del servidor y reintentar de forma acotada.", "github", true],
  NORM_GITHUB_UNAVAILABLE: ["GitHub no pudo completar la consulta normativa.", "Revisar el estado del proveedor y reintentar de forma acotada.", "github", true],
  NORM_GITHUB_RESPONSE_INVALID: ["La respuesta normativa de GitHub no es válida.", "Revisar contrato del proveedor; no usar contenido sin validar.", "github", false],
  NORM_GITHUB_HTTP_ERROR: ["GitHub rechazó la consulta normativa con un estado no previsto.", "Consultar el estado HTTP observado y el registro correlacionado.", "github", false],
  MCP_BODY_INVALID: ["El cuerpo no tiene el formato requerido.", "Enviar un objeto JSON para registro/tokens manuales o form-urlencoded para el intercambio OAuth.", "validation", false],
  MCP_ORIGIN_DENIED: ["El origen de la petición no está autorizado.", "Realizar la operación desde el origen de Khora; no relajar el control de origen.", "authorization", false],
  MCP_OAUTH_PARAMETERS_REQUIRED: ["Faltan parámetros obligatorios del intercambio OAuth.", "Para authorization_code enviar code, redirect_uri y code_verifier; para refresh_token enviar refresh_token.", "validation", false],
  MCP_OAUTH_GRANT_INVALID: ["El grant no puede utilizarse; no se revela su existencia ni su estado individual.", "Reiniciar la autorización por el cliente admitido; el administrador puede consultar el registro correlacionado.", "authorization", false],
  MCP_OAUTH_GRANT_UNSUPPORTED: ["El tipo de intercambio OAuth no está admitido.", "Usar authorization_code o refresh_token según el flujo autorizado.", "validation", false],
  MCP_OAUTH_SCOPE_INVALID: ["Los permisos solicitados no son válidos o exceden lo concedido.", "Solicitar únicamente scopes admitidos y previamente autorizados; no ampliar privilegios para corregir el error.", "authorization", false],
  MCP_OAUTH_REDIRECT_INVALID: ["El registro no contiene redirecciones admitidas.", "Enviar de una a diez redirecciones HTTPS de Notion admitidas por la política vigente.", "validation", false],
  MCP_OAUTH_METADATA_INVALID: ["Los metadatos del cliente no cumplen el contrato admitido.", "Usar cliente público con PKCE, token_endpoint_auth_method none, authorization_code y response_type code.", "validation", false],
  MANUAL_TOKEN_SCOPE_INVALID: ["Los scopes del token manual no son válidos o están duplicados.", "Elegir scopes admitidos, sin duplicados.", "validation", false],
  MANUAL_TOKEN_SCOPE_REQUIRED: ["El token manual requiere al menos un scope.", "Elegir únicamente los permisos mínimos efectivos para la operación.", "validation", false],
  MANUAL_TOKEN_EXPIRY_INVALID: ["La duración del token manual no está admitida.", "Usar 30, 90 o 365 días.", "validation", false],
  MANUAL_TOKEN_ACTOR_INVALID: ["No se dispone de una identidad de sesión válida.", "Autenticar de nuevo mediante el flujo admitido.", "authorization", false],
  MANUAL_TOKEN_ID_REQUIRED: ["Falta el identificador del token manual.", "Enviar id en un objeto JSON; no enviar el secreto del token.", "validation", false],
  MANUAL_TOKEN_ID_INVALID: ["El identificador del token manual no tiene el formato admitido.", "Utilizar el identificador del listado autorizado, no su secreto.", "validation", false],
  MCP_SCOPE_REQUIRED: ["Falta un permiso de la operación.", "Autorizar únicamente el permiso indicado por el challenge y sus dependencias efectivas.", "authorization", false],
  MCP_ACCESS_DENIED: ["La credencial de acceso no está presente o no es válida/activa para este recurso.", "Autenticar de nuevo por el flujo admitido. No se revela la existencia ni el estado de un token concreto.", "authorization", false],
  MCP_CONFIG_MISSING: ["La configuración del servidor está incompleta o no es válida.", "Revisar la configuración del despliegue por un canal autorizado, sin publicar valores.", "configuration", false],
  MCP_DATABASE_CONFIG_MISSING: ["Falta la configuración de lectura de la base de datos.", "Configurar la conexión de solo lectura; no sustituirla con privilegios superiores.", "database", false],
  MCP_DATABASE_SCHEMA: ["La consulta requiere una tabla o columna que no está disponible.", "Revisar migraciones y revisión desplegada con el identificador de seguimiento.", "database", false],
  MCP_DATABASE_DENIED: ["La base de datos denegó la consulta.", "Revisar los privilegios mínimos del rol autorizado.", "database", false],
  MCP_DATABASE_UNAVAILABLE: ["La base de datos no pudo completar la consulta.", "Revisar disponibilidad y reintentar solo cuando no duplique efectos.", "database", true],
  MCP_PROTOCOL_INVALID: ["La petición no cumple el transporte o protocolo admitido.", "Comprobar método, cabeceras, JSON y versión negociada; conservar el código de protocolo.", "protocol", false],
  MCP_INPUT_INVALID: ["Los argumentos no cumplen el contrato de la herramienta.", "Comparar campos, tipos y límites con tools/list; no enviar secretos como argumentos de negocio.", "validation", false],
  MCP_VOLCADO_NOT_FOUND: ["No se encontró el volcado solicitado en el alcance autorizado.", "Comprobar folio o identificador mediante el listado autorizado.", "content", false],
  MCP_VERSION_NOT_FOUND: ["No se encontró la versión solicitada del volcado.", "Consultar las versiones disponibles antes de reintentar.", "content", false],
  MCP_DECRYPTION_FAILED: ["No se pudo descifrar el contenido solicitado.", "Revisar claves y formato en el servidor; no considerar recuperado el texto ni regenerar claves por este error.", "content", false],
  MCP_HISTORY_PARTIAL: ["No se pudo consultar una parte del historial.", "Revisar las secciones fallidas; una lista vacía no acredita ausencia de versiones o auditoría.", "database", false],
  MCP_UI_RENDER_FAILED: ["No se pudo obtener la representación solicitada.", "Revisar disponibilidad y configuración del renderizador; no publicar su URL interna ni su clave.", "renderer", true],
  MCP_INTERNAL_ERROR: ["Ocurrió un fallo no clasificado; la causa todavía no está determinada.", "Consultar el registro autorizado con el identificador de seguimiento; no asumir la causa ni repetir mutaciones.", "internal", false],
};
export function diagnose(error: unknown, context: DiagnosticContext): McpDiagnostic {
  const e = error as { message?: unknown; code?: unknown } | null;
  const raw = typeof e?.message === "string" ? e.message : typeof error === "string" ? error : "";
  let code = error instanceof McpDiagnosticError ? error.code : raw;
  if (!Object.hasOwn(messages, code) && !normativeCodes.has(code) && !authorizationCodes.has(code)) {
    if (raw === "KHORA_READONLY_DATABASE_URL mandatory in production for MCP" || raw === "No hay URL de base de datos disponible para MCP.") code = "MCP_DATABASE_CONFIG_MISSING";
    else if (/^SI_PRINCIPLE_STATE_INVALID:P\d{3}$/.test(raw)) code = "SI_PRINCIPLE_STATE_INVALID";
    else if (/^(?:MCP error -32602: )?Input validation error:/.test(raw)) code = "MCP_INPUT_INVALID";
    else if (e?.code === "42P01" || e?.code === "42703") code = "MCP_DATABASE_SCHEMA";
    else if (e?.code === "42501") code = "MCP_DATABASE_DENIED";
    else if (typeof e?.code === "string" && /^(08[A-Z0-9]{3}|53[A-Z0-9]{3}|57P0[123]|ECONNREFUSED|ETIMEDOUT|ECONNRESET)$/.test(e.code)) code = "MCP_DATABASE_UNAVAILABLE";
    else code = "MCP_INTERNAL_ERROR";
  }
  let detail = messages[code];
  if (authorizationCodes.has(code)) detail = ["El control de autorización rechazó la operación: " + code + ".", "Revisar el flujo de autorización y el código de la condición en el registro protegido; no publicar credenciales ni cambiar permisos por inferencia.", "authorization", false];
  if (!detail && normativeCodes.has(code)) {
    const recovery = code === "TURN_ID_INCOMPLETE" ? "Enviar conversation_id y turn_number juntos, o no enviar ninguno."
      : /ALREADY_CLOSED|NOT_OPEN|NOT_VERIFIED|VERIFIED_ATTEMPT|STATE_MISMATCH/.test(code) ? "Consultar el estado/intento del ciclo: completar, verificar o liberar según corresponda; no reabrir ni reutilizar tokens a ciegas."
      : /TOKEN/.test(code) ? "Obtener el token vigente del ciclo autorizado; comprobar intento, vigencia y actor. No sustituirlo por el Bearer de acceso."
      : /PLATFORM|RUNTIME|OUTPUT_FORMAT/.test(code) ? "Comprobar identidad y versión admitidas; no suplantar plataforma ni fabricar evidencia."
      : /ORDER|PRINCIPLE/.test(code) ? "Seguir el siguiente principio y evidencia exigidos por el ciclo, sin saltos."
      : "Consultar el contrato normativo y el registro correlacionado; corregir la condición indicada por el código sin saltar controles.";
    detail = ["El control normativo rechazó la operación: " + code + ".", recovery, "normative", false];
  }
  const evidence: Record<string, string | number> = {};
  if (error instanceof McpDiagnosticError) {
    if (Number.isInteger(error.evidence.upstream_status)) evidence.upstream_status = error.evidence.upstream_status!;
    if (error.evidence.authentication === "sent" || error.evidence.authentication === "missing") evidence.authentication = error.evidence.authentication;
    if (/^(SI|METHODOLOGY)_(MAIN|MAIN_CONFIRM|CURRENT|HISTORY|BLOB)_FETCH$/.test(error.evidence.operation || "")) evidence.upstream_operation = error.evidence.operation!;
  }
  const [message, recovery, dependency, retryable] = detail || messages.MCP_INTERNAL_ERROR;
  return { code, message, recovery, dependency, retryable, stage: context.stage || dependency,
    operation: context.operation, correlation_id: context.correlation_id || randomUUID(), evidence };
}
export function diagnosticFailure(error: unknown, context: DiagnosticContext) {
  const diagnostic = diagnose(error, context);
  return { isError: true as const, content: [{ type: "text" as const, text: JSON.stringify({ ok: false, diagnostic }) }], _meta: { "khora/diagnostic": diagnostic } };
}
