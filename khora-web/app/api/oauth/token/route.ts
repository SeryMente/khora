// @l0 L0-002 §4 · @req MCP-OAUTH-01/REQ-6
import { NextRequest, NextResponse } from "next/server";
import { getMcpConfig } from "@/lib/server/mcp-config";
import {
  obtenerCodigoAutorizacionValido,
  marcarCodigoComoUsado,
  crearRefreshToken,
  rotarRefreshToken,
  obtenerGeneracionRevocacion,
  generateRandomToken,
} from "@/lib/server/oauth";
import { signJwt, verifyPkceS256 } from "@/lib/server/jwt";

export async function POST(req: NextRequest) {
  const config = getMcpConfig();
  if (!config) {
    return NextResponse.json(
      { error: "server_error", error_description: "MCP configuration missing" },
      { status: 503 }
    );
  }

  let formData: FormData;
  try {
    formData = await req.formData();
  } catch (e) {
    return NextResponse.json(
      { error: "invalid_request", error_description: "Expected application/x-www-form-urlencoded body" },
      { status: 400 }
    );
  }

  const grantType = formData.get("grant_type")?.toString();
  const clientId = formData.get("client_id")?.toString();
  const clientSecret = formData.get("client_secret")?.toString();

  // Validar cliente confidencial
  if (!clientId || !clientSecret || clientId !== config.clientId || clientSecret !== config.clientSecret) {
    return NextResponse.json(
      { error: "invalid_client", error_description: "Invalid client credentials" },
      { status: 401 }
    );
  }

  if (grantType === "authorization_code") {
    const code = formData.get("code")?.toString();
    const redirectUri = formData.get("redirect_uri")?.toString();
    const codeVerifier = formData.get("code_verifier")?.toString();
    const resourceParam = formData.get("resource")?.toString();

    if (!code || !redirectUri || !codeVerifier) {
      return NextResponse.json(
        { error: "invalid_request", error_description: "Missing parameters for authorization_code grant" },
        { status: 400 }
      );
    }

    // 1. Obtener código sin marcar usado aún
    const record = await obtenerCodigoAutorizacionValido(code);
    if (!record) {
      return NextResponse.json(
        { error: "invalid_grant", error_description: "Invalid grant" },
        { status: 400 }
      );
    }

    // 2. Verificar redirect_uri
    if (record.redirect_uri !== redirectUri) {
      return NextResponse.json(
        { error: "invalid_grant", error_description: "Invalid grant" },
        { status: 400 }
      );
    }

    // 3. Verificar PKCE
    if (!verifyPkceS256(codeVerifier, record.code_challenge)) {
      return NextResponse.json(
        { error: "invalid_grant", error_description: "Invalid grant" },
        { status: 400 }
      );
    }

    // 4. Verificar resource
    if (resourceParam) {
      if (resourceParam !== record.resource || resourceParam !== config.canonicalUrl) {
        return NextResponse.json(
          { error: "invalid_grant", error_description: "Invalid grant" },
          { status: 400 }
        );
      }
    } else {
      if (record.resource !== config.canonicalUrl) {
        return NextResponse.json(
          { error: "invalid_grant", error_description: "Invalid grant" },
          { status: 400 }
        );
      }
    }

    // 5. Consumo atómico: marcar como usado solo tras pasar todas las validaciones
    const marcado = await marcarCodigoComoUsado(record.id);
    if (!marcado) {
      return NextResponse.json(
        { error: "invalid_grant", error_description: "Invalid grant" },
        { status: 400 }
      );
    }

    const gen = await obtenerGeneracionRevocacion(record.usuario);
    const nowSec = Math.floor(Date.now() / 1000);

    const accessToken = signJwt(
      {
        iss: config.issuer,
        sub: record.usuario,
        aud: config.canonicalUrl,
        scope: "volcados:read",
        gen,
        exp: nowSec + 3600,
        iat: nowSec,
        jti: generateRandomToken(16),
      },
      config.jwtSecret
    );

    const refreshToken = await crearRefreshToken({
      usuario: record.usuario,
      resource: config.canonicalUrl,
    });

    return NextResponse.json(
      {
        access_token: accessToken,
        token_type: "Bearer",
        expires_in: 3600,
        refresh_token: refreshToken,
        scope: "volcados:read",
      },
      {
        status: 200,
        headers: {
          "Cache-Control": "no-store",
          Pragma: "no-cache",
        },
      }
    );
  } else if (grantType === "refresh_token") {
    const rawRefreshToken = formData.get("refresh_token")?.toString();
    const resourceParam = formData.get("resource")?.toString();

    if (!rawRefreshToken) {
      return NextResponse.json(
        { error: "invalid_request", error_description: "Missing refresh_token parameter" },
        { status: 400 }
      );
    }

    const rotated = await rotarRefreshToken(rawRefreshToken);
    if (!rotated) {
      return NextResponse.json(
        { error: "invalid_grant", error_description: "Invalid grant" },
        { status: 400 }
      );
    }

    const { record, newToken } = rotated;

    // Verificar coherencia del recurso almacenado y parámetro opcional
    if (record.resource !== config.canonicalUrl) {
      return NextResponse.json(
        { error: "invalid_grant", error_description: "Invalid grant" },
        { status: 400 }
      );
    }

    if (resourceParam && (resourceParam !== record.resource || resourceParam !== config.canonicalUrl)) {
      return NextResponse.json(
        { error: "invalid_grant", error_description: "Invalid grant" },
        { status: 400 }
      );
    }

    const gen = await obtenerGeneracionRevocacion(record.usuario);
    const nowSec = Math.floor(Date.now() / 1000);

    const accessToken = signJwt(
      {
        iss: config.issuer,
        sub: record.usuario,
        aud: config.canonicalUrl,
        scope: "volcados:read",
        gen,
        exp: nowSec + 3600,
        iat: nowSec,
        jti: generateRandomToken(16),
      },
      config.jwtSecret
    );

    return NextResponse.json(
      {
        access_token: accessToken,
        token_type: "Bearer",
        expires_in: 3600,
        refresh_token: newToken,
        scope: "volcados:read",
      },
      {
        status: 200,
        headers: {
          "Cache-Control": "no-store",
          Pragma: "no-cache",
        },
      }
    );
  }

  return NextResponse.json(
    { error: "unsupported_grant_type", error_description: "Grant type not supported" },
    { status: 400 }
  );
}
