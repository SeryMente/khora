import test from "node:test";
import assert from "node:assert/strict";
import { chunkTextExacto } from "./espejoNotion";
test("el espejo no normaliza ni pierde espacios, saltos o Unicode",()=>{const text="  Inicio\n\n"+"á😀 ".repeat(2000)+"\n  ";assert.equal(chunkTextExacto(text).join(""),text);assert.ok(chunkTextExacto(text).every(c=>c.length<=1900));});
// Transport, retry-after-lost-ack and persisted-prefix verification live in
// tests/unit/custodia_reconciliacion.test.ts and run in the main unit suite.
