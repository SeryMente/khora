/** Encrypted object transport. Authorization and cleartext hash checks remain with callers. */
import { randomUUID } from "node:crypto";
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  ListObjectsV2Command,
  ListObjectVersionsCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { put as putBlob, del as delBlob } from "@vercel/blob";
import {
  b2Endpoint,
  b2ObjectUrl,
  parseB2ObjectUrl,
  legacyBlobUrl,
  safeObjectKey,
  stagingKeyForSession,
} from "../storage/object-reference";

export function storageLocation() {
  return {
    bucket: process.env.KHORA_B2_BUCKET_NAME || "",
    region: process.env.KHORA_B2_REGION || "us-east-005",
  };
}

export function b2Enabled() {
  return process.env.KHORA_OBJECT_STORAGE === "b2";
}

export function createB2Client() {
  const { region, bucket } = storageLocation();
  const accessKeyId = process.env.KHORA_B2_KEY_ID;
  const secretAccessKey = process.env.KHORA_B2_APPLICATION_KEY;
  if (!accessKeyId || !secretAccessKey || !bucket) throw new Error("storage_b2_not_configured");
  return new S3Client({
    region,
    endpoint: b2Endpoint(region),
    forcePathStyle: true,
    credentials: { accessKeyId, secretAccessKey },
    maxAttempts: 3,
    requestChecksumCalculation: "WHEN_REQUIRED",
    responseChecksumValidation: "WHEN_REQUIRED",
  });
}

export function isStoredObjectUrl(value: string) {
  return legacyBlobUrl(value) || parseB2ObjectUrl(value, storageLocation()) !== null;
}

/** B2 reads are signed on the server; the signed URL is never persisted or returned to clients. */
export async function fetchStoredObject(value: string, init: RequestInit = {}): Promise<Response> {
  const location = storageLocation();
  const key = parseB2ObjectUrl(value, location);
  const request: RequestInit = {
    ...init,
    cache: "no-store",
    redirect: "error",
    signal: init.signal ?? AbortSignal.timeout(30000),
  };
  if (key !== null) {
    const signer = createB2Client();
    let signedUrl: string;
    try {
      signedUrl = await getSignedUrl(
        signer,
        new GetObjectCommand({ Bucket: location.bucket, Key: key }),
        { expiresIn: 60 },
      );
    } finally {
      signer.destroy();
    }
    return fetch(signedUrl, request);
  }
  if (!legacyBlobUrl(value)) throw new Error("storage_reference_not_allowed");
  return fetch(value, request);
}

export async function putEncryptedObject(
  pathname: string,
  data: Buffer,
  options: { access: "public"; contentType?: string; addRandomSuffix?: boolean },
) {
  if (data.length < 32 || data.subarray(0, 4).toString("ascii") !== "KHC1") {
    throw new Error("storage_requires_encrypted_envelope");
  }
  if (!b2Enabled()) return putBlob(pathname, data, options);

  const location = storageLocation();
  const key = safeObjectKey(pathname.startsWith("khora/") ? pathname : `khora/${pathname}`);
  const unique = key.replace(/(\.[^/.]+)?$/, `-${randomUUID()}$1`);
  const client = createB2Client();
  try {
    await client.send(new PutObjectCommand({
      Bucket: location.bucket,
      Key: unique,
      Body: data,
      ContentType: "application/octet-stream",
      ServerSideEncryption: "AES256",
    }));
  } catch {
    throw new Error("storage_b2_write_failed");
  } finally {
    client.destroy();
  }
  return {
    url: b2ObjectUrl(unique, location),
    pathname: unique.slice("khora/".length),
    contentType: "application/octet-stream",
  };
}

/** Browser upload capability is restricted to one opaque staging object and five minutes. */
export async function prepareStagedUpload(sessionId: string, bytes: number) {
  if (!/^[0-9a-f-]{36}$/i.test(sessionId) || !Number.isSafeInteger(bytes)
    || bytes <= 16 || bytes > 24 * 1024 * 1024 + 32) throw new Error("storage_staging_invalid");
  const location = storageLocation();
  const key = safeObjectKey(`khora/staging/audio/${sessionId}/${randomUUID()}.khstaging`);
  const client = createB2Client();
  try {
    const uploadUrl = await getSignedUrl(
      client,
      new PutObjectCommand({
        Bucket: location.bucket,
        Key: key,
        ContentType: "application/octet-stream",
        ContentLength: bytes,
        ServerSideEncryption: "AES256",
      }),
      { expiresIn: 300 },
    );
    return { provider: "b2", uploadUrl, url: b2ObjectUrl(key, location), expiresIn: 300 };
  } finally {
    client.destroy();
  }
}

export function isStagingObject(value: string, sessionId: string) {
  const key = parseB2ObjectUrl(value, storageLocation());
  if (key !== null) return stagingKeyForSession(key, sessionId);
  return legacyBlobUrl(value) && new URL(value).pathname.startsWith(`/staging/audio/${sessionId}/`);
}

/** Deletion is limited to temporary staging uploads. Original recordings are never deleted here. */
export async function deleteStagedObject(value: string, sessionId: string) {
  if (!isStagingObject(value, sessionId)) throw new Error("storage_delete_not_staging");
  const location = storageLocation();
  const key = parseB2ObjectUrl(value, location);
  if (key === null) {
    await delBlob(value);
    return;
  }
  const client = createB2Client();
  try {
    const versions = await client.send(new ListObjectVersionsCommand({
      Bucket: location.bucket,
      Prefix: key,
      MaxKeys: 10,
    }));
    if (versions.IsTruncated) throw new Error("storage_staging_versions_exceeded");
    for (const version of [...(versions.Versions || []), ...(versions.DeleteMarkers || [])]) {
      if (version.Key === key && version.VersionId) {
        await client.send(new DeleteObjectCommand({
          Bucket: location.bucket,
          Key: key,
          VersionId: version.VersionId,
        }));
      }
    }
  } finally {
    client.destroy();
  }
}

export async function listB2Objects(prefix = "khora/dictado/") {

  const location = storageLocation();
  const client = createB2Client();
  const objects: { url: string; pathname: string; size: number; uploadedAt: Date }[] = [];
  let continuationToken: string | undefined;
  try {
    do {
      const page = await client.send(new ListObjectsV2Command({
        Bucket: location.bucket,
        Prefix: prefix,
        MaxKeys: 1000,
        ContinuationToken: continuationToken,
      }));
      for (const object of page.Contents || []) {
        if (object.Key) objects.push({
          url: b2ObjectUrl(object.Key, location),
          pathname: object.Key.slice("khora/".length),
          size: object.Size || 0,
          uploadedAt: object.LastModified || new Date(0),
        });
      }
      continuationToken = page.IsTruncated ? page.NextContinuationToken : undefined;
      if (page.IsTruncated && !continuationToken) throw new Error("storage_listing_incomplete");
      if (objects.length > 10000) throw new Error("storage_listing_limit");
    } while (continuationToken);
    return objects;
  } finally {
    client.destroy();
  }
}
