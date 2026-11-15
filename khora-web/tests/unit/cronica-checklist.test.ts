import test from "node:test";
import assert from "node:assert/strict";
import { analizarChecklistCronica } from "../../lib/cronica/checklist.js";
import { CronicaSnapshotMetadataSchema } from "../../lib/cronica/contrato.js";

const example = "Hoy a las 09:30, en el parque, al llegar, observé que estaba lloviendo y me sentí tranquila.";

test("Crónica reconoce las cuatro pistas desde texto local y cotidiano", () => {
  const result = analizarChecklistCronica(example);
  assert.equal(result.completeCount, 4);
  assert.deepEqual(result.tracks.map(track => track.resolved), [true, true, true, true]);
  assert.match(result.tracks[0].evidence || "", /hoy a las 09:30/i);
  assert.match(result.tracks[1].evidence || "", /en el parque/i);
  assert.match(result.tracks[2].evidence || "", /al llegar/i);
});

test("eventTime procede del relato y capturedAt permanece en un campo independiente", () => {
  const eventTime = analizarChecklistCronica(example).eventTime;
  const capturedAt = "2026-11-15T17:30:00.000Z";
  assert.equal(eventTime, "Hoy a las 09:30");
  assert.notEqual(eventTime, capturedAt);
  const metadata = CronicaSnapshotMetadataSchema.parse({
    mode: "cronica",
    autoPublish: true,
    publicationIntentId: "10dc7a9e-563c-4bd2-84a6-9e68f67c21fb",
    eventTime,
    capturedAt,
  });
  const recovered = JSON.parse(JSON.stringify(metadata));
  assert.equal(recovered.eventTime, eventTime);
  assert.equal(recovered.capturedAt, capturedAt);
});

test("pistas resueltas se revierten al editar y no dependen de estado persistente", () => {
  const complete = analizarChecklistCronica(example);
  assert.equal(complete.completeCount, 4);
  const edited = analizarChecklistCronica("No sé si mañana pasará algo.");
  assert.equal(edited.completeCount, 0);
  assert.deepEqual(edited.tracks.map(track => track.resolved), [false, false, false, false]);
  const restored = analizarChecklistCronica(example);
  assert.equal(restored.completeCount, 4);
});

test("Qué pasa admite hechos, acciones, emociones, sensaciones, observaciones e ideas", () => {
  for (const statement of [
    "Observé que la puerta estaba abierta.",
    "Trabajé toda la mañana y luego volví a casa.",
    "Me sentí aliviado al escuchar la noticia.",
    "Me duele la espalda desde ayer.",
    "Pienso que debemos intentarlo de otra manera.",
    "La lluvia inundó la calle.",
  ]) {
    const result = analizarChecklistCronica(statement);
    assert.equal(result.tracks.find(track => track.id === "que_pasa")?.resolved, true, statement);
  }
});

test("Qué pasa evita negaciones simples, hipótesis puras y terceros evidentes", () => {
  for (const statement of [
    "No pasó nada.",
    "Quizá mañana llueva.",
    "Tal vez podría salir más tarde.",
    "Él llegó temprano.",
    "Mi hermana dijo que no vendría.",
  ]) {
    const result = analizarChecklistCronica(statement);
    assert.equal(result.tracks.find(track => track.id === "que_pasa")?.resolved, false, statement);
  }
});

test("un checklist incompleto produce estado parcial, no un error ni una condición de bloqueo", () => {
  const incomplete = analizarChecklistCronica("Hoy fue un día tranquilo.");
  assert.equal(incomplete.completeCount, 0);
  assert.equal(incomplete.tracks.length, 4);
  assert.equal("blocked" in incomplete, false);
});

test("el snapshot serializable conserva el valor del checkmark desactivado", () => {
  const snapshot = {
    sessionId: "d3f2357e-2364-44cf-973f-f7f2b24643ab",
    revisionId: "6dd03f1b-3ae2-4ea6-bbb5-001b57e83b43",
    clientAt: 1794763800000,
    texto: example,
    parcial: "",
    titulo: "",
    fuenteEntrada: "texto" as const,
    duracionSeg: 0,
    audioPartes: [],
    mode: "cronica" as const,
    autoPublish: false,
    publicationIntentId: "10dc7a9e-563c-4bd2-84a6-9e68f67c21fb",
    eventTime: analizarChecklistCronica(example).eventTime,
    capturedAt: "2026-11-15T17:30:00.000Z",
  };
  const persisted = JSON.parse(JSON.stringify(snapshot));
  const metadata = CronicaSnapshotMetadataSchema.parse(persisted);
  assert.equal(metadata.mode, "cronica");
  assert.equal(metadata.autoPublish, false);
  assert.equal(metadata.publicationIntentId, snapshot.publicationIntentId);
});
