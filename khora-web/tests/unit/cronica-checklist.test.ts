import test from "node:test";
import assert from "node:assert/strict";
import { NextRequest } from "next/server";
import { POST } from "../../app/api/cronica/checklist/route";

test("checklist requires an authenticated session before processing user text", async () => {
 const request = new NextRequest("http://localhost/api/cronica/checklist", {
  method: "POST",
  headers: { "content-type": "application/json", "x-real-ip": "203.0.113.42" },
  body: JSON.stringify({ text: "Hoy tuve una idea importante." })
 });
 const response = await POST(request);
 assert.equal(response.status, 401);
 const body = await response.json();
 assert.equal(body.error, "no_autenticado");
});

test("unauthenticated malformed JSON does not reach the analysis provider", async () => {
 const request = new NextRequest("http://localhost/api/cronica/checklist", {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: "{"
 });
 const response = await POST(request);
 assert.equal(response.status, 401);
});
