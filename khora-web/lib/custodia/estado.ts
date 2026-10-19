import type {CapturaSnapshot} from './contrato';
import {evaluarAudioRecuperado, type ParteRecuperada} from './recuperacion';
export type LuzCustodia='azul'|'verde'|'amarillo'|'rojo';
type IdentidadCustodia=Pick<CapturaSnapshot,'sessionId'|'texto'|'parcial'|'titulo'|'audioPartes'|'tipoEntrada'|'ofuscada'> & Partial<Pick<CapturaSnapshot,'fuenteEntrada'|'dialogo'|'corteAudio'|'audioPartesEsperadas'>>;
export function firmaCustodia(s:IdentidadCustodia){return JSON.stringify([s.sessionId,s.texto,s.parcial,s.titulo,s.audioPartes,s.tipoEntrada??'general',s.ofuscada??false,s.fuenteEntrada??'texto',s.dialogo??null,s.corteAudio??null,s.audioPartesEsperadas??null]);}
/** Never infer completeness from an empty retry queue or from two equal array lengths. */
export function audioCustodiadoCompleto(s:Pick<CapturaSnapshot,'fuenteEntrada'|'audioPartes'> & Partial<Pick<CapturaSnapshot,'audioPartesEsperadas'|'dialogo'|'corteAudio'>>, pendientes=0):boolean{
 if(!Number.isSafeInteger(pendientes)||pendientes!==0)return false;
 if(s.fuenteEntrada==='texto')return s.audioPartes.length===0&&(s.audioPartesEsperadas??0)===0;
 const total=s.corteAudio?.hastaParte??s.dialogo?.partesEsperadas??s.audioPartesEsperadas;
 // Legacy points without a cut/expected manifest stay unconfirmed, not silently aligned.
 if(total===undefined||!Number.isSafeInteger(total)||total<=0)return false;
 if(s.fuenteEntrada==='audio_archivo'&&total!==1)return false;
 if(s.audioPartes.some(p=>!p||typeof p!=='object'))return false;
 const partes=s.audioPartes as (ParteRecuperada & {fuenteAudio?:string})[];
 if(!evaluarAudioRecuperado(partes,total).ok)return false;
 if(s.fuenteEntrada==='dialogo'){
  if(!s.dialogo||!['detenido','interrumpido'].includes(s.dialogo.estado))return false;
  const fuentes=new Set(partes.map(p=>p.fuenteAudio));
  return fuentes.has('microphone')&&fuentes.has('chrome_tab')&&partes.every(p=>p.fuenteAudio==='microphone'||p.fuenteAudio==='chrome_tab');
 }
 return true;
}
/** A recovered checkpoint is not an archive. Old receipts never cover newer content. */
export function luzCustodia(p:{archivedReceipt:boolean;exactSnapshot:boolean;audioComplete:boolean;inFlight:boolean;confirmedFailure:boolean}):LuzCustodia{
 if(p.archivedReceipt)return 'azul';
 if(p.exactSnapshot&&p.audioComplete&&!p.inFlight)return 'verde';
 if(p.confirmedFailure)return 'rojo';
 return 'amarillo';
}
export const descripcionLuz:Record<LuzCustodia,string>={azul:'Registro archivado con recibo verificado',verde:'Contenido actual confirmado en recuperables',amarillo:'Confirmación del contenido actual pendiente',rojo:'Error de conservación detectado; revisa el detalle'};
