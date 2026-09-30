// @l0 L0-002 §4 · @req MCP-OAUTH-01/REQ-5
import { auth } from "@/auth";
import { getMcpConfig, validateCimdClient } from "@/lib/server/mcp-config";
import { crearCodigoAutorizacion } from "@/lib/server/oauth";
import { redirect } from "next/navigation";

interface SearchParams {
  client_id?: string;
  redirect_uri?: string;
  response_type?: string;
  code_challenge?: string;
  code_challenge_method?: string;
  state?: string;
  resource?: string;
  scope?: string;
  approved?: string;
}

export default async function AuthorizePage(props: {
  searchParams: Promise<SearchParams>;
}) {
  const searchParams = await props.searchParams;
  const config = getMcpConfig();

  if (!config) {
    return (
      <main className="min-h-screen bg-[var(--khora-absolute,#050505)] text-[var(--khora-ink,#f0f0f0)] flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-[var(--khora-surface,#121212)] border border-red-800/50 p-6 rounded-lg text-center">
          <h1 className="text-xl font-bold text-red-400 mb-2">Servicio No Disponible (503)</h1>
          <p className="text-sm text-gray-300">El servidor de autorización MCP no está configurado adecuadamente.</p>
        </div>
      </main>
    );
  }

  const {
    client_id,
    redirect_uri,
    response_type,
    code_challenge,
    code_challenge_method,
    state = "",
    resource,
    scope: requestedScope = "volcados:read",
    approved,
  } = searchParams;

  const isChatGptClient = (() => {
    if (!client_id) return false;
    try {
      const url = new URL(client_id);
      return url.protocol === "https:" && url.hostname === "chatgpt.com" &&
        /^\/oauth\/(?:client\.json|[^/]+\/client\.json)$/.test(url.pathname);
    } catch {
      return false;
    }
  })();

  const allowedRedirect = redirect_uri === "https://chatgpt.com/connector_platform_oauth_redirect" ||
    config.redirectUris.includes(redirect_uri || "");

  const supportedScopes = new Set(["volcados:read", "runtime:read", "offline_access"]);
  const requestedScopes = requestedScope.split(/\s+/).filter(Boolean);

  // 1. Validar client_id
  if (!client_id || (!isChatGptClient && client_id !== config.clientId)) {
    return (
      <main className="min-h-screen bg-[var(--khora-absolute,#050505)] text-[var(--khora-ink,#f0f0f0)] flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-[var(--khora-surface,#121212)] border border-red-800/50 p-6 rounded-lg text-center">
          <h1 className="text-xl font-bold text-red-400 mb-2">Cliente No Valido</h1>
          <p className="text-sm text-gray-300">El identificador de cliente (client_id) proporcionado es inválido o no está registrado.</p>
        </div>
      </main>
    );
  }

  // 2. Validar redirect_uri por coincidencia exacta y CIMD para clientes ChatGPT
  if (!redirect_uri) {
    return (
      <main className="min-h-screen bg-[var(--khora-absolute,#050505)] text-[var(--khora-ink,#f0f0f0)] flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-[var(--khora-surface,#121212)] border border-red-800/50 p-6 rounded-lg text-center">
          <h1 className="text-xl font-bold text-red-400 mb-2">URI de Redirección No Permitida</h1>
          <p className="text-sm text-gray-300">La URI de redirección es obligatoria.</p>
        </div>
      </main>
    );
  }

  if (isChatGptClient) {
    if (!(await validateCimdClient(client_id, redirect_uri))) {
      const invalidClientUrl = new URL(redirect_uri);
      invalidClientUrl.searchParams.set("error", "invalid_client");
      invalidClientUrl.searchParams.set("error_description", "Client metadata could not be verified");
      invalidClientUrl.searchParams.set("state", state);
      invalidClientUrl.searchParams.set("iss", config.issuer);
      return redirect(invalidClientUrl.toString());
    }
  } else if (!allowedRedirect) {
    return (
      <main className="min-h-screen bg-[var(--khora-absolute,#050505)] text-[var(--khora-ink,#f0f0f0)] flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-[var(--khora-surface,#121212)] border border-red-800/50 p-6 rounded-lg text-center">
          <h1 className="text-xl font-bold text-red-400 mb-2">URI de Redirección No Permitida</h1>
          <p className="text-sm text-gray-300">La URI de redirección ({redirect_uri}) no está registrada en la lista blanca.</p>
        </div>
      </main>
    );
  }

  if (resource && resource !== config.canonicalUrl) {
    const invalidResourceUrl = new URL(redirect_uri);
    invalidResourceUrl.searchParams.set("error", "invalid_target");
    invalidResourceUrl.searchParams.set("error_description", "Invalid resource");
    invalidResourceUrl.searchParams.set("state", state);
    invalidResourceUrl.searchParams.set("iss", config.issuer);
    return redirect(invalidResourceUrl.toString());
  }

  if (requestedScopes.length === 0 || requestedScopes.some((item) => !supportedScopes.has(item))) {
    const invalidScopeUrl = new URL(redirect_uri); invalidScopeUrl.searchParams.set("error", "invalid_scope"); invalidScopeUrl.searchParams.set("error_description", "Unsupported scope"); invalidScopeUrl.searchParams.set("state", state); invalidScopeUrl.searchParams.set("iss", config.issuer); return redirect(invalidScopeUrl.toString());
  }

  // A partir de aquí, client_id y redirect_uri son válidos. Errores posteriores pueden redirigir a redirect_uri.
  const buildRedirectUrl = (params: Record<string, string>) => {
    const url = new URL(redirect_uri);
    for (const [k, v] of Object.entries(params)) {
      if (v) url.searchParams.set(k, v);
    }
    return url.toString();
  };

  // 3. Validar response_type
  if (response_type !== "code") {
    redirect(
      buildRedirectUrl({
        error: "unsupported_response_type",
        error_description: "Response type must be 'code'",
        state,
        iss: config.issuer,
      })
    );
  }

  // 4. Validar PKCE
  if (!code_challenge || code_challenge_method !== "S256") {
    redirect(
      buildRedirectUrl({
        error: "invalid_request",
        error_description: "code_challenge with method S256 is required",
        state,
        iss: config.issuer,
      })
    );
  }

  // 5. Validar sesión de usuario con NextAuth
  const session = await auth();
  let userEmail = session?.user?.email;

  const isTestBypass = process.env.PLAYWRIGHT_TEST_BYPASS === 'true' || process.env.PLAYWRIGHT_TEST_RUN === '1';
  if (isTestBypass && !userEmail) {
    userEmail = config.allowedEmail;
  }

  if (!userEmail) {
    // Si no está autenticado, redirigir al login
    const currentUrl = `/oauth/authorize?${new URLSearchParams(
      searchParams as any
    ).toString()}`;
    redirect(`/api/auth/signin?callbackUrl=${encodeURIComponent(currentUrl)}`);
  }

  // 6. Validar que el correo coincida con MCP_ALLOWED_EMAIL
  if (userEmail.toLowerCase() !== config.allowedEmail.toLowerCase()) {
    redirect(
      buildRedirectUrl({
        error: "access_denied",
        error_description: `Acceso denegado: La cuenta de Google (${userEmail}) no esta autorizada para MCP. Se requiere ${config.allowedEmail}.`,
        state,
        iss: config.issuer,
      })
    );
  }

  // 7. Si el usuario ya presionó "Autorizar"
  if (approved === "true") {
    const code = await crearCodigoAutorizacion({
      codeChallenge: code_challenge,
      redirectUri: redirect_uri,
      resource: resource || config.canonicalUrl,
      usuario: userEmail,
      scope: requestedScopes.join(" "),
    });

    redirect(
      buildRedirectUrl({
        code,
        state,
        iss: config.issuer,
      })
    );
  }

  // Extraer el hostname del redirect_uri como requiere la especificación
  let redirectHost = redirect_uri;
  try {
    redirectHost = new URL(redirect_uri).hostname;
  } catch (e) {}

  return (
    <main className="min-h-screen bg-[var(--khora-absolute,#050505)] text-[var(--khora-ink,#f0f0f0)] flex items-center justify-center p-6">
      <div className="max-w-lg w-full bg-[var(--khora-surface,#121212)] border border-[var(--khora-border,#262626)] p-8 rounded-xl shadow-2xl">
        <div className="flex items-center space-x-3 mb-6">
          <div className="w-10 h-10 rounded-lg bg-[var(--khora-accent,#3b82f6)]/20 border border-[var(--khora-accent,#3b82f6)] flex items-center justify-center text-[var(--khora-accent,#3b82f6)] font-bold text-xl">
            K
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight">Autorización MCP Khora</h1>
            <p className="text-xs text-gray-400">Servidor de autorización propio</p>
          </div>
        </div>

        <div className="space-y-4 text-sm text-gray-300 mb-8">
          <p>
            La aplicación en <strong className="text-white">{redirectHost}</strong> solicita acceso de solo lectura a los datos de Khora en nombre de:
          </p>

          <div className="p-3 rounded-lg bg-black/40 border border-gray-800 flex items-center justify-between">
            <span className="text-xs font-mono text-gray-400">Cuenta activa:</span>
            <span className="font-semibold text-emerald-400">{userEmail}</span>
          </div>

          <div className="p-4 rounded-lg bg-black/30 border border-gray-800/80 space-y-2">
            <h2 className="text-xs uppercase font-semibold text-gray-400 tracking-wider">Permisos solicitados</h2>
            <ul className="text-xs space-y-1 text-gray-300">
              <li className="flex items-center space-x-2">
                <span className="text-emerald-400">✓</span>
                <span>Lectura del runtime (<code>runtime:read</code>) y, cuando se solicita, de volcados/revisiones (<code>volcados:read</code>)</span>
              </li>
              <li className="flex items-center space-x-2">
                <span className="text-emerald-400">✓</span>
                <span>Mantenimiento de acceso sin conexión (<code>offline_access</code>)</span>
              </li>
            </ul>
          </div>

          <div className="text-xs text-gray-400">
            <strong>URI de redirección:</strong> <code className="text-gray-300 break-all">{redirect_uri}</code>
          </div>
        </div>

        <form method="GET" action="/oauth/authorize">
          <input type="hidden" name="client_id" value={client_id} />
          <input type="hidden" name="redirect_uri" value={redirect_uri} />
          <input type="hidden" name="response_type" value={response_type} />
          <input type="hidden" name="code_challenge" value={code_challenge} />
          <input type="hidden" name="code_challenge_method" value={code_challenge_method} />
          <input type="hidden" name="state" value={state} />
          <input type="hidden" name="scope" value={requestedScopes.join(" ")} />
          {resource && <input type="hidden" name="resource" value={resource} />}
          <input type="hidden" name="approved" value="true" />

          <button
            type="submit"
            className="w-full py-3 px-4 rounded-lg font-medium bg-[var(--khora-accent,#3b82f6)] hover:opacity-90 text-white transition-opacity shadow-lg"
          >
            Autorizar acceso a {redirectHost}
          </button>
        </form>
      </div>
    </main>
  );
}
