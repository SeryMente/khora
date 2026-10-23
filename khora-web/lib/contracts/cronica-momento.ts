export const MOMENTOS_HABITUALES: readonly string[] = [
  "madrugada",
  "mañana",
  "mediodía",
  "tarde",
  "atardecer",
  "noche",
  "amanecer",
  "anochecer",
  "medianoche",
];

export function normalizarMomento(value: string): string {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().toLocaleLowerCase("es").replace(/\s+/g, " ");
}

export function esMomentoPredefinido(value: string): boolean {
  const normalized = normalizarMomento(value);
  return MOMENTOS_HABITUALES.some((item) => normalizarMomento(item) === normalized);
}
