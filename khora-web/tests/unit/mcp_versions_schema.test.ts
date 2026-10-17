import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import * as crypto from "node:crypto";
import { fileURLToPath } from "node:url";
import ts from "typescript";

// Real service/diagnostic/crypto sources; only the database boundary is replaced.
// This fixture validates projections against migration 006, not live PostgreSQL.
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const migration = fs.readFileSync(path.join(root, "db/migrations/006_versiones.sql"), "utf8");
const versionDdl = migration.match(/CREATE TABLE IF NOT EXISTS volcado_version\s*\(([\s\S]*?)\);/i);
assert.ok(versionDdl, "version schema must come from the actual migration");
const columns = new Set(versionDdl[1].split(",").map(line => line.trim().split(/\s+/)[0]));
const id = "00000000-0000-4000-8000-000000000076";
const text = "Texto sintético: áéí, espacios  y\nsaltos; no es un dictado real.";
const sha = crypto.createHash("sha256").update(text, "utf8").digest("hex");

function loadModule(relative: string, modules: Record<string, unknown>) {
  const source = fs.readFileSync(path.join(root, relative), "utf8");
  const exports: Record<string, any> = {};
  const code = ts.transpileModule(source, {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS },
    reportDiagnostics: true,
  });
  assert.equal(code.diagnostics?.filter(d => d.category === ts.DiagnosticCategory.Error).length, 0);
  vm.runInNewContext(code.outputText, {
    exports, Buffer,
    // No ambient credentials and no mutable shared process.env.
    process: { env: { X_KHORA_KEY: "7a".repeat(32) } },
    require: (name: string) => {
      assert.ok(Object.hasOwn(modules, name), `unexpected dependency: ${name}`);
      return modules[name];
    },
  }, { filename: relative, timeout: 5000 });
  return exports;
}
const diagnostics = loadModule("lib/server/mcp-diagnostics.ts", { "node:crypto": crypto });
const encryption = loadModule("lib/server/cripto.ts", { crypto });
type Options = {
  empty?: boolean; missing?: boolean; missingVersion?: boolean;
  versionsError?: string; auditError?: string; corrupt?: boolean;
};

function fixture(options: Options = {}) {
  const calls: Array<{ sql: string; params: any[] }> = [];
  const principal = {
    id, folio: 76, titulo: "Fixture sin datos personales", estado: "en_revision",
    version_aprobada: 2, texto: encryption.cifrarTexto(text), usuario: "owner@example.invalid",
  };
  const versions = [1, 2].map(version => ({
    version, texto: encryption.cifrarTexto(text), sha256: sha,
    motivo: "fixture", creado_en: `2026-01-0${version}T00:00:00Z`,
  }));
  const query = async (sql: string, params: any[] = []) => {
    calls.push({ sql, params });
    assert.match(sql.trim(), /^SELECT\b/i, "read service must never bootstrap or mutate");
    assert.doesNotMatch(sql, new RegExp(id), "business identifiers must stay parameterized");
    if (sql.includes("FROM information_schema.columns")) {
      return { rows: Object.keys(principal).map(column_name => ({ column_name })) };
    }
    if (sql.includes("FROM volcado_version")) {
      if (options.versionsError) throw { code: options.versionsError, message: "PRIVATE_SQL_FIXTURE" };
      const projection = sql.match(/SELECT\s+([\s\S]*?)\s+FROM\s+volcado_version/i);
      assert.ok(projection);
      const fields = projection[1].split(",").map(f => f.trim());
      for (const field of fields) {
        if (/^NULL::text AS usuario$/i.test(field)) continue;
        if (!columns.has(field)) throw { code: "42703", message: "PRIVATE_SQL_FIXTURE" };
      }
      assert.equal(params[0], id);
      const rows = options.empty || options.missingVersion ? [] : versions
        .filter(v => params.length === 1 || v.version === params[1])
        .map(v => Object.fromEntries(fields.map(field => /^NULL::text AS usuario$/i.test(field)
          ? ["usuario", null]
          : [field, field === "texto" && options.corrupt ? "khc1.invalid" : (v as any)[field]])));
      return { rowCount: rows.length, rows };
    }
    if (sql.includes("FROM volcado_revision_auditoria")) {
      if (options.auditError) throw { code: options.auditError, message: "PRIVATE_SQL_FIXTURE" };
      assert.equal(params[0], id);
      return { rows: [{ accion: "fixture", version: 2, usuario: "reviewer@example.invalid" }] };
    }
    assert.match(sql, /FROM volcado\b/);
    if (sql.includes("WHERE folio")) assert.equal(params[0], 76);
    if (sql.includes("WHERE id")) assert.equal(params[0], id);
    const rows = options.missing ? [] : [principal];
    return { rowCount: rows.length, rows };
  };
  const tools = loadModule("lib/server/mcp-tools.ts", {
    "./mcp-diagnostics": diagnostics,
    "./mcp-db": { getMcpReadOnlyDb: () => ({ query }) },
    "./cripto": encryption,
  });
  return { tools, calls };
}

test("migration 006 contains no per-version usuario column", () => {
  assert.equal(columns.has("usuario"), false);
  assert.ok(columns.has("version") && columns.has("texto") && columns.has("creado_en"));
});
test("folio history reads existing versions and preserves approval/audit without invented authors", async () => {
  const { tools, calls } = fixture();
  const result = await tools.toolKhoraVersionesVolcado({ volcado_id: "76" });
  assert.equal(result.completo, true);
  assert.equal(result.secciones_fallidas.length, 0);
  assert.equal(result.versiones.map((v: any) => v.version).join(","), "1,2");
  assert.equal(result.versiones.map((v: any) => v.es_aprobada).join(","), "false,true");
  assert.ok(result.versiones.every((v: any) => Object.hasOwn(v, "usuario") && v.usuario === null));
  assert.equal(result.auditoria[0].usuario, "reviewer@example.invalid");
  assert.match(calls.find(c => c.sql.includes("FROM volcado_version"))!.sql, /ORDER BY version ASC/);
});
test("UUID history does not reinterpret the identifier as a numeric folio", async () => {
  const { tools, calls } = fixture();
  assert.equal((await tools.toolKhoraVersionesVolcado({ volcado_id: id })).completo, true);
  assert.ok(!calls.some(c => c.sql.includes("WHERE folio")));
});
test("successful empty history is distinct from a failed query", async () => {
  const { tools } = fixture({ empty: true });
  const result = await tools.toolKhoraVersionesVolcado({ volcado_id: id });
  assert.equal(result.completo, true);
  assert.equal(result.versiones.length, 0);
  assert.equal(result.diagnosticos.length, 0);
});
for (const [code, diagnostic] of [
  ["42703", "MCP_DATABASE_SCHEMA"], ["42P01", "MCP_DATABASE_SCHEMA"],
  ["42501", "MCP_DATABASE_DENIED"], ["08006", "MCP_DATABASE_UNAVAILABLE"],
]) {
  test(`history failure ${code} remains partial and sanitized`, async () => {
    const { tools } = fixture({ versionsError: code });
    const result = await tools.toolKhoraVersionesVolcado({ volcado_id: id });
    assert.equal(result.completo, false);
    assert.equal(result.secciones_fallidas.join(","), "versiones");
    assert.equal(result.versiones.length, 0);
    assert.equal(result.auditoria.length, 1);
    assert.equal(result.diagnosticos[0].code, diagnostic);
    assert.ok(!JSON.stringify(result).includes("PRIVATE_SQL_FIXTURE"));
  });
}
test("audit failure never discards recovered versions", async () => {
  const { tools } = fixture({ auditError: "42501" });
  const result = await tools.toolKhoraVersionesVolcado({ volcado_id: id });
  assert.equal(result.completo, false);
  assert.equal(result.secciones_fallidas.join(","), "auditoria");
  assert.equal(result.versiones.length, 2);
  assert.equal(result.diagnosticos[0].code, "MCP_DATABASE_DENIED");
});
test("both failed sections remain explicit and do not claim empty history", async () => {
  const { tools } = fixture({ versionsError: "42703", auditError: "42501" });
  const result = await tools.toolKhoraVersionesVolcado({ volcado_id: id });
  assert.equal(result.completo, false);
  assert.equal(result.secciones_fallidas.join(","), "versiones,auditoria");
  assert.equal(result.diagnosticos.length, 2);
});
for (const identifier of ["76", id]) {
  test(`missing volcado (${identifier === "76" ? "folio" : "UUID"}) never becomes an empty history`, async () => {
    const { tools } = fixture({ missing: true });
    await assert.rejects(tools.toolKhoraVersionesVolcado({ volcado_id: identifier }),
      (error: any) => error.code === "MCP_VOLCADO_NOT_FOUND");
  });
}
test("historical read decrypts exact UTF-8, preserves hash and reports unknown author as null", async () => {
  const { tools } = fixture();
  const result = await tools.toolKhoraLeerVolcado({ id: "76", version: 2 });
  assert.equal(result.texto, text);
  assert.equal(crypto.createHash("sha256").update(result.texto, "utf8").digest("hex"), sha);
  assert.equal(result.sha256, sha);
  assert.equal(result.usuario, null);
  assert.equal(result.es_version_historica, true);
  assert.equal(result.error_descifrado, false);
});
test("missing version is not synthesized from current text", async () => {
  const { tools } = fixture({ missingVersion: true });
  await assert.rejects(tools.toolKhoraLeerVolcado({ id, version: 99 }),
    (error: any) => error.code === "MCP_VERSION_NOT_FOUND");
});
test("historical schema/permission failures propagate rather than return invented content", async () => {
  for (const code of ["42703", "42501"]) {
    const { tools } = fixture({ versionsError: code });
    await assert.rejects(tools.toolKhoraLeerVolcado({ id, version: 2 }),
      (error: any) => error.code === code);
  }
});
test("historical decryption failure is explicit", async () => {
  const { tools } = fixture({ corrupt: true });
  const result = await tools.toolKhoraLeerVolcado({ id, version: 2 });
  assert.equal(result.error_descifrado, true);
  assert.equal(result.texto, "[ERROR DE DESCIFRADO]");
  assert.equal(result.diagnosticos[0].code, "MCP_DECRYPTION_FAILED");
});
test("current text retains its own real owner and exact text", async () => {
  const { tools, calls } = fixture();
  const result = await tools.toolKhoraLeerVolcado({ id });
  assert.equal(result.texto, text);
  assert.equal(result.usuario, "owner@example.invalid");
  assert.equal(result.error_descifrado, false);
  assert.ok(!calls.some(c => c.sql.includes("FROM volcado_version")));
});
test("listing and searching still decrypt content and report coverage", async () => {
  const { tools } = fixture();
  const listing = await tools.toolKhoraListarVolcados({ limite: 1, offset: 0 });
  assert.equal(listing.completo, true);
  assert.equal(listing.volcados[0].extracto, text);
  const search = await tools.toolKhoraBuscarVolcados({ busqueda: "sintetico", limite: 1 });
  assert.equal(search.completo, true);
  assert.equal(search.total_coincidencias, 1);
  assert.equal(search.cobertura.ilegibles, 0);
});
test("repeated version reads never create a version or modify any table", async () => {
  const { tools, calls } = fixture();
  const first = await tools.toolKhoraVersionesVolcado({ volcado_id: id });
  const second = await tools.toolKhoraVersionesVolcado({ volcado_id: id });
  assert.equal(JSON.stringify(first), JSON.stringify(second));
  assert.ok(calls.every(c => /^\s*SELECT\b/i.test(c.sql)));
});