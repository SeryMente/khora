import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { cifrarStream, descifrarStream, descifrarBytes } from "../../lib/server/cripto";
import { putEncryptedObjectStream } from "../../lib/server/object-storage";

async function collect(source: AsyncIterable<Uint8Array>): Promise<Buffer> {
  const parts: Buffer[] = [];
  for await (const chunk of source) parts.push(Buffer.from(chunk));
  return Buffer.concat(parts);
}

test("KHC2 stream encrypt/decrypt round-trips without changing plaintext", async () => {
  const previous = process.env.X_KHORA_KEY;
  process.env.X_KHORA_KEY = "synthetic-checkpoint-backup-key";
  try {
    const plaintext = Buffer.from(JSON.stringify({
      revision_id: "00000000-0000-4000-8000-000000000001",
      texto: "contenido de prueba",
      snapshot: { texto: "preservación exacta" },
    }));
    async function* fragments() {
      yield plaintext.subarray(0, 7);
      yield plaintext.subarray(7, 19);
      yield plaintext.subarray(19);
    }
    const encrypted = await collect(cifrarStream(fragments()));
    assert.equal(encrypted.subarray(0, 4).toString("ascii"), "KHC2");
    assert.deepEqual(descifrarBytes(encrypted), plaintext);

    async function* encryptedFragments() {
      for (let offset = 0; offset < encrypted.length; offset += 5) {
        yield encrypted.subarray(offset, Math.min(offset + 5, encrypted.length));
      }
    }
    assert.deepEqual(await collect(descifrarStream(encryptedFragments())), plaintext);
    const damaged = Buffer.from(encrypted);
    damaged[damaged.length - 1] ^= 1;
    assert.throws(() => descifrarBytes(damaged));
  } finally {
    if (previous === undefined) delete process.env.X_KHORA_KEY;
    else process.env.X_KHORA_KEY = previous;
  }
});

test("B2 checkpoint archive uses multipart upload and physical SHA-256 read-back", async () => {
  const names = [
    "KHORA_B2_MASTER_APPLICATION_KEY_ID",
    "KHORA_B2_MASTER_APPLICATION_KEY",
    "KHORA_B2_BUCKET_NAME",
    "KHORA_B2_BUCKET_ID",
    "KHORA_B2_REGION",
    "KHORA_OBJECT_STORAGE",
  ];
  const before = Object.fromEntries(names.map((key) => [key, process.env[key]]));
  const originalFetch = globalThis.fetch;
  const uploaded = new Map<number, Buffer>();
  const uploadedSha1: string[] = [];
  let finishedKey = "";
  let finishCalled = false;

  try {
    process.env.KHORA_B2_MASTER_APPLICATION_KEY_ID = "master-id";
    process.env.KHORA_B2_MASTER_APPLICATION_KEY = "synthetic-master-secret";
    process.env.KHORA_B2_BUCKET_NAME = "khora-test-private";
    process.env.KHORA_B2_BUCKET_ID = "bucket-123";
    process.env.KHORA_B2_REGION = "us-east-005";
    process.env.KHORA_OBJECT_STORAGE = "b2";

    globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      const headers = new Headers(init?.headers);

      if (url.endsWith("/b2api/v4/b2_authorize_account")) {
        return new Response(JSON.stringify({
          accountId: "master-id",
          authorizationToken: "synthetic-account-token",
          apiInfo: {
            storageApi: {
              apiUrl: "https://api.test.b2",
              downloadUrl: "https://f001.test.b2",
              allowed: {
                capabilities: ["listBuckets", "listFiles", "readFiles", "writeFiles", "deleteFiles"],
                buckets: null,
                namePrefix: null,
              },
            },
          },
        }), { status: 200 });
      }

      if (url.endsWith("/b2api/v4/b2_list_buckets")) {
        return new Response(JSON.stringify({
          buckets: [{
            accountId: "master-id",
            bucketId: "bucket-123",
            bucketName: "khora-test-private",
            bucketType: "allPrivate",
            defaultServerSideEncryption: {
              isClientAuthorizedToRead: true,
              value: { mode: "SSE-B2", algorithm: "AES256" },
            },
          }],
        }), { status: 200 });
      }

      if (url.endsWith("/b2api/v4/b2_start_large_file")) {
        const body = JSON.parse(String(init?.body || "{}"));
        finishedKey = String(body.fileName);
        return new Response(JSON.stringify({ fileId: "large-file-123" }), { status: 200 });
      }

      if (url.endsWith("/b2api/v4/b2_get_upload_part_url")) {
        return new Response(JSON.stringify({
          fileId: "large-file-123",
          uploadUrl: "https://pod.test.b2/b2api/v4/b2_upload_part",
          authorizationToken: "part-upload-token",
        }), { status: 200 });
      }

      if (url === "https://pod.test.b2/b2api/v4/b2_upload_part") {
        assert.equal(headers.get("Authorization"), "part-upload-token");
        const partNumber = Number(headers.get("X-Bz-Part-Number"));
        const body = Buffer.from(init?.body as Uint8Array);
        uploaded.set(partNumber, body);
        const digest = createHash("sha1").update(body).digest("hex");
        uploadedSha1[partNumber - 1] = digest;
        return new Response(JSON.stringify({
          fileId: "large-file-123",
          partNumber,
          contentLength: body.length,
          contentSha1: digest,
        }), { status: 200 });
      }

      if (url.endsWith("/b2api/v4/b2_finish_large_file")) {
        const body = JSON.parse(String(init?.body || "{}"));
        assert.deepEqual(body.partSha1Array, uploadedSha1);
        finishCalled = true;
        return new Response(JSON.stringify({ fileId: "large-file-123", action: "upload" }), { status: 200 });
      }

      if (url.startsWith("https://f001.test.b2/file/")) {
        assert.equal(headers.get("Authorization"), "synthetic-account-token");
        const full = Buffer.concat([...uploaded.entries()].sort((a, b) => a[0] - b[0]).map((entry) => entry[1]));
        return new Response(new Uint8Array(full), { status: 200 });
      }

      throw new Error("unexpected B2 request: " + url);
    }) as typeof fetch;

    const plaintext = Buffer.alloc(5 * 1024 * 1024 + 37, 0x61);
    async function* input() {
      yield* cifrarStream((async function* () { yield plaintext; })());
    }

    const stored = await putEncryptedObjectStream(
      "backups/dictado_checkpoint/checkpoints_backup_historico-test.jsonl.gz.khc",
      input(),
      { partSize: 5 * 1024 * 1024 },
    );

    assert.equal(finishCalled, true);
    assert.equal(uploaded.size, 2);
    assert.equal(stored.readbackVerified, true);
    assert.equal(stored.bytes, [...uploaded.values()].reduce((total, part) => total + part.length, 0));
    assert.equal(stored.sha256, createHash("sha256").update(Buffer.concat([...uploaded.entries()].sort((a, b) => a[0] - b[0]).map((entry) => entry[1]))).digest("hex"));
    assert.equal(stored.pathname, finishedKey.slice("khora/".length));
  } finally {
    globalThis.fetch = originalFetch;
    for (const key of names) {
      if (before[key] === undefined) delete process.env[key];
      else process.env[key] = before[key];
    }
  }
});
