/** Opt-in provider preflight. Uses synthetic objects only; never reads or deletes user objects. */
import { randomUUID, createHash } from "node:crypto";
import {
  S3Client,
  GetBucketCorsCommand,
  PutBucketCorsCommand,
  ListObjectVersionsCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";
import { cifrarBytes, descifrarBytes } from "../lib/server/cripto";
import {
  putEncryptedObject,
  fetchStoredObject,
  prepareStagedUpload,
  storageLocation,
} from "../lib/server/object-storage";
import { b2Endpoint, parseB2ObjectUrl } from "../lib/storage/object-reference";

const REQUIRED = process.env.KHORA_B2_PREFLIGHT === "1";
const ORIGIN = process.env.KHORA_B2_PREFLIGHT_ORIGIN || "https://khora-web.vercel.app";

async function main() {
  if (!REQUIRED) {
    process.stdout.write("[storage-preflight] skipped; set KHORA_B2_PREFLIGHT=1 to run\n");
    return;
  }
  const location = storageLocation();
  const accessKeyId = process.env.KHORA_B2_KEY_ID;
  const secretAccessKey = process.env.KHORA_B2_APPLICATION_KEY;
  if (!location.bucket || !accessKeyId || !secretAccessKey) {
    throw new Error("storage_preflight_credentials_missing");
  }
  if (!/^https:\/\/[a-z0-9.-]+$/.test(ORIGIN)) throw new Error("storage_preflight_origin_invalid");

  const previousProvider = process.env.KHORA_OBJECT_STORAGE;
  process.env.KHORA_OBJECT_STORAGE = "b2";
  const client = new S3Client({
    region: location.region,
    endpoint: b2Endpoint(location.region),
    forcePathStyle: true,
    credentials: { accessKeyId, secretAccessKey },
    maxAttempts: 2,
    requestChecksumCalculation: "WHEN_REQUIRED",
    responseChecksumValidation: "WHEN_REQUIRED",
  });
  const ownedKeys: string[] = [];
  let stage = "encrypted_roundtrip";
  const check = (value: unknown, code: string): asserts value => {
    if (!value) throw new Error(code);
  };
  const digest = (value: Buffer) => createHash("sha256").update(value).digest("hex");

  try {
    const clear = Buffer.from("Khora synthetic B2 deployment probe " + randomUUID());
    const encrypted = cifrarBytes(clear);
    const stored = await putEncryptedObject(
      "diagnostics/" + randomUUID() + ".khc",
      encrypted,
      { access: "public", contentType: "application/octet-stream", addRandomSuffix: true },
    );
    const diagnosticKey = parseB2ObjectUrl(stored.url, location);
    check(diagnosticKey?.startsWith("khora/diagnostics/"), "storage_probe_locator");
    ownedKeys.push(diagnosticKey);

    const privateRead = await fetchStoredObject(stored.url);
    check(privateRead.ok, "storage_probe_private_read");
    const downloaded = Buffer.from(await privateRead.arrayBuffer());
    check(
      digest(downloaded) === digest(encrypted)
        && digest(descifrarBytes(downloaded)) === digest(clear),
      "storage_probe_integrity",
    );

    stage = "bucket_privacy";
    const anonymousRead = await fetch(stored.url, {
      redirect: "error",
      cache: "no-store",
      signal: AbortSignal.timeout(30000),
    });
    await anonymousRead.arrayBuffer();
    check([401, 403].includes(anonymousRead.status), "storage_probe_anonymous_access");

    stage = "signed_upload";
    const sessionId = randomUUID();
    const staging = await prepareStagedUpload(sessionId, encrypted.length);
    const stagingKey = parseB2ObjectUrl(staging.url, location);
    check(stagingKey?.startsWith("khora/staging/audio/" + sessionId + "/"), "storage_probe_staging_locator");
    ownedKeys.push(stagingKey);

    stage = "cors_configuration";
    const currentCors = await client.send(new GetBucketCorsCommand({ Bucket: location.bucket }));
    const currentRules = currentCors.CORSRules || [];
    const matchingRule = currentRules.some((rule) =>
      (rule.AllowedOrigins || []).includes(ORIGIN)
      && (rule.AllowedMethods || []).includes("PUT")
      && (rule.AllowedHeaders || []).some((header) =>
        header === "*" || header.toLowerCase() === "content-type")
      && (rule.AllowedHeaders || []).some((header) =>
        header === "*" || header.toLowerCase() === "x-amz-server-side-encryption")
    );
    if (!matchingRule) {
      const nextRules = [
        ...currentRules,
        {
          AllowedOrigins: [ORIGIN],
          AllowedMethods: ["PUT"],
          AllowedHeaders: ["content-type", "x-amz-server-side-encryption"],
          MaxAgeSeconds: 300,
        },
      ];
      await client.send(new PutBucketCorsCommand({
        Bucket: location.bucket,
        CORSConfiguration: { CORSRules: nextRules },
      }));
    }

    stage = "signed_upload";
    const uploaded = await fetch(staging.uploadUrl, {
      method: "PUT",
      headers: {
        "Content-Type": "application/octet-stream",
        "x-amz-server-side-encryption": "AES256",
      },
      body: new Uint8Array(encrypted),
      redirect: "error",
      signal: AbortSignal.timeout(30000),
    });
    check(uploaded.ok, "storage_probe_signed_upload");

    stage = "staging_readback";
    const stagingRead = await fetchStoredObject(staging.url);
    check(stagingRead.ok, "storage_probe_staging_read");
    const stagingBytes = Buffer.from(await stagingRead.arrayBuffer());
    check(digest(stagingBytes) === digest(encrypted), "storage_probe_staging_integrity");

    stage = "cors_verify";
    let corsOkay = false;
    for (let attempt = 0; attempt < 5; attempt++) {
      if (attempt) await new Promise((resolve) => setTimeout(resolve, 15000));
      const options = await fetch(staging.url, {
        method: "OPTIONS",
        headers: {
          Origin: ORIGIN,
          "Access-Control-Request-Method": "PUT",
          "Access-Control-Request-Headers": "content-type,x-amz-server-side-encryption",
        },
        redirect: "error",
        signal: AbortSignal.timeout(30000),
      });
      corsOkay = options.ok && options.headers.get("access-control-allow-origin") === ORIGIN;
      await options.arrayBuffer();
      if (corsOkay) break;
    }
    check(corsOkay, "storage_probe_cors_not_ready");

    const denied = await fetch(staging.url, {
      method: "OPTIONS",
      headers: {
        Origin: "https://khora-untrusted.invalid",
        "Access-Control-Request-Method": "PUT",
      },
      redirect: "error",
      signal: AbortSignal.timeout(30000),
    });
    await denied.arrayBuffer();
    check(denied.headers.get("access-control-allow-origin") === null, "storage_probe_cors_overbroad");

    process.stdout.write("[storage-preflight] encrypted readback, exact hashes, private bucket, signed PUT and exact-origin CORS passed\n");
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    const code = /^[a-z0-9_]+$/.test(message) ? message : "storage_provider_request_failed";
    process.stderr.write("[storage-preflight] failed stage=" + stage + " code=" + code + "\n");
    throw new Error("storage_preflight_failed");
  } finally {
    try {
      for (const key of ownedKeys) {
        check(
          key.startsWith("khora/diagnostics/") || key.startsWith("khora/staging/audio/"),
          "storage_probe_cleanup_scope",
        );
        const versions = await client.send(new ListObjectVersionsCommand({
          Bucket: location.bucket,
          Prefix: key,
          MaxKeys: 10,
        }));
        check(!versions.IsTruncated, "storage_probe_cleanup_truncated");
        for (const version of [...(versions.Versions || []), ...(versions.DeleteMarkers || [])]) {
          if (version.Key === key && version.VersionId) {
            await client.send(new DeleteObjectCommand({
              Bucket: location.bucket,
              Key: key,
              VersionId: version.VersionId,
            }));
          }
        }
      }
      process.stdout.write("[storage-preflight] exact synthetic object versions removed\n");
    } finally {
      client.destroy();
      if (previousProvider === undefined) delete process.env.KHORA_OBJECT_STORAGE;
      else process.env.KHORA_OBJECT_STORAGE = previousProvider;
    }
  }
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : "";
  const code = /^[a-z0-9_]+$/.test(message) ? message : "storage_preflight_failed";
  process.stderr.write("[storage-preflight] blocked code=" + code + "; no original objects deleted\n");
  process.exitCode = 1;
});
