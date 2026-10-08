import fs from "node:fs/promises";
import crypto from "node:crypto";

const ROOT = new URL("..", import.meta.url).pathname;
const localPath = new URL("../contracts/FORMATO-REGISTRO-VERIFICACION-CICLO.schema.json", import.meta.url);
const runtimePath = new URL("../lib/server/normative-runtime.ts", import.meta.url);
const contractPath = new URL("../lib/server/output-contract.ts", import.meta.url);

const canonicalSchemaUrl = "https://raw.githubusercontent.com/SeryMente/metodologia/main/FORMATO-REGISTRO-VERIFICACION-CICLO.schema.json";
const canonicalFormatUrl = "https://raw.githubusercontent.com/SeryMente/metodologia/main/FORMATO-REGISTRO-VERIFICACION-CICLO.md";

function sha256(value) {
  return crypto.createHash("sha256").update(value, "utf8").digest("hex");
}

function extractVersion(source, pattern, label) {
  const match = source.match(pattern);
  if (!match) throw new Error(label + "_VERSION_NOT_FOUND");
  return match[1];
}

const [canonicalSchema, canonicalFormat, localSchema, runtimeSource, contractSource] = await Promise.all([
  fetch(canonicalSchemaUrl, { cache: "no-store" }).then((r) => {
    if (!r.ok) throw new Error("CANONICAL_SCHEMA_FETCH_" + r.status);
    return r.text();
  }),
  fetch(canonicalFormatUrl, { cache: "no-store" }).then((r) => {
    if (!r.ok) throw new Error("CANONICAL_FORMAT_FETCH_" + r.status);
    return r.text();
  }),
  fs.readFile(localPath, "utf8"),
  fs.readFile(runtimePath, "utf8"),
  fs.readFile(contractPath, "utf8"),
]);

if (canonicalSchema !== localSchema) {
  throw new Error("OUTPUT_CONTRACT_SCHEMA_DRIFT:" + sha256(canonicalSchema) + "!=" + sha256(localSchema));
}

const schema = JSON.parse(canonicalSchema);
const canonicalFormatVersion = extractVersion(canonicalFormat, /^\*\*Versión:\*\*\s*(v\d+\.\d+\.\d+)/m, "CANONICAL_FORMAT");
const runtimeVersion = extractVersion(runtimeSource, /REQUIRED_OUTPUT_FORMAT_VERSION\s*=\s*"(v\d+\.\d+\.\d+)"/, "RUNTIME");
const implementationVersion = extractVersion(contractSource, /OUTPUT_FORMAT_VERSION\s*=\s*"(v\d+\.\d+\.\d+)"/, "IMPLEMENTATION");

if (schema.version !== canonicalFormatVersion) throw new Error("OUTPUT_CONTRACT_SCHEMA_VERSION_MISMATCH");
if (schema.version !== runtimeVersion) throw new Error("OUTPUT_CONTRACT_RUNTIME_VERSION_MISMATCH");
if (schema.version !== implementationVersion) throw new Error("OUTPUT_CONTRACT_IMPLEMENTATION_VERSION_MISMATCH");
if (schema.policy?.verified_cycle_requires_exact_output !== true) throw new Error("OUTPUT_CONTRACT_EXACT_OUTPUT_POLICY_MISSING");
if (schema.policy?.release_requires_validated_output !== true) throw new Error("OUTPUT_CONTRACT_RELEASE_POLICY_MISSING");

const hudFields = schema.lines?.find((line) => line.field === "hud")?.fields?.map((field) => field.name);
const expectedHud = ["CI","UBIC","RDC","C","RDC-USO","S","F","K","T","RDC-CNX","USR"];
if (JSON.stringify(hudFields) !== JSON.stringify(expectedHud)) {
  throw new Error("OUTPUT_CONTRACT_HUD_FIELDS_DRIFT");
}

console.log("OUTPUT_CONTRACT_SYNC_OK", JSON.stringify({
  version: schema.version,
  schema_sha256: sha256(canonicalSchema),
  hud_fields: hudFields,
}));
