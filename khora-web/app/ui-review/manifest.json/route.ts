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

  const releaseSha = process.env.VERCEL_GIT_COMMIT_SHA || process.env.RELEASE_SHA || "dev-local-sha";
  const fingerprintSource = JSON.stringify(UI_REVIEW_SCENARIOS);
  const sourceFingerprint = createHash("sha256").update(fingerprintSource).digest("hex").slice(0, 16);

  const manifestUrls = Object.values(UI_REVIEW_SCENARIOS).map(
    (s) => `${baseUrl}/ui-review/${s.screen}?scenario=${s.scenario}`
  );

  const body: ManifestSchema = {
    schema_version: "1.0.0",
    release_sha: releaseSha,
    source_fingerprint: sourceFingerprint,
    build_date: new Date().toISOString(),
    screens: SCREENS,
    scenarios: UI_REVIEW_SCENARIOS,
    manifest_urls: manifestUrls,
  };

  return NextResponse.json(body, {
    status: 200,
    headers: {
      "Cache-Control": "no-store, max-age=0, must-revalidate",
      "X-Robots-Tag": "noindex, nofollow",
    },
  });
}
