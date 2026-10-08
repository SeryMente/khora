import fs from "node:fs";

function read(path) {
  return fs.readFileSync(new URL(path, import.meta.url), "utf8");
}

const root = new URL("..", import.meta.url);
const runtime = fs.readFileSync(new URL("../lib/server/normative-runtime.ts", import.meta.url), "utf8");
const output = fs.readFileSync(new URL("../lib/server/output-contract.ts", import.meta.url), "utf8");
const norm = fs.readFileSync(new URL("../lib/server/norm-check.ts", import.meta.url), "utf8");
const mcp = fs.readFileSync(new URL("../lib/server/mcp-normative.ts", import.meta.url), "utf8");
const route = fs.readFileSync(new URL("../app/api/mcp/route.ts", import.meta.url), "utf8");

const checks = [
  ["runtime_version", /REQUIRED_OUTPUT_FORMAT_VERSION\s*=\s*"v1\.7\.6"/.test(runtime)],
  ["renderer_version", /OUTPUT_FORMAT_VERSION\s*=\s*"v1\.7\.6"/.test(output)],
  ["norm_receipt_output_text", /output_text:\s*string/.test(norm)],
  ["norm_parses_output", /parseCanonicalCycleOutput\(/.test(norm)],
  ["norm_round_trips_output", /renderCanonicalCycleOutput\(parsedOutput\)/.test(norm)],
  ["norm_requires_ci_positive", /parsedOutput\.ci !== "✓"/.test(norm)],
  ["norm_hashes_output", /sha256Output\(receipt\.output_text\)/.test(norm)],
  ["mcp_release_reads_output", /output_text\?: unknown/.test(mcp)],
  ["mcp_release_hashes_output", /sha256Output\(releasedOutput\)/.test(mcp)],
  ["mcp_release_requires_verified", /row\.status !== "VERIFIED"/.test(mcp)],
  ["route_release_primary_content", /text: res\.released_output/.test(route)],
  ["route_format_version", /enum: \["v1\.7\.6"\]/.test(route)],
];

const failed = checks.filter(([,ok]) => !ok).map(([name]) => name);
if (failed.length) throw new Error("OUTPUT_CONTRACT_INTEGRATION_DRIFT:" + failed.join(","));
console.log("OUTPUT_CONTRACT_INTEGRATION_OK", checks.map(([name]) => name).join(","));
