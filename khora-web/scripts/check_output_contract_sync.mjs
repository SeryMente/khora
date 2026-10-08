import fs from "node:fs/promises";
import crypto from "node:crypto";

const ROOT = new URL("..", import.meta.url).pathname;
const localPath = new URL("../contracts/FORMATO-REGISTRO-VERIFICACION-CICLO.schema.json", import.meta.url);
const runtimePath = new URL("../lib/server/normative-runtime.ts", import.meta.url);
const contractPath = new URL("../lib/server/output-contract.ts", import.meta.url);

const canonicalApi = "https://api.github.com/repos/SeryMente/metodologia/contents/";

function sha256(value) {
  return crypto.createHash("sha256").update(value, "utf8").digest("hex");
}

function extractVersion(source, pattern, label) {
  const match = source.match(pattern);
  if (!match) throw new Error(label + "_VERSION_NOT_FOUND");
  return match[1];
}

async function fetchGithubFile(path) {
  const response = await fetch(canonicalApi + path + "?ref=main", {
    headers: { Accept: "application/vnd.github+json", "User-Agent": "Khora-Output-Contract-Sync/1.0" },
    cache: "no-store",
  });
  if (!response.ok) throw new Error("CANONICAL_FETCH_" + path + "_" + response.status);
  const payload = await response.json();
  if (payload.encoding !== "base64" || typeof payload.content !== "string" || typeof payload.sha !== "string") {
    throw new Error("CANONICAL_PAYLOAD_INVALID_" + path);
  }
  return { content: Buffer.from(payload.content.replace(/\n/g, ""), "base64").toString("utf8"), blobSha: payload.sha };
}

const [canonicalSchemaRecord, canonicalFormatRecord, localSchema, runtimeSource, contractSource] = await Promise.all([
  fetchGithubFile("FORMATO-REGISTRO-VERIFICACION-CICLO.schema.json"),
  fetchGithubFile("FORMATO-REGISTRO-VERIFICACION-CICLO.md"),
  fs.readFile(localPath, "utf8"),
  fs.readFile(runtimePath, "utf8"),
  fs.readFile(contractPath, "utf8"),
]);

const canonicalSchema = canonicalSchemaRecord.content;
const canonicalFormat = canonicalFormatRecord.content;
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
