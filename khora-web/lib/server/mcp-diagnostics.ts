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
  NORM_SECRET_UNAVAILABLE: ['Khora no pudo abrir la credencial protegida para leer sus instrucciones.', 'El administrador debe revisar la bóveda, su base de datos y la clave de cifrado. No cambies el token de dictados.', 'database', false],
  NORM_GITHUB_CREDENTIAL_MISSING: ["Al servidor Khora le falta la credencial para leer sus instrucciones privadas en GitHub.", "Abre Seguridad → Bóveda y guarda el token de lectura de SeryMente/metodologia. No es tu token de dictados.", "github", false],
  NORM_GITHUB_CREDENTIAL_REJECTED: ["GitHub no aceptó la credencial con la que Khora intenta leer sus instrucciones.", "El administrador debe revisar o reemplazar esa credencial en el servidor, sin pegarla en el chat.", "github", false],
  NORM_GITHUB_FORBIDDEN: ["GitHub no permitió que Khora leyera sus instrucciones privadas.", "El administrador debe revisar el permiso de lectura de SeryMente/metodologia y las restricciones de la organización.", "github", false],
  NORM_GITHUB_NOT_FOUND_OR_INACCESSIBLE: ["Khora no pudo encontrar o abrir sus instrucciones privadas en GitHub. Esa respuesta no permite distinguir entre ambas causas.", "El administrador debe comprobar la ubicación solicitada en SeryMente/metodologia y el acceso de la credencial del servidor.", "github", false],
  NORM_GITHUB_RATE_LIMITED: ["GitHub detuvo temporalmente las consultas de Khora porque se alcanzó un límite de peticiones.", "Espera a que GitHub permita nuevas consultas. No hace falta cambiar tu token de dictados.", "github", true],
  NORM_GITHUB_TIMEOUT: ["GitHub tardó demasiado en responder cuando Khora pidió sus instrucciones.", "Inténtalo de nuevo más tarde. Si se repite, el administrador debe revisar la conexión del servidor con GitHub.", "github", true],
  NORM_GITHUB_NETWORK: ["Khora no pudo comunicarse con GitHub para leer sus instrucciones.", "Inténtalo de nuevo más tarde. Si persiste, el administrador debe revisar la conexión del servidor.", "github", true],
  NORM_GITHUB_UNAVAILABLE: ["GitHub devolvió un fallo al consultar las instrucciones de Khora.", "Inténtalo de nuevo más tarde. Si persiste, el administrador debe revisar el estado de GitHub.", "github", true],
  NORM_GITHUB_RESPONSE_INVALID: ["La respuesta de GitHub no pudo usarse para comprobar las instrucciones de Khora.", "El administrador debe revisar la respuesta y los límites de lectura. Khora no debe continuar con instrucciones sin comprobar.", "github", false],
  NORM_GITHUB_HTTP_ERROR: ["GitHub devolvió una respuesta inesperada al pedir las instrucciones de Khora. La causa no está identificada.", "El administrador debe revisar el registro del fallo con el identificador de seguimiento.", "github", false],
  MCP_BODY_INVALID: ["La aplicación envió la solicitud en un formato que Khora no puede leer.", "La aplicación debe corregir el formato de la solicitud y volver a enviarla.", "validation", false],
  MCP_ORIGIN_DENIED: ["Esta operación se pidió desde un sitio que Khora no permite.", "Realiza la operación desde el sitio de Khora. No desactives la protección para hacerla funcionar.", "authorization", false],
  MCP_OAUTH_PARAMETERS_REQUIRED: ["A la solicitud de conexión le faltan datos obligatorios.", "Vuelve a conectar desde la aplicación. Si se repite, quien mantiene esa conexión debe revisar los datos que envía.", "validation", false],
  MCP_OAUTH_GRANT_INVALID: ["Khora no pudo completar la autorización de esta conexión.", "Inicia de nuevo la conexión. El administrador puede revisar el motivo concreto con el identificador de seguimiento.", "authorization", false],
  MCP_OAUTH_GRANT_UNSUPPORTED: ["La aplicación intenta conectarse de una forma que Khora no admite.", "Quien mantiene la aplicación debe usar una forma de conexión admitida por Khora.", "validation", false],
  MCP_OAUTH_SCOPE_INVALID: ["La aplicación pidió permisos no admitidos o mayores que los autorizados.", "Revisa los permisos pedidos y conserva solo los necesarios y autorizados.", "authorization", false],
  MCP_OAUTH_REDIRECT_INVALID: ["La dirección a la que debe volver la conexión no está admitida por Khora.", "Quien configura la conexión debe revisar esa dirección. El registro actual admite de una a diez direcciones seguras de Notion.", "validation", false],
  MCP_OAUTH_METADATA_INVALID: ["La configuración de conexión de esta aplicación no cumple los requisitos de Khora.", "Quien mantiene la aplicación debe revisar su registro y el método de conexión admitido.", "validation", false],
  MANUAL_TOKEN_SCOPE_INVALID: ["Los permisos elegidos para esta credencial no están admitidos o están repetidos.", "Elige permisos de la lista de Khora, sin repetirlos y solo los necesarios.", "validation", false],
  MANUAL_TOKEN_SCOPE_REQUIRED: ["No elegiste ningún permiso para esta credencial de acceso.", "Elige al menos un permiso, solo de los necesarios para la tarea.", "validation", false],
  MANUAL_TOKEN_EXPIRY_INVALID: ["La duración elegida para la credencial de acceso no está admitida.", "Elige 30, 90 o 365 días.", "validation", false],
  MANUAL_TOKEN_ACTOR_INVALID: ["Khora no pudo reconocer una sesión de usuario válida.", "Vuelve a iniciar sesión en Khora.", "authorization", false],
  MANUAL_TOKEN_ID_REQUIRED: ["Falta indicar qué credencial de acceso quieres gestionar.", "Selecciona la credencial en la lista de Khora. No envíes su valor secreto.", "validation", false],
  MANUAL_TOKEN_ID_INVALID: ["La referencia de la credencial de acceso no tiene el formato esperado.", "Selecciona una credencial de la lista de Khora; no uses su valor secreto como referencia.", "validation", false],
  MCP_SCOPE_REQUIRED: ["Esta conexión no tiene el permiso necesario para la operación que pediste.", "Revisa el permiso indicado por Khora y autoriza solo el necesario. No concedas todos los permisos por defecto.", "authorization", false],
  MCP_ACCESS_DENIED: ["Khora no recibió una credencial de acceso que pudiera aceptar.", "Vuelve a conectar la aplicación con Khora. Esta respuesta no distingue entre una credencial ausente, inválida o inactiva.", "authorization", false],
  MCP_CONFIG_MISSING: ["El servidor Khora no está configurado correctamente para aceptar esta conexión.", "El administrador debe revisar la configuración del servidor. Cambiar tu token por sí solo no corrige este problema.", "configuration", false],
  MCP_DATABASE_CONFIG_MISSING: ["Al servidor Khora le falta la conexión de lectura a la base de datos.", "El administrador debe configurar esa conexión con permiso de solo lectura.", "database", false],
  MCP_DATABASE_SCHEMA: ["La base de datos no tiene una tabla o un campo que esta operación necesita.", "El administrador debe comprobar que el código y la estructura de la base de datos estén actualizados.", "database", false],
  MCP_DATABASE_DENIED: ["La base de datos no permitió esta consulta de Khora.", "El administrador debe revisar el permiso de lectura de esa consulta, sin conceder acceso de más.", "database", false],
  MCP_DATABASE_UNAVAILABLE: ["Khora no pudo completar la consulta a la base de datos.", "El administrador debe revisar su disponibilidad. Antes de repetir una operación que cambie datos, comprueba si ya se realizó.", "database", true],
  MCP_PROTOCOL_INVALID: ["La aplicación envió una solicitud que la conexión de Khora no puede aceptar.", "Quien mantiene la aplicación debe revisar cómo envía la solicitud y la versión de conexión que utiliza.", "protocol", false],
  MCP_INPUT_INVALID: ["Faltan datos o hay valores no válidos en la operación que pediste.", "La aplicación debe comparar los datos enviados con los que pide la herramienta y corregirlos.", "validation", false],
  MCP_VOLCADO_NOT_FOUND: ["Khora no encontró ese dictado entre los datos a los que esta conexión puede acceder.", "Comprueba el número o la referencia del dictado en la lista disponible.", "content", false],
  MCP_VERSION_NOT_FOUND: ["Khora no encontró la versión de ese dictado que pediste.", "Consulta las versiones disponibles y elige una de ellas.", "content", false],
  MCP_DECRYPTION_FAILED: ["Khora encontró el contenido, pero no pudo convertirlo de su forma protegida a texto legible.", "El administrador debe revisar la clave y el formato de protección. No cambies las claves ni des por recuperado el texto.", "content", false],
  MCP_HISTORY_PARTIAL: ["Khora no pudo consultar una parte del historial. Lo recibido está incompleto.", "Revisa qué parte falló. Una lista vacía en esa parte no significa que no haya historial.", "database", false],
  MCP_UI_RENDER_FAILED: ["Khora no pudo generar la vista de pantalla que pediste.", "Inténtalo de nuevo más tarde. Si persiste, el administrador debe revisar el servicio que genera esa vista.", "renderer", true],
  MCP_INTERNAL_ERROR: ["Khora encontró un fallo que todavía no sabe explicar.", "El administrador debe revisar el registro con el identificador de seguimiento. No se debe adivinar la causa ni repetir cambios a ciegas.", "internal", false],
};

// Plain explanations for protected authorization logs; never expose these instead of the public access response.
const authorizationExplanations: Record<string, [string, string]> = {
  MCP_AUTH_MISSING: ["La solicitud llegó sin credencial de acceso.", "La aplicación debe enviar la credencial mediante su conexión privada con Khora."],
  MCP_MANUAL_TOKEN_INACTIVE: ["La credencial manual no corresponde a un acceso activo. No se comprobó si falta, venció o fue revocada.", "El usuario debe revisar sus credenciales activas en Khora o crear una nueva con los permisos necesarios."],
  MCP_AUTH_RESOURCE_MISMATCH: ["La credencial recibida corresponde a una dirección de servicio distinta.", "Revisar que la dirección de Khora configurada en la aplicación coincida con la del servidor."],
  MCP_AUTH_ISSUER_MISMATCH: ["La credencial no indica el servidor emisor que Khora espera.", "Revisar la configuración de conexión y emitir una credencial desde el servidor correcto."],
  MCP_AUTH_CLAIMS_INVALID: ["A la credencial le faltan datos válidos para identificar al usuario o su acceso.", "Volver a autorizar la conexión; si persiste, revisar cómo se emite la credencial."],
  MCP_AUTH_REVOKED: ["La credencial pertenece a una autorización anterior a la última revocación general.", "Volver a autorizar la conexión para obtener una credencial vigente."],
  MCP_AUTH_EXPIRED: ["La credencial de acceso ya venció.", "Renovar la conexión o volver a autorizarla."],
  MCP_AUTH_INVALID_FORMAT: ["La credencial de acceso no tiene el formato esperado.", "Revisar que la aplicación envíe la credencial completa por el canal privado correcto."],
  MCP_AUTH_INVALID_HEADER: ["La identificación interna de la credencial no es válida.", "Volver a autorizar la conexión. No editar la credencial a mano."],
  MCP_AUTH_INVALID_SIGNATURE: ["No se pudo comprobar que la credencial fuera emitida con la clave esperada.", "Revisar la emisión y la clave del servidor. No aceptar la credencial sin comprobarla."],
  MCP_AUTH_INVALID_PAYLOAD: ["El contenido de la credencial no pudo leerse como se esperaba.", "Volver a autorizar la conexión. No editar la credencial a mano."],
  OAUTH_CODE_INACTIVE: ["No se encontró una autorización inicial que pudiera utilizarse.", "Iniciar de nuevo la conexión desde la aplicación."],
  OAUTH_REDIRECT_MISMATCH: ["La dirección de regreso no coincide con la que se autorizó al iniciar la conexión.", "La aplicación debe usar la misma dirección de regreso en ambos pasos."],
  OAUTH_PKCE_MISMATCH: ["La aplicación no demostró ser la misma que inició esta conexión.", "Reiniciar la conexión y revisar su comprobación de seguridad; no desactivarla."],
  OAUTH_RESOURCE_MISMATCH: ["La autorización corresponde a un servicio distinto del solicitado.", "Revisar la dirección de Khora configurada en la aplicación e iniciar de nuevo la conexión."],
  OAUTH_CODE_CONSUMED: ["La autorización inicial ya no pudo reservarse para este intercambio.", "Iniciar de nuevo la conexión; no reutilizar la misma autorización."],
  OAUTH_REFRESH_INACTIVE: ["No se pudo renovar la conexión con la credencial presentada.", "Volver a autorizar la conexión desde la aplicación."],
  OAUTH_SCOPE_INVALID: ["Los permisos pedidos no están admitidos.", "Solicitar únicamente permisos admitidos por Khora."],
  OAUTH_SCOPE_EXCEEDED: ["La aplicación pidió más permisos de los que se autorizaron.", "Limitar la solicitud a los permisos ya autorizados."],
  OAUTH_CLIENT_REJECTED: ["La aplicación no cumple la identificación de cliente que Khora admite.", "Revisar el registro de la aplicación sin ampliar la lista de acceso por defecto."],
};

function explainNormativeFailure(code: string): [string, string] {
  if (code === "TURN_ID_INCOMPLETE") return ["La solicitud identifica esta conversación de forma incompleta.", "Enviar juntos el identificador de conversación y el número de turno, o no enviar ninguno."];
  if (code === "TURN_ID_INVALID") return ["La referencia de conversación o el número de turno no es válido.", "La aplicación debe corregir la referencia antes de pedir acceso."];
  if (code === "TURN_ACTOR_INVALID") return ["Khora no pudo reconocer un usuario válido para esta operación.", "Vuelve a conectar la aplicación con tu cuenta autorizada."];
  if (code === "TURN_ACTOR_MISMATCH") return ["La comprobación de esta tarea pertenece a otro usuario.", "Usa una comprobación iniciada para la cuenta de esta conexión."];
  if (code === "TURN_ALREADY_CLOSED" || code === "TURN_TOKEN_REPLAY_AFTER_CLOSE") return ["La comprobación de esta tarea ya terminó y no puede reutilizarse.", "La aplicación debe iniciar una nueva comprobación para una tarea nueva; no repetir la que ya terminó."];
  if (code === "TURN_NOT_OPEN") return ["La comprobación previa de esta tarea no está abierta.", "La aplicación debe revisar su estado y continuar desde el paso correcto, sin reutilizar una comprobación cerrada."];
  if (code === "TURN_NOT_FOUND") return ["Khora no encontró la comprobación de tarea indicada.", "Revisa su referencia. Si corresponde a una tarea nueva, inicia una comprobación nueva."];
  if (code === "TURN_NOT_VERIFIED") return ["La tarea todavía no tiene una verificación final válida.", "Completa y verifica la tarea antes de pedir su resultado final."];
  if (/TOKEN.*EXPIRED/.test(code)) return ["Venció la credencial temporal de esta tarea.", "La aplicación debe obtener una credencial de tarea vigente; no sustituirla por la credencial de conexión."];
  if (/TOKEN.*REVOKED/.test(code)) return ["La credencial temporal de esta tarea fue invalidada.", "La aplicación debe obtener una credencial de tarea vigente."];
  if (/TOKEN.*(?:STATE_MISMATCH|REPLAY)|ATTEMPT|CYCLE_MISMATCH|NONCE_MISMATCH/.test(code)) return ["La solicitud usa una comprobación o un intento distinto del que Khora tiene vigente.", "La aplicación debe consultar el intento actual y continuar con sus datos, sin repetir uno anterior."];
  if (/TOKEN/.test(code)) return ["Khora no pudo aceptar la credencial temporal que permite continuar esta tarea.", "La aplicación debe obtener la credencial de esta tarea después de iniciar su comprobación. No usar la credencial de conexión en su lugar."];
  if (/RUNTIME/.test(code)) return ["La identidad o la configuración de la aplicación no coincide con la admitida para esta tarea.", "Revisa la compatibilidad de la aplicación. No la hagas pasar por otra plataforma."];
  if (code === "PRINCIPLES_ALREADY_COMPLETE") return ["Ya se registraron todas las comprobaciones de instrucciones de esta tarea.", "Continúa con la verificación final; no vuelvas a registrar los mismos pasos."];
  if (/ORDER/.test(code)) return ["Las comprobaciones de instrucciones no siguen el orden requerido.", "La aplicación debe continuar con el siguiente paso indicado por Khora, sin saltos."];
  if (/DUPLICATED/.test(code)) return ["Se repitieron instrucciones o comprobaciones que debían aparecer una sola vez.", "Corrige las repeticiones y vuelve a verificar el intento correspondiente."];
  if (/UNKNOWN|FOLIO_INVALID/.test(code)) return ["Una instrucción indicada no corresponde a las que Khora reconoce para esta tarea.", "Usa las referencias que Khora entregó al iniciar la comprobación."];
  if (/ANCHOR_REQUIRED/.test(code)) return ["Falta indicar dónde se aplicó la instrucción que estás registrando.", "La aplicación debe aportar esa referencia antes de continuar."];
  if (/REASON_CODE_REQUIRED/.test(code)) return ["Falta explicar por qué no se aplicó una instrucción.", "La aplicación debe registrar una razón admitida antes de continuar."];
  if (/PRINCIPLE_STATE/.test(code)) return ["Una instrucción tiene un estado que Khora no reconoce.", "El administrador debe revisar esa instrucción en el documento de origen."];
  if (/PRINCIPLES_MISSING|PRINCIPLES_INCOMPLETE|APPLICATION_LOG_INCOMPLETE/.test(code)) return ["Faltan comprobaciones de instrucciones para completar esta tarea.", "Completa los pasos pendientes antes de pedir la verificación final."];
  if (/APPLICATION_LOG/.test(code)) return ["Las comprobaciones presentadas no coinciden con las que Khora guardó.", "La aplicación debe revisar el registro de la tarea y corregir la diferencia antes de continuar."];
  if (/RECEIPT.*SCHEMA|^RECEIPT_SCHEMA/.test(code)) return ["El comprobante de la tarea está incompleto o no tiene el formato esperado.", "La aplicación debe corregir sus datos y presentarlo de nuevo."];
  if (/VERIFICATION_RECORD_MISSING|VERIFICATION_EVIDENCE_INCOMPLETE/.test(code)) return ["No se encontró una verificación guardada con todas las pruebas necesarias.", "Revisa la verificación de esta tarea; no entregues el resultado como verificado."];
  if (/OUTPUT|RELEASE_OUTPUT/.test(code)) return ["El resultado presentado no coincide con el formato o el contenido que Khora debe comprobar.", "La aplicación debe corregir el resultado y volver a verificarlo; no debe declararlo aprobado."];
  if (/SHA|SNAPSHOT_MISMATCH|RELEASE_SNAPSHOT/.test(code)) return ["Khora no pudo confirmar que los documentos o las pruebas correspondan a la versión esperada.", "El administrador debe revisar las versiones y su integridad; no omitir esa comprobación."];
  if (/MAIN_CHANGED/.test(code)) return ["Las instrucciones cambiaron mientras Khora las estaba leyendo.", "Vuelve a iniciar la lectura para comprobar una versión estable."];
  if (/VERSION|LAST_UPDATED|UPDATED_AT|HEADER/.test(code)) return ["El documento de instrucciones no tiene una versión o una fecha que Khora pueda aceptar.", "El administrador debe revisar la versión, la fecha y la identificación del documento."];
  if (/^SI_|^METHODOLOGY_/.test(code)) return ["Khora no pudo leer o comprobar el documento de instrucciones que necesita para continuar.", "El administrador debe revisar el documento solicitado en SeryMente/metodologia y el acceso del servidor a GitHub."];
  if (code === "TURN_CREATE_FAILED") return ["Khora no pudo guardar el inicio de la comprobación de esta tarea.", "El administrador debe revisar el almacenamiento antes de volver a iniciar la tarea."];
  return ["Khora no pudo comprobar que esta tarea cumple los requisitos para continuar.", "El administrador debe revisar el registro con el identificador de seguimiento; no se debe adivinar la causa."];
}

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
  if (authorizationCodes.has(code)) detail = [...authorizationExplanations[code], "authorization", false];
  if (!detail && normativeCodes.has(code)) {
    const [message, recovery] = explainNormativeFailure(code);
    detail = [message, recovery, "normative", false];
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
