import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { normalizarRespuestaConsulta } from "../../lib/client/consultaGrafo";

const evidencia = [{ tripleta: "A —relación→ B", provenance: "documento-1", derived_from: "fragmento-1" }];
test("insuficiente textual nunca se convierte en true", () => {
  const r = normalizarRespuestaConsulta({ respuesta: "No hay evidencia.", suficiencia: "insuficiente", evidencia: [] });
  assert.equal(r.suficiencia, false);
  assert.doesNotMatch(r.contenido, /Respuesta procesada/);
});
test("contrato real Python conserva fragmentos sin simular respuesta", () => {
  const r = normalizarRespuestaConsulta({ fragmentos: [{ id: "n-1", texto: "Dato autorizado" }], suficiencia: "suficiente", subgrafo: { nodos: [], aristas: [] }, degradacion_declarada: "Recuperación parcial" });
  assert.equal(r.suficiencia, undefined);
  assert.match(r.contenido, /\[n-1\] Dato autorizado/);
  assert.match(r.contenido, /sin respuesta generada/);
  assert.match(r.degradacion_declarada!, /Recuperación parcial/);
  assert.match(r.degradacion_declarada!, /no una respuesta generada/);
  assert.deepEqual(r.fuentes, []); // No inventar provenance/derived_from a partir de un id.
});
test("contrato generado conserva respuesta y fuentes sin alterar metadatos", () => {
  const r = normalizarRespuestaConsulta({ respuesta: "Respuesta con evidencia", suficiencia: "suficiente", evidencia });
  assert.equal(r.suficiencia, true);
  assert.equal(r.contenido, "Respuesta con evidencia");
  assert.deepEqual(r.fuentes, evidencia);
});
test("booleanos explícitos mantienen compatibilidad", () => {
  for (const flag of [true, false]) assert.equal(normalizarRespuestaConsulta({ respuesta: "Texto", suficiencia: flag, evidencia }).suficiencia, flag);
});
test("valores desconocidos no confirman suficiencia", () => {
  for (const flag of ["false", "true", "", null, {}, 1, undefined]) {
    const r = normalizarRespuestaConsulta({ respuesta: "Texto", suficiencia: flag, evidencia });
    assert.equal(r.suficiencia, undefined);
    assert.match(r.degradacion_declarada!, /no reconocida/);
  }
});
test("no anclada explícita invalida suficiencia, strings no se coaccionan", () => {
  assert.equal(normalizarRespuestaConsulta({ respuesta: "Texto", suficiencia: true, no_anclada: true, evidencia }).suficiencia, false);
  assert.equal(normalizarRespuestaConsulta({ respuesta: "Texto", suficiencia: true, no_anclada: "false", evidencia }).no_anclada, false);
});
test("recuperación vacía no muestra éxito ni certificado de suficiencia", () => {
  const r = normalizarRespuestaConsulta({ fragmentos: [], suficiencia: "insuficiente" });
  assert.equal(r.suficiencia, undefined);
  assert.match(r.contenido, /Sin respuesta generada/);
});
test("evidencia y fragmentos malformados no se inventan ni interpolan", () => {
  const r = normalizarRespuestaConsulta({ fragmentos: [null, {}, { id: "a", texto: {} }], evidencia: [null, { tripleta: "x" }], suficiencia: "suficiente" });
  assert.deepEqual(r.fuentes, []);
  assert.doesNotMatch(r.contenido, /undefined|\[object Object\]/);
});
test("payload ilegible falla explícitamente", () => {
  for (const data of [null, [], "ok", {}, { suficiencia: "suficiente" }]) assert.throws(() => normalizarRespuestaConsulta(data), /inválida|reconocible/);
});
test("la página usa el adaptador y no la coerción booleana defectuosa", () => {
  const page = readFileSync(new URL("../../app/sistema/consulta/page.tsx", import.meta.url), "utf8");
  assert.match(page, /\.\.\.normalizarRespuestaConsulta\(data\)/);
  assert.doesNotMatch(page, /Boolean\(data\.suficiencia\)|Respuesta procesada\./);
});
