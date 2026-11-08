// Unmodified upstream assets, build time only. No tenant configuration or secrets.
import { createHash } from "node:crypto";
import { createReadStream, createWriteStream } from "node:fs";
import { mkdir, mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { Transform, Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import { pathToFileURL } from "node:url";
import AdmZip from "adm-zip";

export const VERSION = "0.12.3";
export const DIGEST = "6d716039a5c15ecdb1db12f99dd9c79ea5c86d3d7bbd9a67054dd26f1f534747";
const SIZE = 105980169;
const URL = "https://files.pythonhosted.org/packages/22/05/a40238c1fab2956e6371729482f7389c6b1fec936198c733b0d84f1d5722/open_webui-0.12.3-py3-none-any.whl";
const PREFIX = "open_webui/frontend/";
const LICENSE_PREFIX = "open_webui-0.12.3.dist-info/licenses/";
const sha256 = data => createHash("sha256").update(data).digest("hex");

export function staticDestination(name) {
  if (name.includes("\\") || name.split("/").includes("..")) throw Error("UPSTREAM_STATIC_UNSAFE_PATH");
  if (name.startsWith(PREFIX)) {
    const relative = name.slice(PREFIX.length);
    if (["_app/", "assets/", "licenses/"].some(p => relative.startsWith(p))) return relative;
  }
  if (name.startsWith(LICENSE_PREFIX)) {
    const relative = name.slice(LICENSE_PREFIX.length);
    if (["LICENSE", "LICENSE_HISTORY", "LICENSE_NOTICE"].includes(relative)) return "OPENWEBUI-" + relative + ".txt";
  }
  return null;
}

async function verifyWheel(file) {
  const hash = createHash("sha256"); let size = 0;
  for await (const chunk of createReadStream(file)) { size += chunk.length; hash.update(chunk); }
  if (size !== SIZE || hash.digest("hex") !== DIGEST) throw Error("UPSTREAM_WHEEL_INTEGRITY_FAILED");
}

async function downloadWheel() {
  const dir = await mkdtemp(path.join(tmpdir(), "khora-openwebui-static-"));
  const file = path.join(dir, "upstream.whl");
  const response = await fetch(URL, { redirect: "error", signal: AbortSignal.timeout(120000) });
  if (!response.ok || !response.body) throw Error("UPSTREAM_WHEEL_DOWNLOAD_FAILED");
  let size = 0;
  const limit = new Transform({ transform(chunk, _encoding, callback) {
    size += chunk.length;
    callback(size > SIZE ? Error("UPSTREAM_WHEEL_SIZE_EXCEEDED") : null, chunk);
  }});
  await pipeline(Readable.fromWeb(response.body), limit, createWriteStream(file, { flags: "wx" }));
  return file;
}

export async function prepare(file, publicRoot) {
  await verifyWheel(file);
  const zip = new AdmZip(file);
  const manifest = [];
  for (const entry of zip.getEntries()) {
    if (entry.isDirectory) continue;
    const relative = staticDestination(entry.entryName);
    if (!relative) continue;
    const bytes = entry.getData(), destination = path.join(publicRoot, relative);
    try {
      const previous = await readFile(destination);
      if (!previous.equals(bytes)) throw Error("UPSTREAM_STATIC_COLLISION");
    } catch (error) { if (error.code !== "ENOENT") throw error; }
    await mkdir(path.dirname(destination), { recursive: true });
    await writeFile(destination, bytes);
    manifest.push({ path: relative, bytes: bytes.length, sha256: sha256(bytes) });
  }
  if (!manifest.some(x => x.path === "assets/fonts/Inter-Variable.ttf")
      || !manifest.some(x => x.path === "OPENWEBUI-LICENSE.txt")
      || !manifest.some(x => x.path.startsWith("_app/immutable/"))) {
    throw Error("UPSTREAM_STATIC_INCOMPLETE");
  }
  const result = { version: VERSION, wheel_sha256: DIGEST, files: manifest };
  await writeFile(path.join(publicRoot, "openwebui-static-manifest.json"), JSON.stringify(result));
  console.log(JSON.stringify({ event: "OPENWEBUI_STATIC_VERIFIED", version: VERSION,
    wheel_sha256: DIGEST, files: manifest.length,
    bytes: manifest.reduce((sum, x) => sum + x.bytes, 0) }));
  return result;
}

if (process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url) {
  if (process.env.KHORA_CHAT_ENABLED !== "1") console.log("OPENWEBUI_STATIC_NOT_ENABLED");
  else {
    try { await prepare(process.argv[2] || await downloadWheel(), path.resolve("public")); }
    catch { console.error("OPENWEBUI_STATIC_PREBUILD_FAILED"); process.exitCode = 1; }
  }
}
