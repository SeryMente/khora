export type SalidaEdicionInSitu = "confirmar" | "desactivar";

type CerrarEdicionInSituOptions = {
  textoAntes: string;
  textoActual: string;
  forzarConfirmacion?: boolean;
  estabaDictando: boolean;
  confirmar: () => void | Promise<void>;
  desactivar: () => void | Promise<void>;
  reanudar: () => void | Promise<void>;
};

export function determinarSalidaEdicionInSitu(
  textoAntes: string,
  textoActual: string,
  forzarConfirmacion = false,
): SalidaEdicionInSitu {
  return forzarConfirmacion || textoAntes !== textoActual
    ? "confirmar"
    : "desactivar";
}

export async function cerrarEdicionInSitu({
  textoAntes,
  textoActual,
  forzarConfirmacion = false,
  estabaDictando,
  confirmar,
  desactivar,
  reanudar,
}: CerrarEdicionInSituOptions): Promise<SalidaEdicionInSitu> {
  const salida = determinarSalidaEdicionInSitu(
    textoAntes,
    textoActual,
    forzarConfirmacion,
  );

  if (salida === "confirmar") {
    await confirmar();
  } else {
    await desactivar();
  }

  if (estabaDictando) {
    await reanudar();
  }

  return salida;
}
