"use client";
import {recuperarLocal,guardarSnapshotLocal,guardarIntencionEditorialLocal,confirmarAudioLocal,cerrarSnapshotLocal} from './custodia-local';
import {subirAudioCustodiado} from './subir-audio-custodia';
import {textoRecuperable,type CapturaSnapshot} from '../custodia/contrato';
import {clasificacionRecuperada,iniciarIntencion,huellaTexto} from '../custodia/editorial';
import {audioCustodiadoCompleto} from '../custodia/estado';
import {sesionArchivoRecuperado,mismaCapturaRecuperada} from '../custodia/archivo-recuperado';
type Selection={sessionId:string;revisionId:string|null;local?:boolean};
async function data(r:Response){const d=await r.json();if(!r.ok)throw Error(d.detail||d.error||'RECOVERY_ARCHIVE_UNCONFIRMED');return d;}
/** Called only by the explicit archive button, not on loading/recovery/checkpoint. */
export async function archivarRecuperada(owner:string,item:Selection){
 if(!owner||!item.revisionId)throw Error('Elige un punto conservado antes de archivar.');
 let snapshot:CapturaSnapshot;
 if(item.local){
  const local=await recuperarLocal(owner);const selected=local.snapshots.find(s=>s.sessionId===item.sessionId&&s.revisionId===item.revisionId);
  if(!selected)throw Error('Punto local no disponible. El original no se modificó.');
  snapshot={...selected,revisionId:await sesionArchivoRecuperado(selected.sessionId,selected.revisionId,"preparar"),audioPartes:[...selected.audioPartes]};
  for(const a of local.audios.filter(a=>a.sessionId===item.sessionId&&(selected.corteAudio?a.part<=selected.corteAudio.hastaParte:selected.audioPartes.some((p:any)=>p.parte===a.part))).sort((a,b)=>a.part-b.part)){
   const uploaded=await subirAudioCustodiado(item.sessionId,a.part,a.blob,a.meta.upload||{});
   snapshot.audioPartes=snapshot.audioPartes.filter((p:any)=>p.parte!==a.part).concat(uploaded);await confirmarAudioLocal(owner,item.sessionId,a.part);
  }
  snapshot.audioPartes.sort((a:any,b:any)=>a.parte-b.parte);
 }else{
  const d=await data(await fetch('/api/dictado/checkpoint?sessionId='+encodeURIComponent(item.sessionId)+'&revisionId='+encodeURIComponent(item.revisionId),{cache:'no-store',signal:AbortSignal.timeout(20000)}));
  if(d.owner!==owner||d.recovery?.revisionId!==item.revisionId||d.recovery?.sessionId!==item.sessionId)throw Error('No se acreditó el punto seleccionado. No se archivó otro punto.');snapshot=d.recovery;
 }
 if(!audioCustodiadoCompleto(snapshot))throw Error('Este punto no acredita audio íntegro. Los originales se conservan; recupera la captura para reconciliar sus partes.');
 // Both local and remote selection prepare the same immutable revision for retry/cross-device identity.
 const selected=snapshot;
 snapshot={sessionId:selected.sessionId,revisionId:await sesionArchivoRecuperado(item.sessionId,item.revisionId,'preparar'),clientAt:selected.clientAt,texto:selected.texto,parcial:selected.parcial,titulo:selected.titulo,fuenteEntrada:selected.fuenteEntrada,duracionSeg:selected.duracionSeg,tipoEntrada:selected.tipoEntrada,ofuscada:selected.ofuscada,publicationIntent:selected.publicationIntent,dialogo:selected.dialogo,corteAudio:selected.corteAudio,audioPartesEsperadas:selected.audioPartesEsperadas,recuperadaDe:selected.recuperadaDe,audioPartes:(selected.audioPartes as any[]).map(p=>({parte:p.parte,url:p.url,bytes:p.bytes,sha256:p.sha256,verificado:p.verificado,fuenteAudio:p.fuenteAudio,start_ms:p.start_ms,end_ms:p.end_ms,duracion_ms:p.duracion_ms,nombreOriginal:p.nombreOriginal,mimeType:p.mimeType})).sort((a,b)=>a.parte-b.parte)};
 await guardarSnapshotLocal(owner,snapshot,true);
 const saved=await data(await fetch('/api/dictado/checkpoint',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(snapshot),signal:AbortSignal.timeout(20000)}));
 if(saved.sessionId!==snapshot.sessionId||saved.revisionId!==snapshot.revisionId)throw Error('No se confirmó el punto preparado. El original se conserva.');
 // Archive an idempotent fork of the exact selection, never seal the source or hide later points.
 const source=snapshot,target=await sesionArchivoRecuperado(item.sessionId,item.revisionId);
 const fork=await data(await fetch('/api/dictado/checkpoint?recover=1',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({sourceSessionId:source.sessionId,revisionId:source.revisionId,sessionId:target,archiveSelected:true}),signal:AbortSignal.timeout(20000)}));
 if(fork.owner!==owner||!mismaCapturaRecuperada(source,fork.recovery,target))throw Error('No se acreditó la copia del punto exacto. No se archivó otro punto.');
 snapshot=fork.recovery;await guardarSnapshotLocal(owner,snapshot);
 const text=textoRecuperable(snapshot),classification=clasificacionRecuperada(snapshot),parts=snapshot.audioPartes as any[];
 const intent=classification.tipoEntrada==='blog_personal'?await iniciarIntencion(text,snapshot.publicationIntent):undefined;
 const journal={sessionId:snapshot.sessionId,intent:intent!,draft:{title:snapshot.titulo,body:text,date:new Date().toISOString(),obfuscated:classification.ofuscada}};
 if(intent)await guardarIntencionEditorialLocal(owner,journal);
 const payload={sessionId:snapshot.sessionId,texto:text,titulo:snapshot.titulo||null,...classification,fuenteEntrada:snapshot.fuenteEntrada,audioPartes:parts.length?parts:null,audioUrl:parts[0]?.url??null,audioBytes:parts.length?parts.reduce((n,p)=>n+Number(p.bytes),0):null,duracionSeg:snapshot.duracionSeg,pulidoAplicado:false};
 const receipt=await data(await fetch('/api/dictado',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload),signal:AbortSignal.timeout(60000)}));
 if(!receipt.id||receipt.sessionId!==snapshot.sessionId||receipt.version!==1||receipt.sha256!==await huellaTexto(text)||receipt.tipoEntrada!==classification.tipoEntrada||receipt.ofuscada!==classification.ofuscada)throw Error('Recibo de archivo no acreditado. Conserva el punto; no publiques ni dupliques el registro.');
 if(intent)await guardarIntencionEditorialLocal(owner,{...journal,intent:{...intent,state:'awaiting_decision'},receipt:{volcado_id:receipt.id,version:receipt.version,sha256:receipt.sha256}});
 await cerrarSnapshotLocal(owner,snapshot.sessionId);return receipt;
}
