export type EstadoCustodiaAudio = "pendiente" | "verificado" | string;

export type ParteCustodiaAudio = {
  part_index: number;
  bytes: number;
  sha256?: string | null;
  estado_verificacion?: EstadoCustodiaAudio | null;
};

export type ResultadoCustodiaAudio = {
  ok: boolean;
  motivo: string;
  indicesFaltantes: number[];
};

export function evaluarCustodiaAudio(
  partes: ParteCustodiaAudio[],
  totalEsperado?: number | null,
): ResultadoCustodiaAudio {
  const ordenadas = [...(partes || [])].sort((a, b) => Number(a.part_index) - Number(b.part_index));
  const total = totalEsperado ?? ordenadas.length;
  const indicesFaltantes: number[] = [];

  for (let i = 1; i <= total; i += 1) {
    const parte = ordenadas[i - 1];
    if (!parte || Number(parte.part_index) !== i) indicesFaltantes.push(i);
  }

  if (indicesFaltantes.length > 0) {
    return {
      ok: false,
      motivo: `Custodia incompleta: faltan las partes ${indicesFaltantes.join(", ")}.`,
      indicesFaltantes,
    };
  }

  for (const parte of ordenadas.slice(0, total)) {
    if (!Number.isFinite(Number(parte.bytes)) || Number(parte.bytes) <= 0) {
      return {
        ok: false,
        motivo: `Parte ${parte.part_index} inválida: bytes vacíos o no numéricos.`,
        indicesFaltantes: [],
      };
    }
    if (!/^[0-9a-f]{64}$/i.test(String(parte.sha256 || ""))) {
      return {
        ok: false,
        motivo: `Parte ${parte.part_index} sin SHA-256 válido.`,
        indicesFaltantes: [],
      };
    }
    if (parte.estado_verificacion !== "verificado") {
      return {
        ok: false,
        motivo: `Parte ${parte.part_index} no está verificada.`,
        indicesFaltantes: [],
      };
    }
  }

  return {
    ok: true,
    motivo: `Custodia íntegra: ${total} partes verificadas.`,
    indicesFaltantes: [],
  };
}
