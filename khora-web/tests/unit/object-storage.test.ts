import test from "node:test";
import assert from "node:assert/strict";
import {
  b2Endpoint,
  b2ObjectUrl,
  parseB2ObjectUrl,
  legacyBlobUrl,
  safeObjectKey,
  stagingKeyForSession,
} from "../../lib/storage/object-reference";
import {
  b2Enabled,
  fetchStoredObject,
  putEncryptedObject,
  prepareStagedUpload,
  isStagingObject,
  deleteStagedObject,
} from "../../lib/server/object-storage";

const location = { bucket: "khora-test-private", region: "us-east-005" };
const session = "12345678-1234-1234-1234-123456789012";
const stagingKey = "khora/staging/audio/" + session + "/1234.khstaging";

test("B2 locator is stable and contains no signed capability", () => {
  const url = b2ObjectUrl(stagingKey, location);
  assert.equal(parseB2ObjectUrl(url, location), stagingKey);
  assert.equal(new URL(url).search, "");
});

for (const [name, url] of Object.entries({
  otherBucket: "https://s3.us-east-005.backblazeb2.com/other-private/" + stagingKey,
  otherRegion: "https://s3.us-west-004.backblazeb2.com/" + location.bucket + "/" + stagingKey,
  otherHost: "https://evil.invalid/" + location.bucket + "/" + stagingKey,
  credentials: "https://user@" + new URL(b2ObjectUrl(stagingKey, location)).host + "/" + location.bucket + "/" + stagingKey,
  query: b2ObjectUrl(stagingKey, location) + "?token=x",
  fragment: b2ObjectUrl(stagingKey, location) + "#x",
  encoded: b2ObjectUrl(stagingKey, location).replace("khora/", "khora%2F"),
  traversal: b2ObjectUrl(stagingKey, location).replace("/1234.khstaging", "/../1234.khstaging"),
})) {
  test("rejects B2 URL with " + name, () => assert.equal(parseB2ObjectUrl(url, location), null));
}

for (const key of ["outside/file", "khora/../file", "khora//file", "khora/user@email/file", "khora/a%2fb", "khora/./file"]) {
  test("rejects invalid object key " + key, () => assert.throws(() => safeObjectKey(key)));
}

test("region cannot become an SSRF host", () => {
  assert.throws(() => b2Endpoint("us-east-005.evil.invalid"));
});

test("legacy Vercel Blob references remain explicitly allowlisted", () => {
  assert.equal(legacyBlobUrl("https://store.public.blob.vercel-storage.com/dictado/a.khc"), true);
  assert.equal(legacyBlobUrl("https://blob.vercel-storage.com.evil.invalid/a"), false);
  assert.equal(legacyBlobUrl("http://store.blob.vercel-storage.com/a"), false);
  assert.equal(legacyBlobUrl("https://u:p@store.blob.vercel-storage.com/a"), false);
});

test("staging references cannot cross sessions", () => {
  assert.equal(stagingKeyForSession(stagingKey, session), true);
  assert.equal(stagingKeyForSession(stagingKey, "99999999-9999-9999-9999-999999999999"), false);
});

test("storage rejects cleartext before any network operation", async () => {
  await assert.rejects(
    () => putEncryptedObject("dictado/test.khc", Buffer.from("not encrypted"), { access: "public" }),
    /encrypted_envelope/,
  );
});

test("storage rejects untrusted URL before any network operation", async () => {
  await assert.rejects(() => fetchStoredObject("http://127.0.0.1/private"), /reference_not_allowed/);
});

test("deletion is restricted to staging; original recording URLs are rejected", async () => {
  await assert.rejects(
    () => deleteStagedObject("https://test.public.blob.vercel-storage.com/dictado/x/1.khc", session),
    /not_staging/,
  );
});

test("signed staging capability is bounded to one encrypted object and five minutes", async () => {
  const vars = [
    "KHORA_B2_BUCKET_NAME",
    "KHORA_B2_REGION",
    "KHORA_B2_KEY_ID",
    "KHORA_B2_APPLICATION_KEY",
    "KHORA_OBJECT_STORAGE",
  ];
  const before = Object.fromEntries(vars.map((key) => [key, process.env[key]]));
  try {
    process.env.KHORA_B2_BUCKET_NAME = location.bucket;
    process.env.KHORA_B2_REGION = location.region;
    process.env.KHORA_B2_KEY_ID = "synthetic-id";
    process.env.KHORA_B2_APPLICATION_KEY = "synthetic-secret";
    delete process.env.KHORA_OBJECT_STORAGE;
    assert.equal(b2Enabled(), false);
    process.env.KHORA_OBJECT_STORAGE = "b2";
    assert.equal(b2Enabled(), true);
    const upload = await prepareStagedUpload(session, 1024);
    const url = new URL(upload.uploadUrl);
    assert.equal(url.hostname, "s3.us-east-005.backblazeb2.com");
    assert.equal(url.searchParams.get("X-Amz-Expires"), "300");
    assert.ok(url.searchParams.has("X-Amz-Signature"));
    assert.equal(isStagingObject(upload.url, session), true);
    assert.equal(new URL(upload.url).search, "");
    assert.equal(isStagingObject(upload.url, "99999999-9999-9999-9999-999999999999"), false);
    await assert.rejects(() => prepareStagedUpload(session, 25 * 1024 * 1024), /storage_staging_invalid/);
    await assert.rejects(() => prepareStagedUpload("bad-session", 100), /storage_staging_invalid/);
  } finally {
    for (const key of vars) {
      if (before[key] === undefined) delete process.env[key];
      else process.env[key] = before[key] as string;
    }
  }
});
