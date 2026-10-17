import { spawnSync, execFileSync } from "node:child_process";
import { createHash, randomUUID } from "node:crypto";
import { readFileSync, writeFileSync, renameSync, openSync, closeSync, unlinkSync, mkdirSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { pathToFileURL } from "node:url";

export const inputs = [
  "app/components/os/KhoraShell.tsx", "app/components/shared/IngresoView.tsx", "app/components/ingreso/AudioActivity.tsx", "app/components/ingreso/RecoveryDrawer.tsx", "app/components/ingreso/ingreso-studio.module.css", "lib/custodia/contrato.ts", "lib/custodia/recuperacion.ts", "lib/client/custodia-local.ts", "lib/server/custodia-recuperacion.ts", "app/api/dictado/checkpoint/route.ts", "tests/unit/custodia_recuperacion.test.ts", "e2e/ingreso-recovery-redesign.spec.ts", "e2e/custodia-local-recovery.spec.ts", "tests/browser/custodia-workspace.mjs", "tests/integration/ingreso-recuperacion-postgres.ts", "lib/ui-review/registry.ts",
  "app/components/ingreso/IngresoWorkspace.tsx", "app/components/ingreso/DictadoExperiencePanel.tsx",
  "lib/client/dictado-experience-delivery.ts", "lib/client/dictado-observability.ts",
  "lib/contracts/dictado-experience.ts", "lib/server/dictado-experience.ts", "app/api/dictado-experience/route.ts",
  "tests/unit/dictado_experience.test.ts", "tests/unit/dictado_experience_hardening.test.ts",
  "tests/unit/dictado_observability.test.ts", "tests/unit/edicion_in_situ.test.ts", "tests/unit/reconciliacion_manual.test.ts",
  "e2e/dictado-experience.spec.ts", "e2e/dictado-edicion-continuidad.spec.ts",
  "scripts/benchmark-dictado.mjs", "playwright.benchmark.config.ts", "playwright.config.ts", "package.json", "package-lock.json",
];
const stages = [
  { name: "Contratos, entrega, muestreo, privacidad y persistencia controlada", args: ["--import", "tsx", "--test", "tests/unit/custodia_recuperacion.test.ts", "tests/unit/dictado_experience.test.ts", "tests/unit/dictado_experience_hardening.test.ts", "tests/unit/dictado_observability.test.ts", "tests/unit/edicion_in_situ.test.ts", "tests/unit/reconciliacion_manual.test.ts"] },
  { name: "Continuidad del dictado y encuesta en navegador", args: ["node_modules/@playwright/test/cli.js", "test", "e2e/dictado-edicion-continuidad.spec.ts", "e2e/dictado-experience.spec.ts", "e2e/ingreso-recovery-redesign.spec.ts", "e2e/custodia-local-recovery.spec.ts", "--workers=1", "--reporter=line", "--config=playwright.benchmark.config.ts"] },
];
/** @param {{cwd?: string, run?: (command: string, args: string[], options: import("node:child_process").SpawnSyncOptionsWithStringEncoding) => {status: number | null, error?: Error, signal?: string | null, stdout?: string, stderr?: string}, sourceInputs?: string[]}} options */
export function runBenchmark({ cwd = process.cwd(), run = spawnSync, sourceInputs = inputs } = {}) {
  const output = resolve(cwd, "lib/generated/dictado-benchmark.json");
  const lock = resolve(cwd, ".dictado-benchmark.lock");
  // A second runner must not overwrite an active run. Stale locks require explicit inspection.
  let fd; try { fd = openSync(lock, "wx"); writeFileSync(fd, String(process.pid)); }
  catch { console.error("Benchmark bloqueado: otra ejecución o candado pendiente; no se declara aprobado."); return 1; }
  const report = { schema: "khora-dictado-benchmark/v1", status: "running", testedAt: new Date().toISOString(),
    completedAt: null, sourceSha: null, workingTreeDirty: null, inputFingerprint: null,
    checks: stages.map(s => ({ name: s.name, status: "not_run" })),
    limits: ["Reconocimiento y endpoints externos controlados; no voz física ni SQL productivo.",
      "Persistencia probada con doble de base de datos; no certificación de despliegue.",
      "No mide fidelidad de voz ni comodidad automáticamente. Contrato/regresión, no puntuación universal.",
      "La huella identifica entradas declaradas. sourceSha no incluye cambios locales; revisar workingTreeDirty."] };
  const publish = () => {
    mkdirSync(dirname(output), { recursive: true });
    const temporary = output + "." + randomUUID() + ".tmp";
    writeFileSync(temporary, JSON.stringify(report, null, 2) + "\n"); renameSync(temporary, output);
  };
  const interrupted = () => { report.status = "failed"; report.completedAt = new Date().toISOString(); publish(); process.exit(130); };
  try {
    // Invalidate the previous green BEFORE hashing, git, test startup or any other fallible precondition.
    publish(); process.once("SIGINT", interrupted); process.once("SIGTERM", interrupted);
    const fingerprint = createHash("sha256");
    for (const p of sourceInputs) fingerprint.update(p + "\0").update(readFileSync(resolve(cwd, p)));
    report.inputFingerprint = fingerprint.digest("hex");
    try {
      report.sourceSha = execFileSync("git", ["rev-parse", "HEAD"], { cwd, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();
      report.workingTreeDirty = execFileSync("git", ["status", "--porcelain", "--", ".", ":(exclude)lib/generated/dictado-benchmark.json"], { cwd, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim().length > 0;
    } catch { /* unknown provenance remains null, never a fabricated SHA */ }
    for (let i = 0; i < stages.length; i++) {
      const r = run(process.execPath, stages[i].args, { cwd, encoding: "utf8", env: process.env, maxBuffer: 20 * 1024 * 1024, timeout: 900_000 });
      report.checks[i].status = r.status === 0 && !r.error && !r.signal ? "passed" : "failed";
      writeFileSync(resolve(cwd, `benchmark-${i + 1}.log`), (r.stdout || "") + (r.stderr || "") + (r.error ? String(r.error) : ""));
      publish(); console.log(stages[i].name + ": " + report.checks[i].status);
      if (report.checks[i].status !== "passed") break;
    }
    report.status = report.checks.every(c => c.status === "passed") ? "passed" : "failed";
  } catch { report.status = "failed"; }
  finally {
    report.completedAt = new Date().toISOString();
    try { publish(); } finally {
      process.removeListener("SIGINT", interrupted); process.removeListener("SIGTERM", interrupted);
      closeSync(fd); unlinkSync(lock);
    }
  }
  return report.status === "passed" ? 0 : 1;
}
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) process.exitCode = runBenchmark();
