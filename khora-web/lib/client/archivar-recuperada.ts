"use client";
import {recuperarLocal,guardarSnapshotLocal,guardarIntencionEditorialLocal,confirmarAudioLocal,cerrarSnapshotLocal} from './custodia-local';
import {subirAudioCustodiado} from './subir-audio-custodia';
import {nuevaRevision,textoRecuperable,type CapturaSnapshot} from '../custodia/contrato';
import {clasificacionRecuperada,iniciarIntencion,huellaTexto} from '../custodia/editorial';
type Selection={sessionId:string;revisionId:string|null;local?:boolean};
async function data(r:Response){const d=await r.json();if(!r.ok)throw Error(d.detail||d.error||'RECOVERY_ARCHIVE_UNCONFIRMED');return d;}
/** Called only by the explicit archive button, not on loading/recovery/checkpoint. */
export async function archivarRecuperada(owner:string,item:Selection){
 if(!owner||!item.revisionId)throw Error('Elige un punto conservado antes de archivar.');
 let snapshot:CapturaSnapshot;
 if(item.local){
  const local=await recuperarLocal(owner);const selected=local.snapshots.find(s=>s.sessionId===item.sessionId&&s.revisionId===item.revisionId);
  if(!selected)throw Error('Punto local no disponible. El original no se modificó.');
  snapshot={...selected,...nuevaRevision(),audioPartes:[...selected.audioPartes]};
  for(const a of local.audios.filter(a=>a.sessionId===item.sessionId&&(selected.corteAudio?a.part<=selected.corteAudio.hastaParte:selected.audioPartes.some((p:any)=>p.parte===a.part))).sort((a,b)=>a.part-b.part)){
   const uploaded=await subirAudioCustodiado(item.sessionId,a.part,a.blob,a.meta.upload||{});
   snapshot.audioPartes=snapshot.audioPartes.filter((p:any)=>p.parte!==a.part).concat(uploaded);await confirmarAudioLocal(owner,item.sessionId,a.part);
  }
  snapshot.audioPartes.sort((a:any,b:any)=>a.parte-b.parte);await guardarSnapshotLocal(owner,snapshot,true);
  await data(await fetch('/api/dictado/checkpoint',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(snapshot),signal:AbortSignal.timeout(20000)}));
 }else{
  const d=await data(await fetch('/api/dictado/checkpoint?sessionId='+encodeURIComponent(item.sessionId)+'&revisionId='+encodeURIComponent(item.revisionId),{cache:'no-store',signal:AbortSignal.timeout(20000)}));
  if(d.owner!==owner||d.recovery?.revisionId!==item.revisionId||d.recovery?.sessionId!==item.sessionId)throw Error('No se acreditó el punto seleccionado. No se archivó otro punto.');snapshot=d.recovery;
 }
 const text=textoRecuperable(snapshot),classification=clasificacionRecuperada(snapshot),parts=snapshot.audioPartes as any[];
 if(snapshot.fuenteEntrada!=='texto'&&(!parts.length||parts.some(p=>p.verificado!==true||!p.bytes||!/^[a-f0-9]{64}$/i.test(p.sha256||''))))throw Error('Este punto no acredita audio íntegro. Los originales se conservan; recupera la captura para reconciliar sus partes.');
 const intent=classification.tipoEntrada==='blog_personal'?await iniciarIntencion(text,snapshot.publicationIntent):undefined;
 const journal={sessionId:snapshot.sessionId,intent:intent!,draft:{title:snapshot.titulo,body:text,date:new Date().toISOString(),obfuscated:classification.ofuscada}};
 if(intent)await guardarIntencionEditorialLocal(owner,journal);
 const payload={sessionId:snapshot.sessionId,texto:text,titulo:snapshot.titulo||null,...classification,fuenteEntrada:snapshot.fuenteEntrada,audioPartes:parts.length?parts:null,audioUrl:parts[0]?.url??null,audioBytes:parts.length?parts.reduce((n,p)=>n+Number(p.bytes),0):null,duracionSeg:snapshot.duracionSeg,pulidoAplicado:false};
 const receipt=await data(await fetch('/api/dictado',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload),signal:AbortSignal.timeout(60000)}));
 if(!receipt.id||receipt.sessionId!==snapshot.sessionId||receipt.version!==1||receipt.sha256!==await huellaTexto(text)||receipt.tipoEntrada!==classification.tipoEntrada||receipt.ofuscada!==classification.ofuscada)throw Error('Recibo de archivo no acreditado. Conserva el punto; no publiques ni dupliques el registro.');
 if(intent)await guardarIntencionEditorialLocal(owner,{...journal,intent:{...intent,state:'awaiting_decision'},receipt:{volcado_id:receipt.id,version:receipt.version,sha256:receipt.sha256}});
 await cerrarSnapshotLocal(owner,snapshot.sessionId);return receipt;
}
