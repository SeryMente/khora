export type EstadoSegmento =
  | "provisional_asr"
  | "whisper_provisional"
  | "autoritativo_whisper"
  | "estable_whisper"
  | "editado_manual"
  | "pendiente_error";

export type SegmentoReconciliado = {
  id: string;
  texto: string;
  estado: EstadoSegmento;
  modificadoManualmente?: boolean;
  start_ms_global?: number;
  end_ms_global?: number;
};

export function reconciliarSegmentos(
  segmentosExistentes: SegmentoReconciliado[],
  nuevoTextoWhisper: string
): {
  segmentos: SegmentoReconciliado[];
  textoFinal: string;
  cambiosAplicados: number;
  motivo: string;
} {
  const whisperTrim = nuevoTextoWhisper.trim();
  if (!whisperTrim) {
    const textoActual = segmentosExistentes.map((s) => s.texto).join("\n\n");
    return {
      segmentos: segmentosExistentes,
      textoFinal: textoActual,
      cambiosAplicados: 0,
      motivo: "Transcripción autoritativa vacía; conservando segmentos existentes.",
    };
  }

  const parrafosWhisper = whisperTrim
    .split("\n\n")
    .map((p) => p.trim())
    .filter((p) => p.length > 0);

  if (!segmentosExistentes || segmentosExistentes.length === 0) {
    const nuevosSegmentos: SegmentoReconciliado[] = parrafosWhisper.map((p, idx) => ({
      id: `seg-${idx + 1}-${Date.now()}`,
      texto: p,
      estado: "autoritativo_whisper",
    }));

    return {
      segmentos: nuevosSegmentos,
      textoFinal: nuevosSegmentos.map((s) => s.texto).join("\n\n"),
      cambiosAplicados: nuevosSegmentos.length,
      motivo: "Aceptación completa de transcripción autoritativa en inicialización.",
    };
  }

  let cambios = 0;
  const resultadoSegmentos: SegmentoReconciliado[] = [];
  const maxLen = Math.max(segmentosExistentes.length, parrafosWhisper.length);

  for (let i = 0; i < maxLen; i++) {
    const segExistente = segmentosExistentes[i];
    const parrafoWhisper = parrafosWhisper[i];

    if (segExistente) {
      if (segExistente.estado === "editado_manual" || segExistente.modificadoManualmente) {
        resultadoSegmentos.push(segExistente);
      } else if (parrafoWhisper) {
        if (segExistente.texto !== parrafoWhisper) {
          cambios++;
        }
        resultadoSegmentos.push({
          id: segExistente.id,
          texto: parrafoWhisper,
          estado: "autoritativo_whisper",
          start_ms_global: segExistente.start_ms_global,
          end_ms_global: segExistente.end_ms_global,
        });
      } else {
        resultadoSegmentos.push(segExistente);
      }
    } else if (parrafoWhisper) {
      cambios++;
      resultadoSegmentos.push({
        id: `seg-${i + 1}-${Date.now()}`,
        texto: parrafoWhisper,
        estado: "autoritativo_whisper",
      });
    }
  }

  const textoFinal = resultadoSegmentos.map((s) => s.texto).join("\n\n");

  return {
    segmentos: resultadoSegmentos,
    textoFinal,
    cambiosAplicados: cambios,
    motivo: `Reconciliación completada: ${cambios} segmentos actualizados, ediciones manuales protegidas.`,
  };
}
