export type MomentoCategoria = "general" | "concreto" | "especializado";

export const MOMENTOS_PREDEFINIDOS: Readonly<Record<MomentoCategoria, readonly string[]>> = {
  general: ["madrugada", "mañana", "mediodía", "tarde", "noche"],
  concreto: ["alba", "amanecer", "atardecer", "anochecer", "medianoche"],
  especializado: ["hora azul", "hora dorada", "crepúsculo civil", "crepúsculo náutico", "crepúsculo astronómico"],
};

export function normalizarMomento(value: string): string {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().toLocaleLowerCase("es").replace(/\s+/g, " ");
}

export function esMomentoPredefinido(value: string): boolean {
  const normalized = normalizarMomento(value);
  return Object.values(MOMENTOS_PREDEFINIDOS).some((items) =>
    items.some((item) => normalizarMomento(item) === normalized),
  );
}
