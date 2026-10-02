import test from "node:test";
import assert from "node:assert/strict";
import { generarPinSeguro } from "../../lib/server/boveda";

test("genera por defecto un PIN de 10 dígitos", () => {
  const pin = generarPinSeguro();
  assert.match(pin, /^\d{10}$/);
});

test("permite longitudes seguras entre 6 y 12 dígitos", () => {
  assert.match(generarPinSeguro(6), /^\d{6}$/);
  assert.match(generarPinSeguro(12), /^\d{12}$/);
});

test("rechaza longitudes fuera del contrato", () => {
  assert.throws(() => generarPinSeguro(5), /entre 6 y 12/);
  assert.throws(() => generarPinSeguro(13), /entre 6 y 12/);
});
