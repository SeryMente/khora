// @l0 L0-002 · @req UI-REVIEW/EXPORT · Script reproducible de exportación Playwright
import { chromium } from "@playwright/test";
import fs from "fs";
import path from "path";
import { createHash } from "crypto";
import { ExportSummary, ManifestSchema } from "../lib/ui-review/types";

function sha256File(filepath: string): string {
  const buffer = fs.readFileSync(filepath);
  return createHash("sha256").update(buffer).digest("hex");
}

async function main() {
  const args = process.argv.slice(2);
  let baseUrl = "http://localhost:3000";
  let outDir = path.join(process.cwd(), "ui-review-export");

  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--base-url" && args[i + 1]) {
      baseUrl = args[i + 1].replace(/\/$/, "");
      i++;
    } else if (args[i] === "--out" && args[i + 1]) {
      outDir = path.resolve(args[i + 1]);
      i++;
    }
  }

  console.log(`🚀 Iniciando exportación UI Review contra ${baseUrl} -> ${outDir}`);

  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }

  // 1. Obtener manifest
  const manifestUrl = `${baseUrl}/ui-review/manifest.json`;
  console.log(`📡 Consultando manifiesto en ${manifestUrl}...`);
  const manifestRes = await fetch(manifestUrl);

  if (!manifestRes.ok) {
    console.error(`❌ Error obteniendo manifiesto HTTP ${manifestRes.status}. Asegúrate que KHORA_UI_REVIEW_MODE=1 está activo.`);
    process.exit(1);
  }

  const manifest: ManifestSchema = await manifestRes.json();
  const manifestPath = path.join(outDir, "manifest.json");
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2), "utf8");

  const browser = await chromium.launch({ headless: true });
  const scenarioEntries = Object.values(manifest.scenarios);

  const summaryScenarios: ExportSummary["scenarios"] = [];
  let totalArtifacts = 1; // manifest.json counts as artifact

  for (const sc of scenarioEntries) {
    console.log(`📸 Procesando escenario: ${sc.screen} · ${sc.scenario}...`);

    const consoleErrors: string[] = [];
    const failedRequests: string[] = [];

    // Context Desktop
    const contextDesktop = await browser.newContext({
      viewport: { width: 1440, height: 900 },
    });
    const pageDesktop = await contextDesktop.newPage();

    pageDesktop.on("console", (msg) => {
      if (msg.type() === "error") consoleErrors.push(msg.text());
    });
    pageDesktop.on("requestfailed", (req) => {
      failedRequests.push(`${req.method()} ${req.url()} - ${req.failure()?.errorText}`);
    });

    const targetUrlDesktop = `${baseUrl}/ui-review/${sc.screen}?scenario=${sc.scenario}&viewport=desktop`;
    await pageDesktop.goto(targetUrlDesktop, { waitUntil: "networkidle" });

    const desktopPngName = `${sc.screen}_${sc.scenario}_desktop.png`;
    const desktopPngPath = path.join(outDir, desktopPngName);
    await pageDesktop.screenshot({ path: desktopPngPath, fullPage: true });

    // Snapshot Text / Accessibility
    const pageText = await pageDesktop.innerText("body");
    const txtName = `${sc.screen}_${sc.scenario}.txt`;
    const txtPath = path.join(outDir, txtName);
    fs.writeFileSync(txtPath, pageText, "utf8");

    await contextDesktop.close();

    // Context Mobile
    const contextMobile = await browser.newContext({
      viewport: { width: 390, height: 844 },
      isMobile: true,
    });
    const pageMobile = await contextMobile.newPage();

    pageMobile.on("console", (msg) => {
      if (msg.type() === "error") consoleErrors.push(msg.text());
    });
    pageMobile.on("requestfailed", (req) => {
      failedRequests.push(`${req.method()} ${req.url()} - ${req.failure()?.errorText}`);
    });

    const targetUrlMobile = `${baseUrl}/ui-review/${sc.screen}?scenario=${sc.scenario}&viewport=mobile`;
    await pageMobile.goto(targetUrlMobile, { waitUntil: "networkidle" });

    const mobilePngName = `${sc.screen}_${sc.scenario}_mobile.png`;
    const mobilePngPath = path.join(outDir, mobilePngName);
    await pageMobile.screenshot({ path: mobilePngPath, fullPage: true });

    await contextMobile.close();

    const desktopHash = sha256File(desktopPngPath);
    const mobileHash = sha256File(mobilePngPath);
    const txtHash = sha256File(txtPath);

    totalArtifacts += 3;

    summaryScenarios.push({
      screen: sc.screen,
      scenario: sc.scenario,
      url: `${baseUrl}/ui-review/${sc.screen}?scenario=${sc.scenario}`,
      status: sc.status,
      console_errors: consoleErrors,
      failed_requests: failedRequests,
      desktop_png: { file: desktopPngName, sha256: desktopHash },
      mobile_png: { file: mobilePngName, sha256: mobileHash },
      snapshot_txt: { file: txtName, sha256: txtHash },
    });
  }

  await browser.close();

  const summary: ExportSummary = {
    schema_version: manifest.schema_version,
    release_sha: manifest.release_sha,
    source_fingerprint: manifest.source_fingerprint,
    timestamp: new Date().toISOString(),
    base_url: baseUrl,
    total_scenarios: summaryScenarios.length,
    total_artifacts: totalArtifacts + 1, // include summary.json itself
    scenarios: summaryScenarios,
  };

  const summaryPath = path.join(outDir, "summary.json");
  fs.writeFileSync(summaryPath, JSON.stringify(summary, null, 2), "utf8");

  console.log(`\n✅ Exportación completada exitosamente.`);
  console.log(`📁 Artefactos generados en: ${outDir}`);
  console.log(`📊 Escenarios procesados: ${summaryScenarios.length} | Artefactos totales: ${totalArtifacts + 1}`);
}

main().catch((err) => {
  console.error("Fallo fatal en exportación:", err);
  process.exit(1);
});
