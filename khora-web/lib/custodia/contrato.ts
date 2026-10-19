/** Contract shared by browser, server, tests and future agents. See docs/CUSTODIA-DICTADOS.md. */
export const CHECKPOINT_IDLE_MS = 1500;
export const CHECKPOINT_MAX_MS = 10000;
export const AUDIO_CHECKPOINT_MS = 5000;
export const LOCAL_CHECKPOINT_MS = 250;
export type FuenteCaptura = "texto" | "microfono" | "chrome_live_caption" | "audio_archivo" | "dialogo";
export type CapturaSnapshot = {
  sessionId: string; revisionId: string; clientAt: number; texto: string;
  parcial: string; titulo: string; fuenteEntrada: FuenteCaptura;
  duracionSeg: number; audioPartes: unknown[];
  tipoEntrada?: import("./editorial").TipoEntrada;
  ofuscada?: boolean;
  publicationIntent?: import("./editorial").PublicationIntent;
  dialogo?: import("../dialogo/contrato").ManifiestoDialogo;
  corteAudio?: { hastaParte: number; finMs: number };
  recuperadaDe?: { sessionId: string; revisionId: string };
};
export function nuevaRevision(): Pick<CapturaSnapshot, "revisionId" | "clientAt"> {
  return { revisionId: crypto.randomUUID(), clientAt: Date.now() };
}
export function textoRecuperable(s: Pick<CapturaSnapshot, "texto" | "parcial">): string {
  return s.texto + (s.parcial ? (s.texto ? "\n\n" : "") + s.parcial : "");
}
