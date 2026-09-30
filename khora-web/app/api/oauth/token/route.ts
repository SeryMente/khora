// @l0 L0-002 §4 · @req MCP-OAUTH-01/REQ-6
import { NextRequest, NextResponse } from "next/server";
import { getMcpConfig, validateCimdClient } from "@/lib/server/mcp-config";
import {
  obtenerCodigoAutorizacionValido,
  marcarCodigoComoUsado,
  crearRefreshToken,
  rotarRefreshToken,
  obtenerGeneracionRevocacion,
  generateRandomToken,
} from "@/lib/server/oauth";
import { signJwt, verifyPkceS256 } from "@/lib/server/jwt";

const SUPPORTED_SCOPES = new Set(["volcados:read", "runtime:read", "offline_access"]);
const DEFAULT_SCOPE = "volcados:read";

function isChatGptClient(clientId: string) {
  try {
    const url = new URL(clientId);
    if (url.protocol !== "https:" || url.hostname !== "chatgpt.com") return false;
    return /^\/oauth\/(?:client\.json|[^/]+\/client\.json)$/.test(url.pathname);
  } catch {
    return false;
  }
}

function validScopeString(scope: string) {
  const scopes = scope.split(/\s+/).filter(Boolean);
  return scopes.length > 0 && scopes.every((item) => SUPPORTED_SCOPES.has(item));
}

function tokenResponse(accessToken: string, refreshToken: string, scope: string) {
  return NextResponse.json(
    {
      access_token: accessToken,
      token_type: "Bearer",
      expires_in: 3600,
      refresh_token: refreshToken,
      scope,
    },
    {
      status: 200,
      headers: {
        "Cache-Control": "no-store",
        Pragma: "no-cache",
      },
    },
  );
}

export async function POST(req: NextRequest) {
  const config = getMcpConfig();
  if (!config) {
    return NextResponse.json(
      { error: "server_error", error_description: "MCP configuration missing" },
      { status: 503 },
    );
  }

  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json(
      { error: "invalid_request", error_description: "Expected application/x-www-form-urlencoded body" },
      { status: 400 },
    );
  }

  const grantType = formData.get("grant_type")?.toString();
  const clientId = formData.get("client_id")?.toString() || "";
  const clientSecret = formData.get("client_secret")?.toString() || "";
  const publicChatGptClient = isChatGptClient(clientId);

  if (!clientId || (!publicChatGptClient && (clientId !== config.clientId || clientSecret !== config.clientSecret))) {
    return NextResponse.json(
      { error: "invalid_client", error_description: "Invalid client credentials" },
      { status: 401 },
    );
  }

  if (publicChatGptClient) {
    const redirectUriForCimd = formData.get("redirect_uri")?.toString() || "";
    if (!redirectUriForCimd || !(await validateCimdClient(clientId, redirectUriForCimd))) {
      return NextResponse.json(
        { error: "invalid_client", error_description: "ChatGPT client metadata could not be verified" },
        { status: 401 },
      );
    }
  }

  if (grantType === "authorization_code") {
    const code = formData.get("code")?.toString();
    const redirectUri = formData.get("redirect_uri")?.toString();
    const codeVerifier = formData.get("code_verifier")?.toString();
    const resourceParam = formData.get("resource")?.toString();
    const requestedScope = formData.get("scope")?.toString();

    if (!code || !redirectUri || !codeVerifier) {
      return NextResponse.json(
        { error: "invalid_request", error_description: "Missing parameters for authorization_code grant" },
        { status: 400 },
      );
    }

    const record = await obtenerCodigoAutorizacionValido(code);
    if (!record) {
      return NextResponse.json(
        { error: "invalid_grant", error_description: "Invalid grant" },
        { status: 400 },
      );
    }

    if (record.redirect_uri !== redirectUri) {
      return NextResponse.json(
        { error: "invalid_grant", error_description: "Invalid grant" },
        { status: 400 },
      );
    }

    if (!verifyPkceS256(codeVerifier, record.code_challenge)) {
      return NextResponse.json(
        { error: "invalid_grant", error_description: "Invalid grant" },
        { status: 400 },
      );
    }

    if (record.resource !== config.canonicalUrl || (resourceParam && resourceParam !== record.resource)) {
      return NextResponse.json(
        { error: "invalid_grant", error_description: "Invalid grant" },
        { status: 400 },
      );
    }

    const scope = record.scope || DEFAULT_SCOPE;
    if (!validScopeString(scope)) {
      return NextResponse.json(
        { error: "invalid_grant", error_description: "Invalid scope in authorization grant" },
        { status: 400 },
      );
    }
    if (requestedScope) {
      if (!validScopeString(requestedScope)) {
        return NextResponse.json(
          { error: "invalid_scope", error_description: "Unsupported scope requested" },
          { status: 400 },
        );
      }
      const granted = new Set(scope.split(/\s+/));
      if (requestedScope.split(/\s+/).some((item) => !granted.has(item))) {
        return NextResponse.json(
          { error: "invalid_scope", error_description: "Requested scope exceeds authorized grant" },
          { status: 400 },
        );
      }
    }

    const marcado = await marcarCodigoComoUsado(record.id);
    if (!marcado) {
      return NextResponse.json(
        { error: "invalid_grant", error_description: "Invalid grant" },
        { status: 400 },
      );
    }

    const gen = await obtenerGeneracionRevocacion(record.usuario);
    const nowSec = Math.floor(Date.now() / 1000);
    const accessToken = signJwt(
      {
        iss: config.issuer,
        sub: record.usuario,
        aud: config.canonicalUrl,
        scope,
        gen,
        exp: nowSec + 3600,
        iat: nowSec,
        jti: generateRandomToken(16),
      },
      config.jwtSecret,
    );

    const refreshToken = await crearRefreshToken({
      usuario: record.usuario,
      resource: config.canonicalUrl,
      scope,
    });

    return tokenResponse(accessToken, refreshToken, scope);
  }

  if (grantType === "refresh_token") {
    const rawRefreshToken = formData.get("refresh_token")?.toString();
    const resourceParam = formData.get("resource")?.toString();

    if (!rawRefreshToken) {
      return NextResponse.json(
        { error: "invalid_request", error_description: "Missing refresh_token parameter" },
        { status: 400 },
      );
    }

    const rotated = await rotarRefreshToken(rawRefreshToken);
    if (!rotated) {
      return NextResponse.json(
        { error: "invalid_grant", error_description: "Invalid grant" },
        { status: 400 },
      );
    }

    const { record, newToken } = rotated;
    if (record.resource !== config.canonicalUrl) {
      return NextResponse.json(
        { error: "invalid_grant", error_description: "Invalid grant" },
        { status: 400 },
      );
    }

    if (resourceParam && resourceParam !== record.resource) {
      return NextResponse.json(
        { error: "invalid_grant", error_description: "Invalid grant" },
        { status: 400 },
      );
    }

    const scope = record.scope || DEFAULT_SCOPE;
    if (!validScopeString(scope)) {
      return NextResponse.json(
        { error: "invalid_grant", error_description: "Invalid scope in refresh token" },
        { status: 400 },
      );
    }

    const gen = await obtenerGeneracionRevocacion(record.usuario);
    const nowSec = Math.floor(Date.now() / 1000);
    const accessToken = signJwt(
      {
        iss: config.issuer,
        sub: record.usuario,
        aud: config.canonicalUrl,
        scope,
        gen,
        exp: nowSec + 3600,
        iat: nowSec,
        jti: generateRandomToken(16),
      },
      config.jwtSecret,
    );

    return tokenResponse(accessToken, newToken, scope);
  }

  return NextResponse.json(
    { error: "unsupported_grant_type", error_description: "Grant type not supported" },
    { status: 400 },
  );
}
