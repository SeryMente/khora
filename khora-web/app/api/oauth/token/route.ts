// @l0 L0-002 §4 · @req MCP-OAUTH-01/REQ-6
import { NextRequest, NextResponse } from "next/server";
import { getMcpConfig } from "@/lib/server/mcp-config";
import {
  consumirCodigoAutorizacion,
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

    if (!code || !redirectUri || !codeVerifier) {
      return NextResponse.json(
        { error: "invalid_request", error_description: "Missing parameters for authorization_code grant" },
        { status: 400 }
      );
    }

    // Consumir código atómicamente
    const record = await consumirCodigoAutorizacion(code);
    if (!record) {
      return NextResponse.json(
        { error: "invalid_grant", error_description: "Authorization code invalid or already used" },
        { status: 400 }
      );
    }

    // Verificar redirect_uri
    if (record.redirect_uri !== redirectUri) {
      return NextResponse.json(
        { error: "invalid_grant", error_description: "Redirect URI mismatch" },
        { status: 400 }
      );
    }

    // Verificar PKCE
    if (!verifyPkceS256(codeVerifier, record.code_challenge)) {
      return NextResponse.json(
        { error: "invalid_grant", error_description: "Invalid code_verifier" },
        { status: 400 }
      );
    }

    const gen = await obtenerGeneracionRevocacion(record.usuario);
    const nowSec = Math.floor(Date.now() / 1000);

    const accessToken = signJwt(
      {
        iss: config.issuer,
        sub: record.usuario,
        aud: record.resource,
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
      resource: record.resource,
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

    if (!rawRefreshToken) {
      return NextResponse.json(
        { error: "invalid_request", error_description: "Missing refresh_token parameter" },
        { status: 400 }
      );
    }

    const rotated = await rotarRefreshToken(rawRefreshToken);
    if (!rotated) {
      // Retornar código literal invalid_grant según RFC 6749
      return NextResponse.json(
        { error: "invalid_grant", error_description: "Invalid, expired, or already rotated refresh token" },
        { status: 400 }
      );
    }

    const { record, newToken } = rotated;
    const gen = await obtenerGeneracionRevocacion(record.usuario);
    const nowSec = Math.floor(Date.now() / 1000);

    const accessToken = signJwt(
      {
        iss: config.issuer,
        sub: record.usuario,
        aud: record.resource,
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
