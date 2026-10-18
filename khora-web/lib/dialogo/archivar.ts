import type { ManifiestoDialogo } from "./contrato";
/** Archive metadata only. Byte/SHA verification and owner authorization remain in the existing server transaction. */
export function validarArchivoDialogo(snapshot: {fuenteEntrada?:unknown;dialogo?:ManifiestoDialogo}, partes: {fuente_audio?:string;part_index?:number}[]) {
  const m=snapshot.dialogo;
  if(snapshot.fuenteEntrada!=="dialogo"||m?.version!==1)throw Error("dialogo_manifiesto_no_disponible");
  if(!["detenido","interrumpido"].includes(m.estado))throw Error("deten_ambas_fuentes_antes_de_archivar");
  if(!Number.isSafeInteger(m.partesEsperadas)||m.partesEsperadas<2||partes.length!==m.partesEsperadas)throw Error("dialogo_partes_pendientes");
  const sorted=[...partes].sort((a,b)=>Number(a.part_index)-Number(b.part_index));
  if(sorted.some((p,i)=>Number(p.part_index)!==i+1||!["microphone","chrome_tab"].includes(p.fuente_audio||"")))throw Error("dialogo_fuentes_o_indices_invalidos");
  const fuentes=new Set(partes.map(p=>p.fuente_audio));
  if(!fuentes.has("microphone")||!fuentes.has("chrome_tab"))throw Error("dialogo_falta_una_fuente");
  return {completo:m.estado==="detenido",partes:m.partesEsperadas};
}
