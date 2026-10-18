import { ordenarTurnos, type FuenteDialogo, type TurnoDialogo } from "./contrato";
export type AudioDialogo = { fuente:FuenteDialogo; bytes:Uint8Array; offsetMs:number };
type Respuesta = { exito:boolean; motivo?:string; texto:string; segmentos?:{start:number;end:number;text:string}[] };
/** Uses Khora's existing transcriber through an adapter. Does not translate, polish or invent timing. */
export async function transcribirPistasDialogo(pistas:AudioDialogo[],transcribe:(p:AudioDialogo)=>Promise<Respuesta>) {
  const turnos:TurnoDialogo[]=[];const fallidas:FuenteDialogo[]=[];
  for(const fuente of ["microphone","chrome_tab"] as const){
    const p=pistas.find(x=>x.fuente===fuente);
    if(!p){fallidas.push(fuente);continue;}
    try{
      const r=await transcribe(p);
      if(!r.exito||!Array.isArray(r.segmentos)||(r.texto.trim()&&!r.segmentos.length)){fallidas.push(fuente);continue;}
      const valid=r.segmentos.filter(s=>s.text.trim());
      if(valid.some(s=>!Number.isFinite(s.start)||!Number.isFinite(s.end)||s.start<0||s.end<s.start)){fallidas.push(fuente);continue;}
      turnos.push(...valid.map(s=>({fuente,start_ms:Math.round(s.start*1000+p.offsetMs),end_ms:Math.round(s.end*1000+p.offsetMs),texto:s.text.trim()})));
    }catch{fallidas.push(fuente);}
  }
  return {turnos:ordenarTurnos(turnos),fuentesFallidas:fallidas,estadoTranscripcion:fallidas.length===0?"completo":fallidas.length===2?"fallido":"parcial"};
}
