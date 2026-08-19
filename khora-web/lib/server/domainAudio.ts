// @l0 L0-002-R · @req PIPELINE/AUDIO-DOMAIN

export function esAudioEsperado(volcado: {
  fuente?: string | null;
  driver?: string | null;
  origen?: string | null;
  session_id?: string | null;
}): boolean {
  if (!volcado) return false;

  const fuenteNorm = (volcado.fuente || "").toLowerCase().trim();
  const driverNorm = (volcado.driver || "").toLowerCase().trim();
  const origenNorm = (volcado.origen || "").toLowerCase().trim();
  const sessionId = (volcado.session_id || "").trim();

  if (fuenteNorm === "dictado" || driverNorm === "dictado" || origenNorm === "dictado") {
    return true;
  }

  if (sessionId.length > 0) {
    return true;
  }

  return false;
}
