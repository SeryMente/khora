"use client";
import { useEffect, useRef, useState } from "react";
import { guardarIntencionEditorialLocal, recuperarIntencionesEditorialesLocal, type IntencionEditorialLocal } from "../../../lib/client/custodia-local";
import { TEXT_ONLY_PUBLICATION_AUTHORIZED, canonicoEditorial, huellaTexto, publicadoEnAmbos, type RevisionEditorial } from "../../../lib/custodia/editorial";
import s from "./ingreso-studio.module.css";
const runtime={_thinking_mode:"UNAVAILABLE",_output_format_version:"v1.7.7"};
type Status={revision?:number;consent:string;filter:string;deliveries?:Array<{revision:number;target:string;state:string;url?:string;proof_hash?:string}>};
async function call(body:unknown){
 const r=await fetch("/api/blog/editorial",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(body),signal:AbortSignal.timeout(60000)});
 const d=await r.json().catch(()=>({}));if(!r.ok)throw Error(typeof d.code==="string"?d.code:"EDITORIAL_NO_CONFIRMADO");return d;
}
export function PublicacionCapturaPendiente({owner,refresh=0}:{owner:string;refresh?:number}) {
 const [rows,setRows]=useState<IntencionEditorialLocal[]>([]),[error,setError]=useState("");
 const load=async()=>{setRows((await recuperarIntencionesEditorialesLocal(owner)).filter(r=>r.intent.state!=="received"||r.intent.decision===true));};
 useEffect(()=>{let cancelled=false;if(!owner)return;recuperarIntencionesEditorialesLocal(owner).then(items=>{if(!cancelled)setRows(items.filter(r=>r.intent.state!=="received"||r.intent.decision===true));}).catch(()=>{if(!cancelled)setError("No se pudo leer la intención editorial local. No se ha autorizado ninguna publicación.");});return()=>{cancelled=true;};},[owner,refresh]);
 if(!rows.length&&!error)return null;
 return <section aria-label="Publicación de notas autobiográficas" data-ui-id="ingreso.publicacion-pendiente">
  {error&&<p role="alert">{error}</p>}
  {rows.map(row=><Entrada key={row.intent.publicationId} owner={owner} initial={row} onSaved={load}/>)}
 </section>;
}
function Entrada({owner,initial,onSaved}:{owner:string;initial:IntencionEditorialLocal;onSaved:()=>Promise<void>}){
 const [row,setRow]=useState(initial),[busy,setBusy]=useState(false),[error,setError]=useState("");
 const [title,setTitle]=useState(row.request?.entry.title||row.draft?.title||""),[body,setBody]=useState(row.request?.entry.body||row.draft?.body||"");
 const [format,setFormat]=useState<""|"link"|"full_text">(row.request?.facebook.format||"full_text");
 const [message,setMessage]=useState(row.request?.facebook.message||[row.draft?.title,row.draft?.body].filter(Boolean).join("\n\n"));
 const [exposure,setExposure]=useState(false),[status,setStatus]=useState<Status|null>(null),[previewVisible,setPreviewVisible]=useState(false);
 const token=useRef("");
 useEffect(()=>setRow(initial),[initial]);
 const save=async(next:IntencionEditorialLocal)=>{await guardarIntencionEditorialLocal(owner,next);setRow(next);await onSaved();};
 const turn=async()=>{
  if(!token.current){const d=await call({action:"open_turn",...runtime});if(typeof d.turn?.turn_token!=="string")throw Error("NORMATIVE_TURN_UNAVAILABLE");token.current=d.turn.turn_token;}
  return {...runtime,_norm_turn_token:token.current};
 };
 const prepare=async()=>{
  if(busy||!row.receipt||row.intent.decision!==null)return;
  setBusy(true);setError("");
  try{
   let request=row.request;
   if(!request){
    if(!format||!message.trim()||!title.trim()||!body.trim())throw Error("Completa el texto público y el formato/texto de Facebook antes de preparar la vista previa.");
    request={publicationId:row.intent.publicationId,revision:1,sourceId:row.receipt.volcado_id,sourceVersion:row.receipt.version,sourceHash:row.receipt.sha256,kind:"blog_personal",obfuscated:row.draft?.obfuscated===true,entry:{schema:1,slug:"cronica-"+row.intent.publicationId,title,date:row.draft!.date,body,source:{kind:"khora",sha256:await huellaTexto(body)}},facebook:{format,message}};
    await save({...row,request});
   }
   const d=await call({action:"prepare",expectedRevision:null,revision:request,...await turn()});
   const digest=await huellaTexto(canonicoEditorial(request));
   if(d.publicationId!==request.publicationId||d.revision!==request.revision||d.digest!==digest||canonicoEditorial(d.preview)!==canonicoEditorial(request.entry)||canonicoEditorial(d.facebook)!==canonicoEditorial(request.facebook)||JSON.stringify(d.destinations)!=='["blog","facebook"]')throw Error("La vista previa no corresponde a la revisión enviada. No se autorizó publicación.");
   await save({...row,request,prepared:{digest},intent:{...row.intent,state:"awaiting_decision"}});
   setPreviewVisible(true);setExposure(false);
  }catch(e){token.current="";setError(e instanceof Error?e.message:"No se confirmó la vista previa.");}finally{setBusy(false);}
 };
 const decide=async(decision:boolean)=>{
  if(busy||decision&&(!TEXT_ONLY_PUBLICATION_AUTHORIZED||!previewVisible||!row.prepared||!row.request||row.request.obfuscated&&!exposure))return;
  setBusy(true);setError("");
  try{
   const next={...row,intent:{...row.intent,decision,state:"awaiting_editorial_receipt" as const},obfuscatedExposure:decision&&exposure};
   await save(next); // durable before network; a lost response is reconciled through status
   if(!row.receipt){setError("No conservado en este dispositivo. Falta reconciliar el recibo de archivo; no se publicará sin él.");return;}
   const d:Status=decision
    ? await call({action:"decide",publicationId:row.intent.publicationId,digest:row.prepared!.digest,decision:true,obfuscatedExposure:exposure,...await turn()})
    : await call({action:"decline_archived",reference:{publicationId:row.intent.publicationId,sourceId:row.receipt.volcado_id,sourceVersion:row.receipt.version,sourceHash:row.receipt.sha256}});
   if((decision&&d.revision!==row.request?.revision)||d.consent!==(decision?"approved":"declined"))throw Error("No se confirmó la decisión exacta. Consulta el estado sin volver a publicar.");
   setStatus(d);await save({...next,intent:{...next.intent,state:"received"}});
  }catch(e){token.current="";setError((e instanceof Error?e.message:"No se confirmó la decisión.")+" La captura archivada se conserva; no se repetirá un envío a los destinos desde esta pantalla.");}finally{setBusy(false);}
 };
 const reconcile=async()=>{
  setBusy(true);setError("");
  try{
   const d:Status=await call({action:"status",publicationId:row.intent.publicationId,...(row.intent.decision===false?{}:await turn())});
   if(row.intent.decision!==false&&d.revision!==row.request?.revision)throw Error("La revisión editorial no coincide. No se reutilizará el consentimiento.");
   setStatus(d);
   if((row.intent.decision===true&&d.consent==="approved")||(row.intent.decision===false&&d.consent==="declined"))await save({...row,intent:{...row.intent,state:"received"}});
  }catch(e){token.current="";setError(e instanceof Error?e.message:"Estado editorial no confirmado.");}finally{setBusy(false);}
 };
 const locked=busy||!!row.request||row.intent.decision!==null;
 return <article className={s.editorialPanel}>
  <h2>¿Quieres que esta entrada se publique en el blog y en la Página de Facebook?</h2>
  <p role="status">Corte autorizado: se publicará únicamente texto. El audio permanece privado en Custodia y no se publicará. Revisa el texto exacto de ambos destinos antes de decidir.</p>
  <p>El archivo en Custodia es independiente de la publicación. Siempre se autorizan ambos destinos o ninguno.</p>
  {!row.receipt&&<p role="status">Recibo de archivo pendiente. Recupera y reintenta el archivo de la misma captura; no se inventará una referencia ni se publicará.</p>}
  {row.receipt&&row.intent.decision===null&&<fieldset disabled={locked} className={s.editorialForm}><legend>Representación pública que se revisará</legend>
   <label>Título público<input aria-label="Título público" value={title} maxLength={160} onChange={e=>setTitle(e.target.value)}/></label>
   <label>Texto del blog<textarea aria-label="Texto del blog" value={body} maxLength={200000} onChange={e=>setBody(e.target.value)}/></label>
   <label>Formato de Facebook<select aria-label="Formato de Facebook" value={format} onChange={e=>setFormat(e.target.value as typeof format)}><option value="">Elige el formato</option><option value="link">Enlace al blog con mensaje</option><option value="full_text">Texto completo</option></select></label>
   <label>Texto exacto de Facebook<textarea aria-label="Texto exacto de Facebook" value={message} maxLength={60000} onChange={e=>setMessage(e.target.value)}/></label>
  </fieldset>}
  {row.receipt&&row.intent.decision===null&&<button className={s.secondary} disabled={busy} onClick={()=>void prepare()}>{busy?"Preparando…":row.request?"Recuperar la misma vista previa":"Preparar vista previa de ambos destinos"}</button>}
  {previewVisible&&row.request&&<section className={s.editorialPreview} aria-label="Vista previa verificada"><h3>Blog · {row.request.entry.title}</h3><p>Fecha pública: {row.request.entry.date}</p><p style={{whiteSpace:"pre-wrap"}}>{row.request.entry.body}</p><h3>Facebook · {row.request.facebook.format==="link"?"Enlace al blog con mensaje":"Texto completo"}</h3><p style={{whiteSpace:"pre-wrap"}}>{row.request.facebook.message}</p><p>Esta autorización cubre únicamente el texto mostrado. No se publicarán el audio, la marca privada «ofuscada» ni metadatos privados.</p></section>}
  {previewVisible&&row.request?.obfuscated&&row.intent.decision===null&&<label><input type="checkbox" checked={exposure} onChange={e=>setExposure(e.target.checked)}/> He revisado este texto ofuscado y autorizo expresamente que se exponga públicamente tal como aparece.</label>}
  {row.intent.decision===null&&<div className={s.editorialActions}><button className={s.primary} disabled={!TEXT_ONLY_PUBLICATION_AUTHORIZED||busy||!row.receipt||!previewVisible||!row.prepared||!!row.request?.obfuscated&&!exposure} onClick={()=>void decide(true)}>Sí, publicar en ambos</button><button className={s.secondary} disabled={busy} onClick={()=>void decide(false)}>No, conservar sin publicar</button></div>}
  {row.intent.decision!==null&&<p role="status">{row.intent.decision?publicadoEnAmbos(status||{})?"Publicación confirmada en ambos destinos.":"Autorización solicitada. La publicación en ambos destinos todavía no está confirmada.":"Elegiste no publicar. La captura permanece en Custodia si su recibo de archivo está confirmado."}</p>}
  {(row.prepared||row.intent.decision===false&&row.receipt)&&<button className={s.secondary} disabled={busy} onClick={()=>void reconcile()}>Comprobar estado sin reenviar publicaciones</button>}
  {status?.deliveries?.map(d=><p key={d.target+":"+d.revision}>{d.target==="blog"?"Blog":"Facebook"} · revisión {d.revision}: {d.state}</p>)}
  {error&&<p role="alert">{error}</p>}
 </article>;
}
