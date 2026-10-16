import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
const checks = [];
function run(name, args) { const r = spawnSync(process.execPath, args, { encoding: "utf8", env: process.env, maxBuffer: 20 * 1024 * 1024 }); const status = r.status === 0 ? "passed" : "failed"; checks.push({ name, status }); writeFileSync(`benchmark-${checks.length}.log`, (r.stdout || "") + (r.stderr || "") + (r.error ? String(r.error) : "")); console.log(`${name}: ${status}`); return status === "passed"; }
const inputs = ["app/components/ingreso/IngresoWorkspace.tsx", "app/components/ingreso/DictadoExperiencePanel.tsx", "lib/contracts/dictado-experience.ts", "lib/server/dictado-experience.ts", "app/api/dictado-experience/route.ts", "tests/unit/dictado_experience.test.ts", "e2e/dictado-experience.spec.ts", "e2e/dictado-edicion-continuidad.spec.ts"];
const fingerprint = createHash("sha256"); for (const p of inputs) fingerprint.update(p + "\0").update(readFileSync(p));
const units = run("Contratos, muestreo, privacidad y persistencia controlada", ["--import", "tsx", "--test", "tests/unit/dictado_experience.test.ts", "tests/unit/dictado_observability.test.ts", "tests/unit/edicion_in_situ.test.ts", "tests/unit/reconciliacion_manual.test.ts"]);
const browser = units && run("Continuidad del dictado y encuesta en navegador", ["node_modules/@playwright/test/cli.js", "test", "e2e/dictado-edicion-continuidad.spec.ts", "e2e/dictado-experience.spec.ts", "--workers=1", "--reporter=line"]);
let sourceSha = null; try { sourceSha = execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim(); } catch {}
const report = { schema: "khora-dictado-benchmark/v1", status: units && browser ? "passed" : "failed", testedAt: new Date().toISOString(), sourceSha, inputFingerprint: fingerprint.digest("hex"), checks, limits: ["Reconocimiento y endpoints externos controlados en las pruebas de navegador; no voz física ni SQL productivo.", "Cifrado real y consultas de almacenamiento contra doble de base de datos en pruebas unitarias; no certificación de despliegue.", "No mide fidelidad de voz ni comodidad automáticamente. Es un benchmark de contrato/regresión, no una puntuación universal."] };
writeFileSync("lib/generated/dictado-benchmark.json", JSON.stringify(report, null, 2) + "\n");
process.exitCode = units && browser ? 0 : 1;
