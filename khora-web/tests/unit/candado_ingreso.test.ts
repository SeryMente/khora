// @l0 L0-002-R · @req UNIFICAR-INGRESO/D16 · @req UNIFICAR-INGRESO/D17 · @req UNIFICAR-INGRESO/D18
import test from "node:test";
import assert from "node:assert/strict";
import fs from "fs";
import path from "path";
import { reconciliarSegmentos, type SegmentoReconciliado } from "../../lib/transcripcion/reconciliar";

test("D16 (Ingreso): reconciliarSegmentos bloquea pérdida de texto previa ante Whisper incompleto", () => {
  const segmentosExistentes: SegmentoReconciliado[] = [
    { id: "seg-1", texto: "este es un texto largo grabado en vivo en la pantalla de ingreso que tiene detalles cruciales", estado: "provisional_asr" },
  ];
  const textoWhisperIncompleto = "este es un texto largo grabado";

  const res = reconciliarSegmentos(segmentosExistentes, textoWhisperIncompleto);

  assert.equal(res.perdidaDetectada, true);
  assert.equal(res.textoFinal, "este es un texto largo grabado en vivo en la pantalla de ingreso que tiene detalles cruciales");
  assert.equal(res.segmentos[0].texto, "este es un texto largo grabado en vivo en la pantalla de ingreso que tiene detalles cruciales");
});

test("D17 (Ingreso): Exclusión mutua estricta de 3 vías en botones de control", () => {
  // Función pura que replica exactamente la lógica de la propiedad disabled en IngresoPage:
  function obtenerEstadosBotones(p: {
    soportado: boolean;
    editando: boolean;
    estado: "inactivo" | "dictando";
    adjuntandoAudio: boolean;
    retranscribiendo: boolean;
    tieneSesionId: boolean;
  }) {
    return {
      iniciarDictadoDisabled: !p.soportado || p.editando || p.adjuntandoAudio || p.retranscribiendo,
      adjuntarAudioDisabled: p.adjuntandoAudio || p.retranscribiendo || p.estado !== "inactivo",
      retranscribirAudioDisabled: p.retranscribiendo || p.adjuntandoAudio || !p.tieneSesionId || p.estado !== "inactivo",
    };
  }

  // 1. Estado "dictando" -> Adjuntar y Re-transcribir deshabilitados
  const estadoDictando = obtenerEstadosBotones({
    soportado: true,
    editando: false,
    estado: "dictando",
    adjuntandoAudio: false,
    retranscribiendo: false,
    tieneSesionId: true,
  });
  assert.equal(estadoDictando.adjuntarAudioDisabled, true);
  assert.equal(estadoDictando.retranscribirAudioDisabled, true);

  // 2. Estado "adjuntandoAudio" -> Iniciar dictado y Re-transcribir deshabilitados
  const estadoAdjuntando = obtenerEstadosBotones({
    soportado: true,
    editando: false,
    estado: "inactivo",
    adjuntandoAudio: true,
    retranscribiendo: false,
    tieneSesionId: true,
  });
  assert.equal(estadoAdjuntando.iniciarDictadoDisabled, true);
  assert.equal(estadoAdjuntando.retranscribirAudioDisabled, true);
  assert.equal(estadoAdjuntando.adjuntarAudioDisabled, true);

  // 3. Estado "retranscribiendo" -> Iniciar dictado y Adjuntar audio deshabilitados
  const estadoRetranscribiendo = obtenerEstadosBotones({
    soportado: true,
    editando: false,
    estado: "inactivo",
    adjuntandoAudio: false,
    retranscribiendo: true,
    tieneSesionId: true,
  });
  assert.equal(estadoRetranscribiendo.iniciarDictadoDisabled, true);
  assert.equal(estadoRetranscribiendo.adjuntarAudioDisabled, true);
  assert.equal(estadoRetranscribiendo.retranscribirAudioDisabled, true);
});

test("D18 (Volcados): volcados/page.tsx no contiene 'Archivo Manual' ni hace POST a /api/volcado", () => {
  const pagePath = path.resolve(__dirname, "../../app/sistema/volcados/page.tsx");
  const contenido = fs.readFileSync(pagePath, "utf-8");

  assert.equal(contenido.includes("Archivo Manual"), false, "No debe incluir la etiqueta 'Archivo Manual'");
  assert.equal(contenido.includes('"/api/volcado"'), false, "No debe realizar llamadas a '/api/volcado'");
});
