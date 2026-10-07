import { readdirSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const unitDir = fileURLToPath(new URL("../tests/unit/", import.meta.url));
const tsxCli = fileURLToPath(new URL("../node_modules/tsx/dist/cli.mjs", import.meta.url));
const files = readdirSync(unitDir)
  .filter((name) => name.endsWith(".test.ts"))
  .sort()
  .map((name) => fileURLToPath(new URL(`../tests/unit/${name}`, import.meta.url)));

if (files.length === 0) {
  throw new Error("No unit test files found");
}

const result = spawnSync(
  process.execPath,
  [tsxCli, "--import", "./tests/unit/setup.ts", "--test", ...files],
  {
    cwd: fileURLToPath(new URL("..", import.meta.url)),
    encoding: "utf8",
    maxBuffer: 50 * 1024 * 1024,
  },
);

if (result.stdout) process.stdout.write(result.stdout);
if (result.stderr) process.stderr.write(result.stderr);
if (result.error) {
  console.error(result.error);
}
console.log(`[unit-runner] status=${result.status ?? "null"} signal=${result.signal ?? "null"}`);
process.exitCode = typeof result.status === "number" ? result.status : 1;
