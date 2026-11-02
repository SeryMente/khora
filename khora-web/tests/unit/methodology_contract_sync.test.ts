import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";

// Git blob SHA captured from the authenticated canonical SeryMente/metodologia file.
// Pinning the private source avoids a runtime network/CLI credential dependency in CI.
const canonicalBlobSha = "232590a1f6339e2517e67038e1b5f7e8bd1638e3";

test("KHORA local contract matches the pinned canonical Metodología blob", () => {
  const localPath = path.resolve(process.cwd(), "contracts/FORMATO-REGISTRO-VERIFICACION-CICLO.schema.json");
  const localText = fs.readFileSync(localPath, "utf8").replace(/\r\n/g, "\n");
  const bytes = Buffer.from(localText, "utf8");
  const gitHeader = Buffer.from(`blob ${bytes.length}\0`, "utf8");
  const actualBlobSha = createHash("sha1").update(gitHeader).update(bytes).digest("hex");

  assert.equal(actualBlobSha, canonicalBlobSha, "El esquema local difiere del blob canónico revisado.");
  const local = JSON.parse(localText);
  assert.equal(local.contract_id, "FORMATO-REGISTRO-VERIFICACION-CICLO");
  assert.equal(local.version, "v1.7.7");
  assert.equal(local.status, "CANÓNICO");
});
