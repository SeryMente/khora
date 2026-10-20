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
/** A live green acknowledges a bounded, joint text+audio cut, NOT the unsubmitted tail.
 * Age is measured at capture, never at acknowledgement (late receipts cannot freshen it).
 * A different session or a regressing cut cannot authorize the light. */
export type PuntoRecuperacion = {sessionId:string;revisionId:string;hastaParte:number;finMs:number;cutAt:number};
export function aceptarPunto(actual:PuntoRecuperacion|null,nuevo:PuntoRecuperacion,sesion:string):PuntoRecuperacion|null {
 if(nuevo.sessionId!==sesion||!nuevo.revisionId||!Number.isSafeInteger(nuevo.hastaParte)||nuevo.hastaParte<1||!Number.isFinite(nuevo.finMs)||nuevo.finMs<0||!Number.isFinite(nuevo.cutAt))return actual?.sessionId===sesion?actual:null;
 if(actual?.sessionId===sesion&&(nuevo.hastaParte<=actual.hastaParte||nuevo.finMs<actual.finMs||nuevo.cutAt<actual.cutAt))return actual;
 return nuevo;
}
export function puntoVigente(p:PuntoRecuperacion|null,sesion:string,now:number,maxAgeMs=20000):boolean {
 return !!p&&p.sessionId===sesion&&p.hastaParte>0&&now>=p.cutAt&&now-p.cutAt<=maxAgeMs;
}
export function falloCustodiaDefinitivo(e:{httpStatus?:number;reasonCode?:string}):boolean {
 const status=e.httpStatus||0;
 return (status>=400&&status<500&&status!==408&&status!==429)||/hash|checksum|receipt|recibo|invalid|mismatch|integrity|corte_no_confirmado|checkpoint_no_confirmado/.test(e.reasonCode||'');
}
/** A recovered checkpoint is not an archive. Old receipts never cover newer content. */
export function luzCustodia(p:{archivedReceipt:boolean;exactSnapshot:boolean;audioComplete:boolean;inFlight:boolean;confirmedFailure:boolean;liveCheckpoint?:boolean}):LuzCustodia{
 if(p.archivedReceipt)return 'azul';
 if(p.confirmedFailure)return 'rojo';
 if(p.liveCheckpoint||(p.exactSnapshot&&p.audioComplete&&!p.inFlight))return 'verde';
 return 'amarillo';
}
export const descripcionLuz:Record<LuzCustodia,string>={azul:'Registro archivado con recibo verificado',verde:'Punto de recuperación confirmado; consulta el alcance',amarillo:'Punto de recuperación pendiente o con retraso',rojo:'Error de conservación detectado; revisa el detalle'};
