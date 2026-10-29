import type {CapturaSnapshot} from './contrato';
import {clasificacionRecuperada} from './editorial';
/** RFC 4122 UUID v5: stable idempotency key, not an authentication credential. */
export async function sesionArchivoRecuperado(sessionId:string,revisionId:string,operacion='archivar'):Promise<string>{
 const compact=sessionId.replace(/-/g,'');
 if(!/^[0-9a-f]{32}$/i.test(compact)||!/^[-0-9a-f]{36}$/i.test(revisionId))throw Error('Seleccion invalida');
 const namespace=Uint8Array.from(compact.match(/../g)!,x=>parseInt(x,16)),name=new TextEncoder().encode('khora:'+operacion+':'+revisionId);
 const bytes=new Uint8Array(namespace.length+name.length);bytes.set(namespace);bytes.set(name,namespace.length);
 const hash=new Uint8Array(await crypto.subtle.digest('SHA-1',bytes)).slice(0,16);hash[6]=(hash[6]&15)|80;hash[8]=(hash[8]&63)|128;
 const h=Array.from(hash,x=>x.toString(16).padStart(2,'0')).join('');return `${h.slice(0,8)}-${h.slice(8,12)}-${h.slice(12,16)}-${h.slice(16,20)}-${h.slice(20)}`;
}
/** The server may add SQL metadata; selected content and byte manifests must remain exact. */
export function mismaCapturaRecuperada(source:CapturaSnapshot,recovery:CapturaSnapshot|undefined,target:string):boolean{
 if(!recovery||recovery.sessionId!==target||target===source.sessionId||recovery.recuperadaDe?.sessionId!==source.sessionId||recovery.recuperadaDe?.revisionId!==source.revisionId)return false;
 const identity=(s:CapturaSnapshot)=>JSON.stringify([s.texto,s.parcial,s.titulo,s.fuenteEntrada,s.duracionSeg,clasificacionRecuperada(s),s.corteAudio??null,s.dialogo??null,s.audioPartesEsperadas??null]);
 const parts=(s:CapturaSnapshot)=>JSON.stringify((s.audioPartes as any[]).map(p=>[p.parte,p.bytes,String(p.sha256).toLowerCase(),p.verificado===true,p.fuenteAudio??null,p.url]).sort((a,b)=>Number(a[0])-Number(b[0])));
 return identity(source)===identity(recovery)&&parts(source)===parts(recovery);
}
