// @l0 L0-002-R · @req FIX-DICTADO/RECONCILIATION-MANUAL-PROTECTION
import test from "node:test";
import assert from "node:assert";
import {
  reconciliarSegmentos,
  reconciliarTranscripcion,
  SegmentoReconciliado,
} from "../../lib/server/transcribir.js";

test("reconciliarSegmentos reemplaza segmentos provisionales por autoritativos", () => {
  const existentes: SegmentoReconciliado[] = [
    { id: "seg-1", texto: "hola a todos esto es una prueba", estado: "provisional_asr" },
  ];
  const nuevoWhisper = "Hola a todos, esto es una prueba de dictado autoritativo.";

  const res = reconciliarSegmentos(existentes, nuevoWhisper);
  assert.strictEqual(res.segmentos.length, 1);
  assert.strictEqual(res.segmentos[0].estado, "autoritativo_whisper");
  assert.strictEqual(res.segmentos[0].texto, "Hola a todos, esto es una prueba de dictado autoritativo.");
});

test("reconciliarSegmentos PROTEGE estrictamente un segmento editado manualmente", () => {
  const existentes: SegmentoReconciliado[] = [
    { id: "seg-1", texto: "Texto corregido manualmente por el operador Khora.", estado: "editado_manual", modificadoManualmente: true },
    { id: "seg-2", texto: "segundo bloque en ASR provisional", estado: "provisional_asr" },
  ];
  const nuevoWhisper = "Primer bloque re-transcrito por Whisper.\n\nSegundo bloque transcrito autoritativamente por Whisper.";

  const res = reconciliarSegmentos(existentes, nuevoWhisper);
  assert.strictEqual(res.segmentos.length, 2);

  // El segmento 1 editado manualmente NO debe ser destruido
  assert.strictEqual(res.segmentos[0].texto, "Texto corregido manualmente por el operador Khora.");
  assert.strictEqual(res.segmentos[0].estado, "editado_manual");

  // El segmento 2 ASR sí se actualiza a autoritativo
  assert.strictEqual(res.segmentos[1].texto, "Segundo bloque transcrito autoritativamente por Whisper.");
  assert.strictEqual(res.segmentos[1].estado, "autoritativo_whisper");
});

test("reconciliarTranscripcion respeta bandera modificadoManualmente", () => {
  const previewManual = "Texto editado manualmente";
  const whisperNovedad = "Texto automatizado de Whisper";

  const res = reconciliarTranscripcion(previewManual, whisperNovedad, { modificadoManualmente: true });

  assert.strictEqual(res.textoFinal, "Texto editado manualmente");
  assert.strictEqual(res.reconciliado, false);
  assert.ok(res.motivo.includes("Protección de edición manual"));
});
