import { evaluarCustodiaAudio } from "../audio/custodia";
export type ParteRecuperada = { parte: number; bytes: number; sha256?: string; verificado?: boolean; end_ms?: number };
/** Expected indices survive a reload; raw blobs in the previous JS heap do not. */
export function evaluarAudioRecuperado(partes: ParteRecuperada[], totalEsperado: number) {
  return evaluarCustodiaAudio(partes.map(p=>({part_index:p.parte,bytes:p.bytes,sha256:p.sha256,estado_verificacion:p.verificado===true?"verificado":"pendiente"})),totalEsperado);
}
export function maximoIndiceConocido(partes: {parte:number}[], pendientes: {parte:number}[]) {
  return Math.max(0,...partes.map(p=>p.parte),...pendientes.map(p=>p.parte));
}
