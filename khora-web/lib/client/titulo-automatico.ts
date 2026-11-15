export const TITULO_AUTO_MIN_PALABRAS = 35;
export const TITULO_AUTO_MIN_CARACTERES = 220;
export const TITULO_AUTO_DEBOUNCE_MS = 2_000;

export function contarPalabrasTitulo(texto: string): number {
  return texto.match(/[\p{L}\p{N}]+(?:['’][\p{L}\p{N}]+)*/gu)?.length ?? 0;
}

export function cumpleUmbralTituloAutomatico(
  texto: string,
  minPalabras = TITULO_AUTO_MIN_PALABRAS,
  minCaracteres = TITULO_AUTO_MIN_CARACTERES,
): boolean {
  const limpio = texto.trim();
  return limpio.length >= minCaracteres && contarPalabrasTitulo(limpio) >= minPalabras;
}

/**
 * Hash de 64 bits sobre palabras normalizadas: cambios de puntuación, mayúsculas
 * o espacios no producen solicitudes redundantes.
 */
export function hashTextoParaTitulo(texto: string): string {
  const normalizado = texto
    .normalize("NFKD")
    .replace(/\p{M}/gu, "")
    .toLocaleLowerCase("es-MX")
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();

  let hashA = 0x811c9dc5;
  let hashB = 0x9e3779b9;
  let index = 0;
  for (const character of normalizado) {
    const codePoint = character.codePointAt(0) ?? 0;
    hashA = Math.imul(hashA ^ codePoint, 0x01000193);
    hashB = Math.imul(hashB ^ (codePoint + index++), 0x01000193);
  }
  return hashA.toString(16).padStart(8, "0") + hashB.toString(16).padStart(8, "0");
}

export type ResultadoTituloAutomatico = {
  title?: string;
  nivel?: "ia" | "fallback_determinista" | "ultimo_recurso" | string;
};

export type DisparadorTituloAutomaticoOptions = {
  requestTitle: (texto: string, signal: AbortSignal) => Promise<ResultadoTituloAutomatico>;
  canApply: () => boolean;
  onTitle: (title: string) => void;
  onBusy?: (busy: boolean) => void;
  debounceMs?: number;
};

export class DisparadorTituloAutomatico {
  private timer: ReturnType<typeof setTimeout> | null = null;
  private controller: AbortController | null = null;
  private generation = 0;
  private currentHash = "";
  private readonly requestedHashes = new Set<string>();
  private readonly debounceMs: number;

  constructor(private readonly options: DisparadorTituloAutomaticoOptions) {
    this.debounceMs = options.debounceMs ?? TITULO_AUTO_DEBOUNCE_MS;
  }

  observe(texto: string, enabled = true): void {
    const clean = texto.trim();
    const hash = hashTextoParaTitulo(clean);
    const changed = hash !== this.currentHash;
    this.currentHash = hash;
    this.clearTimer();

    if (!enabled) {
      this.abortInFlight();
      return;
    }
    if (changed) this.abortInFlight();
    if (!cumpleUmbralTituloAutomatico(clean) || this.requestedHashes.has(hash)) return;

    this.timer = setTimeout(() => {
      this.timer = null;
      if (this.currentHash !== hash || !this.options.canApply() || this.requestedHashes.has(hash)) return;
      this.requestedHashes.add(hash);
      const controller = new AbortController();
      this.controller = controller;
      const generation = ++this.generation;
      this.options.onBusy?.(true);

      void this.options.requestTitle(clean, controller.signal)
        .then((result) => {
          if (
            controller.signal.aborted ||
            generation !== this.generation ||
            this.currentHash !== hash ||
            !this.options.canApply() ||
            result.nivel !== "ia" ||
            typeof result.title !== "string" ||
            !result.title.trim()
          ) return;
          this.options.onTitle(result.title.trim());
        })
        .catch(() => undefined)
        .finally(() => {
          if (generation === this.generation) {
            this.controller = null;
            this.options.onBusy?.(false);
          }
        });
    }, this.debounceMs);
  }

  cancel(): void {
    this.clearTimer();
    this.abortInFlight();
    this.currentHash = "";
  }

  reset(): void {
    this.cancel();
    this.requestedHashes.clear();
  }

  destroy(): void {
    this.cancel();
  }

  private clearTimer(): void {
    if (this.timer !== null) {
      clearTimeout(this.timer);
      this.timer = null;
    }
  }

  private abortInFlight(): void {
    if (!this.controller) return;
    this.controller.abort();
    this.controller = null;
    this.generation += 1;
    this.options.onBusy?.(false);
  }
}
