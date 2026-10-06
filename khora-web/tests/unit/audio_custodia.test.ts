import test from "node:test";
import assert from "node:assert/strict";
import { evaluarCustodiaAudio } from "../../lib/audio/custodia";

const sha = "a".repeat(64);

test("custodia: acepta partes contiguas, no vacías y verificadas", () => {
  const r = evaluarCustodiaAudio([
    { part_index: 1, bytes: 100, sha256: sha, estado_verificacion: "verificado" },
    { part_index: 2, bytes: 200, sha256: sha, estado_verificacion: "verificado" },
  ], 2);

  assert.equal(r.ok, true);
  assert.deepEqual(r.indicesFaltantes, []);
});

test("custodia: rechaza un hueco de índice", () => {
  const r = evaluarCustodiaAudio([
    { part_index: 1, bytes: 100, sha256: sha, estado_verificacion: "verificado" },
    { part_index: 3, bytes: 200, sha256: sha, estado_verificacion: "verificado" },
  ], 3);

  assert.equal(r.ok, false);
  assert.deepEqual(r.indicesFaltantes, [2]);
});

test("custodia: rechaza parte no verificada", () => {
  const r = evaluarCustodiaAudio([
    { part_index: 1, bytes: 100, sha256: sha, estado_verificacion: "pendiente" },
  ], 1);

  assert.equal(r.ok, false);
  assert.match(r.motivo, /no está verificada/i);
});

test("custodia: rechaza SHA-256 inválido", () => {
  const r = evaluarCustodiaAudio([
    { part_index: 1, bytes: 100, sha256: "bad", estado_verificacion: "verificado" },
  ], 1);

  assert.equal(r.ok, false);
  assert.match(r.motivo, /SHA-256 válido/i);
});

test("custodia: rechaza bytes vacíos", () => {
  const r = evaluarCustodiaAudio([
    { part_index: 1, bytes: 0, sha256: sha, estado_verificacion: "verificado" },
  ], 1);

  assert.equal(r.ok, false);
  assert.match(r.motivo, /bytes vacíos/i);
});
