"use client";
import {prepareLiteralTranscript,assertPagesTextCompatible} from "../../../lib/blog/transcript-preparation";
import {useEffect,useRef,useState} from "react";
import {guardarIntencionEditorialLocal,guardarPropuestaEditorialLocal,crearPropuestaEditorialLocal,revisionPropuestaEditorial,type TrabajoEditorialLocal,recuperarIntencionesEditorialesLocal,type IntencionEditorialLocal} from "../../../lib/client/custodia-local";
import {TEXT_ONLY_PUBLICATION_AUTHORIZED,canonicoEditorial,huellaTexto,publicadoEnAmbos} from "../../../lib/custodia/editorial";
import s from "./ingreso-studio.module.css";
const runtime={_thinking_mode:"UNAVAILABLE",_output_format_version:"v1.7.7"};
type Status={revision?:number;consent:string;filter:string;deliveries?:Array<{revision:number;target:string;state:string;url?:string;proof_hash?:string}>};
async function call(body:unknown){
 const r=await fetch("/api/blog/editorial",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(body),signal:AbortSignal.timeout(60000)});
 const d=await r.json().catch(()=>({}));if(!r.ok)throw Error(typeof d.code==="string"?d.code:"EDITORIAL_NO_CONFIRMADO");return d;
}
export function PublicacionCapturaPendiente({owner,refresh=0}:{owner:string;refresh?:number}){
 const [rows,setRows]=useState<IntencionEditorialLocal[]>([]),[error,setError]=useState("");
 const load=async()=>setRows((await recuperarIntencionesEditorialesLocal(owner)).filter(r=>r.intent.state!=="received"||r.intent.decision===true));
 useEffect(()=>{let cancelled=false;if(!owner)return;recuperarIntencionesEditorialesLocal(owner).then(items=>{if(!cancelled)setRows(items.filter(r=>r.intent.state!=="received"||r.intent.decision===true));}).catch(()=>{if(!cancelled)setError("No se pudo verificar la intención editorial local. Conserva el original y comprueba su recibo en Custodia; esta pantalla no ha autorizado publicación.");});return()=>{cancelled=true;};},[owner,refresh]);
 if(!rows.length&&!error)return null;
 return <section aria-label="Publicación de notas autobiográficas" data-ui-id="ingreso.publicacion-pendiente">{error&&<p role="alert">{error}</p>}{rows.map(row=><Entrada key={owner+":"+row.intent.publicationId} owner={owner} initial={row} onSaved={load}/>)}</section>;
}
function Entrada({owner,initial,onSaved}:{owner:string;initial:IntencionEditorialLocal;onSaved:()=>Promise<void>}){
 const [row,setRow]=useState(initial),[busy,setBusy]=useState(false),[error,setError]=useState("");
 let literal:ReturnType<typeof prepareLiteralTranscript>|null=null,preparationError="";
 try{if(initial.draft?.body?.trim())literal=prepareLiteralTranscript(initial.draft.body);}catch{preparationError="No se pudo preparar esta transcripción íntegra. El original archivado permanece intacto; no se truncó ni autorizó su publicación.";}
 const [work,setWork]=useState<TrabajoEditorialLocal>(()=>({title:initial.proposal?.title??initial.request?.entry.title??initial.draft?.title??literal?.titleProposal?.text??"",body:initial.proposal?.body??initial.request?.entry.body??literal?.body??"",facebook:initial.proposal?.facebook??initial.request?.facebook??{format:"full_text",message:[initial.draft?.title||literal?.titleProposal?.text,literal?.body].filter(Boolean).join("\n\n")},reviewed:initial.proposal?.reviewed??!!initial.elaboration}));
 const workRef=useRef(work),pendingWork=useRef<Promise<void>>(Promise.resolve()),token=useRef("");
 const [worked,setWorked]=useState(!!initial.proposal||!!initial.elaboration),[exposure,setExposure]=useState(false),[status,setStatus]=useState<Status|null>(null),[previewVisible,setPreviewVisible]=useState(false),[retryReady,setRetryReady]=useState(false);
 useEffect(()=>setRow(initial),[initial]);
 const setCurrent=(next:TrabajoEditorialLocal)=>{workRef.current=next;setWork(next);};
 const save=async(next:IntencionEditorialLocal)=>{await guardarIntencionEditorialLocal(owner,next);setRow(next);await onSaved();};
 const turn=async()=>{if(!token.current){const d=await call({action:"open_turn",...runtime});if(typeof d.turn?.turn_token!=="string")throw Error("NORMATIVE_TURN_UNAVAILABLE");token.current=d.turn.turn_token;}return {...runtime,_norm_turn_token:token.current};};
 const edit=(patch:Partial<TrabajoEditorialLocal>,marksWorked=worked)=>{
  const next={...workRef.current,...patch};setCurrent(next);setWorked(marksWorked);setPreviewVisible(false);setRetryReady(false);
  if(marksWorked&&row.receipt&&!row.request&&row.intent.decision===null){
   // Serialize keystrokes and flush before prepare. A rejected write remains a blocking error.
   pendingWork.current=pendingWork.current.catch(()=>undefined).then(async()=>{await guardarPropuestaEditorialLocal(owner,row,next);});
   void pendingWork.current.catch(()=>setError("No se pudo conservar la propuesta privada. No recargues esta pantalla; reintenta guardarla antes de preparar la previa."));
  }
 };
 const elaborate=async()=>{
  if(busy||!row.receipt||row.request||row.intent.decision!==null)return;
  setBusy(true);setError("");try{
   await pendingWork.current.catch(()=>undefined);
   const d=await call({action:"elaborate",reference:{sourceId:row.receipt.volcado_id,sourceVersion:row.receipt.version,sourceHash:row.receipt.sha256},...await turn()});
   if(d.proposal?.sourceHash!==row.receipt.sha256||d.proposal?.method!=="cronica-sobria-v1"||d.proposal?.requiresReview!==true||typeof d.proposal?.body!=="string"||!d.proposal.body.trim())throw Error("La propuesta no acredita el original archivado.");
   const suggestedMessage=[workRef.current.title,d.proposal.body].filter(Boolean).join("\n\n");
   const next={...workRef.current,body:d.proposal.body,facebook:{...workRef.current.facebook,message:suggestedMessage.length<=60000?suggestedMessage:""},reviewed:false};
   const persisted=await guardarPropuestaEditorialLocal(owner,row,next);setRow(persisted);setCurrent(next);setWorked(true);setPreviewVisible(false);
   if(suggestedMessage.length>60000)setError("La crónica quedó conservada sin recortes. Completa por separado el texto exacto de Facebook (máximo 60000 caracteres); no se preparará una previa con ese campo vacío.");
  }catch(e){token.current="";setError((e instanceof Error?e.message:"No se pudo elaborar la crónica.")+" El original sigue archivado. No se publicará automáticamente la transcripción cruda.");}finally{setBusy(false);}
 };
 const prepare=async()=>{
  if(busy||!row.receipt||row.intent.decision!==null)return;
  setBusy(true);setError("");try{
   await pendingWork.current.catch(()=>undefined);let request=row.request;
   if(request&&(!row.elaboration||row.elaboration.sourceHash!==row.receipt.sha256||row.elaboration.bodyHash!==await huellaTexto(request.entry.body)))throw Error("Usa «Crear una nueva previa» para revisar esta versión anterior sin heredar autorización.");
   if(!request){
    const w=workRef.current;if(!worked||!w.reviewed)throw Error("Trabaja y coteja la crónica con el original antes de preparar su publicación.");
    if(!w.facebook.message.trim()||!w.title.trim()||!w.body.trim()||!row.draft?.date)throw Error("Completa el texto público de ambos destinos antes de preparar la vista previa.");
    request={publicationId:row.intent.publicationId,revision:revisionPropuestaEditorial(row),sourceId:row.receipt.volcado_id,sourceVersion:row.receipt.version,sourceHash:row.receipt.sha256,kind:"blog_personal",obfuscated:row.draft.obfuscated===true,entry:{schema:1,slug:"cronica-"+row.intent.publicationId,title:w.title,date:row.draft.date,body:w.body,source:{kind:"khora",sha256:await huellaTexto(w.body)}},facebook:w.facebook};
    assertPagesTextCompatible(request.entry);
    await save({...row,request,proposal:await crearPropuestaEditorialLocal(owner,row,w),elaboration:{method:"cronica-sobria-v1",sourceHash:row.receipt.sha256,bodyHash:await huellaTexto(w.body),reviewed:true}});
   }
   const d=await call({action:"prepare",expectedRevision:row.revisionBase??null,revision:request,...await turn()}),digest=await huellaTexto(canonicoEditorial(request));
   if(d.publicationId!==request.publicationId||d.revision!==request.revision||d.digest!==digest||canonicoEditorial(d.preview)!==canonicoEditorial(request.entry)||canonicoEditorial(d.facebook)!==canonicoEditorial(request.facebook)||JSON.stringify(d.destinations)!=='["blog","facebook"]')throw Error("La vista previa no corresponde a la revisión enviada. No se autorizó publicación.");
   await save({...row,request,proposal:await crearPropuestaEditorialLocal(owner,{...row,request},workRef.current),elaboration:row.elaboration||{method:"cronica-sobria-v1",sourceHash:row.receipt.sha256,bodyHash:await huellaTexto(request.entry.body),reviewed:true},prepared:{digest},intent:{...row.intent,state:"awaiting_decision"}});
   setPreviewVisible(true);setExposure(false);setRetryReady(false);
  }catch(e){token.current="";setError(e instanceof Error?e.message:"No se confirmó la vista previa.");}finally{setBusy(false);}
 };
 // Always compare a fresh owner-only server revision, not just a local boolean/status label.
 const resumeExact=async()=>{
  if(!row.request||!row.receipt)throw Error("Falta la referencia de la misma revisión.");
  const d=await call({action:"resume",publicationId:row.intent.publicationId,...await turn()}),r=row.request;
  const digest=await huellaTexto(canonicoEditorial(r));
  if(r.publicationId!==row.intent.publicationId||r.sourceId!==row.receipt.volcado_id||r.sourceVersion!==row.receipt.version||r.sourceHash!==row.receipt.sha256||d.digest!==digest||canonicoEditorial(d.revision)!==canonicoEditorial(r)||d.status?.revision!==r.revision||!["pending","approved","declined"].includes(d.status?.consent))throw Error("La revisión del servidor cambió. No se reutilizará el consentimiento.");
  return {status:d.status as Status,digest};
 };
 const observe=async(d:Status)=>{setStatus(d);if((row.intent.decision===true&&d.consent==="approved")||(row.intent.decision===false&&d.consent==="declined"))await save({...row,intent:{...row.intent,state:"received"}});};
 const recoverApproval=async()=>{
  if(busy||row.intent.decision!==true)return;setBusy(true);setError("");setRetryReady(false);try{
   const d=await resumeExact();await observe(d.status);
   if(d.status.consent==="approved")return;
   if(d.status.consent!=="pending"||(d.status.deliveries||[]).some(x=>["submitting","unknown","confirmed","cancelled"].includes(x.state)))throw Error("Esta revisión requiere reconciliación o una nueva previa; no se reenviará la autorización.");
   if(!row.elaboration||row.elaboration.sourceHash!==row.receipt?.sha256||row.elaboration.bodyHash!==await huellaTexto(row.request!.entry.body))throw Error("Usa una nueva previa para revisar esta versión anterior.");
   await save({...row,prepared:{digest:d.digest}});setPreviewVisible(true);setExposure(false);setRetryReady(true);
  }catch(e){token.current="";setError(e instanceof Error?e.message:"No se pudo recuperar la revisión.");}finally{setBusy(false);}
 };
 const decide=async(decision:boolean,retry=false)=>{
  if(busy||decision&&(!TEXT_ONLY_PUBLICATION_AUTHORIZED||!previewVisible||!row.prepared||!row.request||!row.elaboration||row.request.obfuscated&&!exposure||retry&&!retryReady))return;
  setBusy(true);setError("");try{
   await pendingWork.current.catch(()=>undefined);
   if(retry&&decision){const d=await resumeExact();if(d.status.consent==="approved"){await observe(d.status);setRetryReady(false);return;}if(d.status.consent!=="pending"||(d.status.deliveries||[]).some(x=>["submitting","unknown","confirmed","cancelled"].includes(x.state)))throw Error("La autorización no es reintentable sin reconciliar o revisar de nuevo.");if(d.digest!==row.prepared!.digest)throw Error("La huella exacta cambió.");}
   const next={...row,intent:{...row.intent,decision,state:"awaiting_editorial_receipt" as const},obfuscatedExposure:decision&&exposure};
   await save(next);setRetryReady(false);
   if(!row.receipt)throw Error("Falta reconciliar el recibo de archivo; no se publicará sin él.");
   const d:Status=decision?await call({action:"decide",publicationId:row.intent.publicationId,digest:row.prepared!.digest,decision:true,obfuscatedExposure:exposure,...await turn()}):await call({action:"decline_archived",reference:{publicationId:row.intent.publicationId,sourceId:row.receipt.volcado_id,sourceVersion:row.receipt.version,sourceHash:row.receipt.sha256}});
   if((decision&&d.revision!==row.request?.revision)||d.consent!==(decision?"approved":"declined"))throw Error("No se confirmó la decisión exacta.");
   setStatus(d);await save({...next,intent:{...next.intent,state:"received"}});
  }catch(e){token.current="";setError((e instanceof Error?e.message:"No se confirmó la decisión.")+" La elección queda pendiente de comprobación; no se han reenviado publicaciones a los destinos.");}finally{setBusy(false);}
 };
 const reconcile=async()=>{
  if(busy)return;setBusy(true);setError("");try{
   if(row.intent.decision===false){const d=await call({action:"status",publicationId:row.intent.publicationId});await observe(d);}
   else{const d=await resumeExact();await observe(d.status);}
  }catch(e){token.current="";setError(e instanceof Error?e.message:"Estado editorial no confirmado.");}finally{setBusy(false);}
 };
 const newPreview=async()=>{
  if(busy||!row.request||!row.receipt)return;setBusy(true);setError("");try{
   await pendingWork.current.catch(()=>undefined);
   let current:Awaited<ReturnType<typeof resumeExact>>;
   try{current=await resumeExact();}catch(e){
    // An old local prepare may never have reached the server. Saving that SAME draft
    // is idempotent and grants NO consent. A conflict/auth failure remains fail-closed.
    if(!(e instanceof Error)||e.message!=="EDITORIAL_FORBIDDEN")throw e;
    await call({action:"prepare",expectedRevision:row.revisionBase??null,revision:row.request,...await turn()});current=await resumeExact();
   }
   if(current.status.consent==="approved"||(current.status.deliveries||[]).some(x=>["submitting","unknown","confirmed"].includes(x.state)))throw Error("Reconciliación de entregas requerida. No se reemplazará una publicación aprobada o incierta.");
   const next:IntencionEditorialLocal={...row,revisionBase:row.request.revision,request:undefined,prepared:undefined,elaboration:undefined,proposal:undefined,obfuscatedExposure:false,intent:{...row.intent,decision:null,state:"awaiting_decision"}};
   const w={...workRef.current,reviewed:false};next.proposal=await crearPropuestaEditorialLocal(owner,next,w);
   await save(next);setCurrent(w);setWorked(true);setStatus(null);setPreviewVisible(false);setRetryReady(false);setExposure(false);
  }catch(e){token.current="";setError(e instanceof Error?e.message:"No se pudo iniciar una nueva previa.");}finally{setBusy(false);}
 };
 const locked=busy||!!row.request||row.intent.decision!==null;
 return <article className={s.editorialPanel}>
  {preparationError&&<p role="alert">{preparationError}</p>}
  <h2>¿Quieres que esta entrada se publique en el blog y en la Página de Facebook?</h2>
  <p role="status">Se publicará únicamente texto. El audio permanece privado en Custodia. El archivo es independiente de la publicación: se autorizan ambos destinos o ninguno.</p>
  <p>Momento del hecho: el que describes en el relato; si no lo precisaste, queda sin precisar. No se deduce de la captura ni del archivo.</p>
  <p>Marca local del registro/archivo: {row.draft?.date||"no disponible"}. No acredita cuándo ocurrió el hecho ni cuándo comenzó el dictado.</p>
  {!row.receipt&&<p role="status">Recibo de archivo pendiente. Recupera la misma captura; no se inventará una referencia ni se publicará.</p>}
  {row.receipt&&row.intent.decision===null&&<fieldset disabled={locked} className={s.editorialForm}><legend>Representación pública que se revisará</legend><p>El original permanece intacto. Trabaja la crónica y coteja sus puntos, atribuciones, negaciones y dudas. La cobertura técnica no certifica fidelidad.</p>
   <button type="button" className={s.secondary} disabled={busy} onClick={()=>void elaborate()}>Elaborar crónica desde el original</button>
   <details><summary>Consultar transcripción original</summary><p style={{whiteSpace:"pre-wrap"}}>{row.draft?.body}</p></details>
   <label>Título público<input aria-label="Título público" value={work.title} maxLength={160} onChange={e=>edit({title:e.target.value,reviewed:false})}/></label>
   <label>Texto del blog<textarea aria-label="Texto del blog" value={work.body} maxLength={200000} onChange={e=>edit({body:e.target.value,reviewed:false},true)}/></label>
   <label>Formato de Facebook<select aria-label="Formato de Facebook" value={work.facebook.format} onChange={e=>edit({facebook:{...workRef.current.facebook,format:e.target.value as "link"|"full_text"},reviewed:false})}><option value="link">Enlace al blog con mensaje</option><option value="full_text">Texto completo</option></select></label>
   <label>Texto exacto de Facebook<textarea aria-label="Texto exacto de Facebook" value={work.facebook.message} maxLength={60000} onChange={e=>edit({facebook:{...workRef.current.facebook,message:e.target.value},reviewed:false})}/></label>
   <label><input type="checkbox" checked={work.reviewed} disabled={!worked} onChange={e=>edit({reviewed:e.target.checked})}/> He trabajado el texto público y cotejado ambos destinos con el original, sin omitir puntos ni alterar su sentido.</label>
  </fieldset>}
  {row.receipt&&row.intent.decision===null&&<button className={s.secondary} disabled={busy||(!row.request&&(!worked||!work.reviewed))} onClick={()=>void prepare()}>{row.request?"Recuperar la misma vista previa":"Preparar vista previa de ambos destinos"}</button>}
  {previewVisible&&row.request&&<section className={s.editorialPreview} aria-label="Vista previa verificada"><h3>Blog · {row.request.entry.title}</h3><p>Marca de registro/archivo que mostrará el blog: {row.request.entry.date}. No es fecha del hecho ni confirmación de publicación.</p><p style={{whiteSpace:"pre-wrap"}}>{row.request.entry.body}</p><h3>Facebook · {row.request.facebook.format==="link"?"Enlace al blog con mensaje":"Texto completo"}</h3><p style={{whiteSpace:"pre-wrap"}}>{row.request.facebook.message}</p><p>Solo se autoriza este texto. No se publicarán audio, marca privada «ofuscada» ni metadatos privados.</p></section>}
  {previewVisible&&row.request?.obfuscated&&(row.intent.decision===null||retryReady)&&<label><input type="checkbox" checked={exposure} onChange={e=>setExposure(e.target.checked)}/> He revisado este texto ofuscado y autorizo expresamente su exposición pública exacta.</label>}
  {row.intent.decision===null&&<div className={s.editorialActions}><button className={s.primary} disabled={!TEXT_ONLY_PUBLICATION_AUTHORIZED||busy||!row.receipt||!previewVisible||!row.prepared||!row.elaboration||!!row.request?.obfuscated&&!exposure} onClick={()=>void decide(true)}>Sí, publicar en ambos</button><button className={s.secondary} disabled={busy} onClick={()=>void decide(false)}>No, conservar sin publicar</button></div>}
  {row.intent.decision!==null&&<p role="status">{row.intent.decision?publicadoEnAmbos(status||{})?"Publicación confirmada en ambos destinos.":status?.consent==="approved"?"Autorización confirmada por el servidor; la entrega en ambos destinos aún no está confirmada.":"Tu elección está guardada en este dispositivo; el servidor todavía no ha confirmado la autorización.":"Elegiste no publicar. La confirmación del servidor y el recibo de archivo en Custodia se comprueban por separado."}</p>}
  {row.intent.decision===true&&row.intent.state!=="received"&&<button className={s.secondary} disabled={busy} onClick={()=>void recoverApproval()}>Recuperar previa para reintentar mi autorización</button>}
  {retryReady&&<button className={s.primary} disabled={busy||!!row.request?.obfuscated&&!exposure} onClick={()=>void decide(true,true)}>Sí, reintentar esta misma versión en ambos</button>}
  {row.intent.decision===false&&row.intent.state!=="received"&&row.receipt&&<button className={s.secondary} disabled={busy} onClick={()=>void decide(false,true)}>Reintentar guardar mi decisión de no publicar</button>}
  {row.request&&status?.consent!=="approved"&&<button className={s.secondary} disabled={busy} onClick={()=>void newPreview()}>Crear una nueva previa sin heredar autorización</button>}
  {(row.prepared||row.intent.decision===false&&row.receipt)&&<button className={s.secondary} disabled={busy} onClick={()=>void reconcile()}>Comprobar estado sin reenviar publicaciones</button>}
  {status?.deliveries?.map(d=><p key={d.target+":"+d.revision}>{d.target==="blog"?"Blog":"Facebook"} · revisión {d.revision}: {d.state}</p>)}
  {error&&<p role="alert">{error}</p>}
 </article>;
}
