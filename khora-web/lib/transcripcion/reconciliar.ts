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

/**
 * Normaliza un texto a un arreglo de palabras en minúsculas sin tildes ni puntuación,
 * apto tanto para ejecuciones en cliente como en servidor (@l0 L0-002-R).
 */
export function normalizarPalabras(texto: string): string[] {
  return texto
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\p{L}\p{N}\s]/gu, "")
    .split(/\s+/)
    .filter((t) => t.length > 0);
}

export type ResultadoCobertura = {
  aceptado: boolean;
  fusionado: boolean;
  cobertura: number;
  huecoMaximo: number;
  textoResultado: string;
  motivo: string;
  perdidaDetectada: boolean;
  deficit?: number;
};

/**
 * Tramo faltante en el texto anterior para evaluación de déficit.
 */
type TramoFaltante = {
  inicioAnt: number;
  finAnt: number;
  largo: number;
  anclaPrevNuev: number | null;
  anclaPostNuev: number | null;
  espacioNuevo: number;
  deficit: number;
};

/**
 * Guardián de cobertura de contenido por DÉFICIT (@req FIX-DICTADO/D12).
 * Evalúa la correspondencia entre el texto previamente capturado y la nueva propuesta autoritativa
 * mediante alineación por subsecuencia común más larga (LCS) a nivel de palabras.
 * Previene la sobreescritura silenciosa cuando Whisper omite palabras o tramos completos.
 */
export function evaluarCoberturaYReconciliar(
  textoAnterior: string,
  textoNuevo: string,
  opciones?: { umbralCobertura?: number; maxHuecoContiguo?: number }
): ResultadoCobertura {
  const antTrim = textoAnterior.trim();
  const nuevTrim = textoNuevo.trim();

  if (!antTrim) {
    return {
      aceptado: true,
      fusionado: false,
      cobertura: 1.0,
      huecoMaximo: 0,
      textoResultado: nuevTrim,
      motivo: "Texto anterior vacío; adoptando transcripción autoritativa.",
      perdidaDetectada: false,
      deficit: 0,
    };
  }

  if (!nuevTrim) {
    return {
      aceptado: false,
      fusionado: false,
      cobertura: 0.0,
      huecoMaximo: antTrim.split(/\s+/).length,
      textoResultado: antTrim,
      motivo: "Transcripción autoritativa vacía; conservando previsualización ASR en vivo.",
      perdidaDetectada: true,
      deficit: antTrim.split(/\s+/).length,
    };
  }

  const tokAnt = normalizarPalabras(antTrim);
  const tokNuev = normalizarPalabras(nuevTrim);

  if (tokAnt.length === 0) {
    return {
      aceptado: true,
      fusionado: false,
      cobertura: 1.0,
      huecoMaximo: 0,
      textoResultado: nuevTrim,
      motivo: "Sin tokens significativos en la previsualización; aceptando transcripción autoritativa.",
      perdidaDetectada: false,
      deficit: 0,
    };
  }

  const n = tokAnt.length;
  const m = tokNuev.length;

  // 1 & 2. Matriz LCS por Programación Dinámica O(n*m) + Backtracking
  const dp: number[][] = Array.from({ length: n + 1 }, () => new Array(m + 1).fill(0));

  for (let i = 1; i <= n; i++) {
    for (let j = 1; j <= m; j++) {
      if (tokAnt[i - 1] === tokNuev[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1] + 1;
      } else {
        dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
      }
    }
  }

  const coincidenciasAnt = new Array<boolean>(n).fill(false);
  const pareos: { iAnt: number; jNuev: number }[] = [];

  let i = n;
  let j = m;
  while (i > 0 && j > 0) {
    if (tokAnt[i - 1] === tokNuev[j - 1]) {
      coincidenciasAnt[i - 1] = true;
      pareos.unshift({ iAnt: i - 1, jNuev: j - 1 });
      i--;
      j--;
    } else if (dp[i - 1][j] >= dp[i][j - 1]) {
      i--;
    } else {
      j--;
    }
  }

  const numCoincidentes = dp[n][m];
  const cobertura = numCoincidentes / n;

  // 3. Agrupa los tokens de "anterior" NO coincidentes en tramos contiguos
  const tramos: TramoFaltante[] = [];
  let huecoActual = 0;
  let huecoMaximo = 0;
  let inicioTramo = -1;

  for (let idx = 0; idx < n; idx++) {
    if (!coincidenciasAnt[idx]) {
      if (huecoActual === 0) {
        inicioTramo = idx;
      }
      huecoActual++;
    } else {
      if (huecoActual > 0) {
        if (huecoActual > huecoMaximo) huecoMaximo = huecoActual;

        const finTramo = idx - 1;
        const pareoPrev = pareos.find((p) => p.iAnt === inicioTramo - 1);
        const pareoPost = pareos.find((p) => p.iAnt === idx);

        const anclaPrev = pareoPrev ? pareoPrev.jNuev : null;
        const anclaPost = pareoPost ? pareoPost.jNuev : null;

        const largo = finTramo - inicioTramo + 1;
        const espacioNuevo =
          anclaPrev !== null && anclaPost !== null
            ? anclaPost - anclaPrev - 1
            : anclaPrev !== null
            ? m - 1 - anclaPrev
            : anclaPost !== null
            ? anclaPost
            : m;
        const deficit = Math.max(0, largo - espacioNuevo);

        tramos.push({
          inicioAnt: inicioTramo,
          finAnt: finTramo,
          largo,
          anclaPrevNuev: anclaPrev,
          anclaPostNuev: anclaPost,
          espacioNuevo,
          deficit,
        });
        huecoActual = 0;
      }
    }
  }

  if (huecoActual > 0) {
    if (huecoActual > huecoMaximo) huecoMaximo = huecoActual;
    const finTramo = n - 1;
    const pareoPrev = pareos.find((p) => p.iAnt === inicioTramo - 1);
    const anclaPrev = pareoPrev ? pareoPrev.jNuev : null;
    const anclaPost = null;

    const largo = finTramo - inicioTramo + 1;
    const espacioNuevo = anclaPrev !== null ? m - 1 - anclaPrev : m;
    const deficit = Math.max(0, largo - espacioNuevo);

    tramos.push({
      inicioAnt: inicioTramo,
      finAnt: finTramo,
      largo,
      anclaPrevNuev: anclaPrev,
      anclaPostNuev: anclaPost,
      espacioNuevo,
      deficit,
    });
  }

  // 4. Sumatoria de déficits y tramos con déficit
  const deficitTotal = tramos.reduce((sum, t) => sum + t.deficit, 0);
  const tramosConDeficit = tramos.filter((t) => t.deficit > 0);

  const umbralPiso = opciones?.umbralCobertura ?? 0.5;

  // 5. DECISIÓN (Jerarquía estricta por DÉFICIT):
  // a) deficitTotal === 0 -> ACEPTA "nuevo" (correcciones/inserciones; sin pérdida real).
  if (deficitTotal === 0) {
    return {
      aceptado: true,
      fusionado: false,
      cobertura,
      huecoMaximo,
      textoResultado: nuevTrim,
      motivo: `Reconciliación exitosa por déficit cero: transcripción autoritativa aceptada (cobertura ${(cobertura * 100).toFixed(1)}%).`,
      perdidaDetectada: false,
      deficit: 0,
    };
  }

  // b) deficitTotal > 0 y TODOS los tramosConDeficit anclados a ambos lados y cobertura >= 0.5 -> FUSIONA
  const todosAnclados =
    tramosConDeficit.length > 0 &&
    tramosConDeficit.every((t) => t.anclaPrevNuev !== null && t.anclaPostNuev !== null);

  if (deficitTotal > 0 && todosAnclados && cobertura >= umbralPiso) {
    const palabrasOriginalesAnt = antTrim.split(/\s+/);
    const tokensNuevOriginal = nuevTrim.split(/\s+/);
    let offset = 0;

    // Insertar en orden ascendente de posición en nuevo
    const tramosOrdenados = [...tramosConDeficit].sort(
      (a, b) => (a.anclaPrevNuev ?? 0) - (b.anclaPrevNuev ?? 0)
    );

    for (const tramo of tramosOrdenados) {
      const textoFaltanteOriginal = palabrasOriginalesAnt
        .slice(tramo.inicioAnt, tramo.finAnt + 1)
        .join(" ");
      const posInsercion = (tramo.anclaPrevNuev ?? 0) + 1 + offset;
      tokensNuevOriginal.splice(posInsercion, 0, textoFaltanteOriginal);
      offset++;
    }

    const textoFusionado = tokensNuevOriginal.join(" ");

    return {
      aceptado: true,
      fusionado: true,
      cobertura,
      huecoMaximo,
      textoResultado: textoFusionado,
      motivo: `Déficit parcial recuperado (${deficitTotal} palabras): se fusionó el contenido faltante conservando el texto dictado.`,
      perdidaDetectada: true,
      deficit: deficitTotal,
    };
  }

  // c) resto -> RECHAZA: textoResultado = "anterior" íntegro.
  return {
    aceptado: false,
    fusionado: false,
    cobertura,
    huecoMaximo,
    textoResultado: antTrim,
    motivo: `Pérdida de contenido detectada (déficit: ${deficitTotal} palabras, cobertura ${(cobertura * 100).toFixed(1)}%). Se conservó el texto previo.`,
    perdidaDetectada: true,
    deficit: deficitTotal,
  };
}

export function reconciliarSegmentos(
  segmentosExistentes: SegmentoReconciliado[],
  nuevoTextoWhisper: string
): {
  segmentos: SegmentoReconciliado[];
  textoFinal: string;
  cambiosAplicados: number;
  motivo: string;
  perdidaDetectada?: boolean;
} {
  const whisperTrim = nuevoTextoWhisper.trim();
  const textoActual = (segmentosExistentes || []).map((s) => s.texto).join("\n\n");

  if (!whisperTrim) {
    return {
      segmentos: segmentosExistentes,
      textoFinal: textoActual,
      cambiosAplicados: 0,
      motivo: "Transcripción autoritativa vacía; conservando segmentos existentes.",
      perdidaDetectada: false,
    };
  }

  if (!segmentosExistentes || segmentosExistentes.length === 0) {
    const parrafosWhisper = whisperTrim
      .split("\n\n")
      .map((p) => p.trim())
      .filter((p) => p.length > 0);

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
      perdidaDetectada: false,
    };
  }

  // Evaluar cobertura del texto global por DÉFICIT
  const evaluacion = evaluarCoberturaYReconciliar(textoActual, whisperTrim);

  if (!evaluacion.aceptado) {
    return {
      segmentos: segmentosExistentes,
      textoFinal: textoActual,
      cambiosAplicados: 0,
      motivo: evaluacion.motivo,
      perdidaDetectada: true,
    };
  }

  const textoAceptado = evaluacion.textoResultado;
  const parrafosWhisper = textoAceptado
    .split("\n\n")
    .map((p) => p.trim())
    .filter((p) => p.length > 0);

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
    motivo: evaluacion.motivo,
    perdidaDetectada: evaluacion.perdidaDetectada,
  };
}
