import test from "node:test";
import assert from "node:assert/strict";
import { NextRequest } from "next/server";
import { POST } from "../../app/api/cronica/checklist/route";
import { esMomentoPredefinido, MOMENTOS_HABITUALES, normalizarMomento } from "../../lib/contracts/cronica-momento";

test("checklist returns safe fallback when Groq is not configured", async () => {
 const previous = process.env.GROQ_API_KEY;
 delete process.env.GROQ_API_KEY;
 try {
  const request = new NextRequest("http://localhost/api/cronica/checklist", {
   method: "POST",
   headers: { "content-type": "application/json", "x-real-ip": "203.0.113.42", "x-vercel-ip-country": "MX" },
   body: JSON.stringify({ text: "Hoy tuve una idea importante." })
  });
  const response = await POST(request);
  const body = await response.json();
  assert.equal(response.status, 200);
  assert.equal(body.source, "fallback");
  assert.equal(body.review.criteria.length, 4);
  assert.equal(body.metadata.ipv4, "203.0.113.42");
  assert.equal(body.metadata.country, "MX");
  assert.ok(Number.isFinite(Date.parse(body.metadata.receivedAt)));
 } finally {
  if (previous === undefined) delete process.env.GROQ_API_KEY;
  else process.env.GROQ_API_KEY = previous;
 }
});

test("invalid IPv4 header is not exposed as an address", async () => {
 const previous = process.env.GROQ_API_KEY;
 delete process.env.GROQ_API_KEY;
 try {
  const request = new NextRequest("http://localhost/api/cronica/checklist", {
   method: "POST", headers: { "content-type": "application/json", "x-real-ip": "999.1.2.3" },
   body: JSON.stringify({ text: "" })
  });
  const body = await (await POST(request)).json();
  assert.equal(body.metadata.ipv4, null);
  assert.equal(body.source, "fallback");
 } finally {
  if (previous === undefined) delete process.env.GROQ_API_KEY;
  else process.env.GROQ_API_KEY = previous;
 }
});

test("malformed JSON is rejected after session check", async () => {
 const request = new NextRequest("http://localhost/api/cronica/checklist", { method: "POST", body: "{" });
 const response = await POST(request);
 assert.equal(response.status, 400);
});

test("oversized declared request body is rejected before JSON parsing", async () => {
 const request = new NextRequest("http://localhost/api/cronica/checklist", {
  method: "POST",
  headers: { "content-type": "application/json", "content-length": "70000" },
  body: "{}"
 });
 const response = await POST(request);
 assert.equal(response.status, 413);
 const body = await response.json();
 assert.equal(body.error, "cuerpo_demasiado_grande");
});

test("Momento uses a simple flat everyday vocabulary", () => {
 assert.deepEqual(MOMENTOS_HABITUALES, ["madrugada", "mañana", "mediodía", "tarde", "atardecer", "noche", "amanecer", "anochecer", "medianoche"]);
 assert.equal(esMomentoPredefinido("Mañana"), true);
 assert.equal(esMomentoPredefinido("HORA AZUL"), false);
 assert.equal(normalizarMomento("  Atardecer "), "atardecer");
 assert.equal(esMomentoPredefinido("la hora de la tormenta"), false);
});
