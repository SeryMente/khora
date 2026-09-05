// @l0 L0-002 · @req UI-REVIEW/MANIFEST · Manifiesto Universal de Escenarios
import { NextResponse } from "next/server";
import { UI_REVIEW_SCENARIOS, SCREENS } from "@/lib/ui-review/registry";
import { ManifestSchema } from "@/lib/ui-review/types";
import { createHash } from "crypto";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  if (process.env.KHORA_UI_REVIEW_MODE !== "1") {
    return NextResponse.json({ error: "Not Found" }, { status: 404 });
  }

  const host = request.headers.get("host") || "localhost:3000";
  const protocol = request.headers.get("x-forwarded-proto") || "http";
  const baseUrl = `${protocol}://${host}`;

  // El sha debe reflejar el commit realmente desplegado. VERCEL_GIT_COMMIT_SHA
  // solo se puebla en despliegues disparados por Git; los despliegues por CLI
  // lo dejan vacío. Cuando no hay procedencia verificable se declara explícito
  // en lugar de mostrar un valor viejo que induzca a error.
  const releaseSha =
    process.env.VERCEL_GIT_COMMIT_SHA ||
    process.env.RELEASE_SHA ||
    process.env.NEXT_PUBLIC_RELEASE_SHA ||
    "sha-no-verificable";
  const fingerprintSource = JSON.stringify(UI_REVIEW_SCENARIOS);
  const sourceFingerprint = createHash("sha256").update(fingerprintSource).digest("hex").slice(0, 16);

  const manifestUrls = Object.values(UI_REVIEW_SCENARIOS).map(
    (s) => `${baseUrl}/ui-review/${s.screen}?scenario=${s.scenario}`
  );

  // Rutas prerenderizadas: legibles por modelos que no ejecutan JavaScript.
  const staticUrls = SCREENS.map((s) => `${baseUrl}/ui-review/${s}/estatico`);

  const body: ManifestSchema = {
    schema_version: "1.0.0",
    release_sha: releaseSha,
    source_fingerprint: sourceFingerprint,
    build_date: new Date().toISOString(),
    screens: SCREENS,
    scenarios: UI_REVIEW_SCENARIOS,
    manifest_urls: manifestUrls,
    static_urls: staticUrls,
    static_index: `${baseUrl}/ui-review/estatico`,
  };

  return NextResponse.json(body, {
    status: 200,
    headers: {
      "Cache-Control": "no-store, max-age=0, must-revalidate",
      "X-Robots-Tag": "noindex, nofollow",
    },
  });
}
