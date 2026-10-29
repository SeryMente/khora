"use client";
import {firmaCustodia,luzCustodia,audioCustodiadoCompleto} from "../../../lib/custodia/estado";
import {useTituloCaptura} from "../../../lib/client/use-titulo-captura";
import { CLASIFICACION_INICIAL, clasificacionRecuperada, type ClasificacionEntrada, type PublicationIntent, iniciarIntencion, huellaTexto } from "../../../lib/custodia/editorial";
import { useEffect, useRef, useState } from "react";
import { capturarDialogo, type CapturaDialogo, type ParteDialogo } from "../../../lib/dialogo/capturar";
import { formatearCaptura, type FuenteDialogo, type ManifiestoDialogo } from "../../../lib/dialogo/contrato";
import { guardarIntencionEditorialLocal, guardarAudioLocal, guardarSnapshotLocal, recuperarLocal, cerrarSnapshotLocal } from "../../../lib/client/custodia-local";
import { subirAudioCustodiado } from "../../../lib/client/subir-audio-custodia";
import { nuevaRevision, type CapturaSnapshot } from "../../../lib/custodia/contrato";
import { IngresoView } from "../shared/IngresoView";
import { PublicacionCapturaPendiente } from "./PublicacionCapturaPendiente";
import s from "./ingreso-studio.module.css";

type ParteGuardada=Awaited<ReturnType<typeof subirAudioCustodiado>>;
const initial=():ManifiestoDialogo=>({version:1,estado:"preparando",etiquetas:{microphone:"Operador",chrome_tab:"Salida Chrome"},partesEsperadas:0,turnos:[]});
function download(blob:Blob,name:string){const url=URL.createObjectURL(blob),a=document.createElement("a");a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),10000);}
export function DialogoPanel({sessionId:requested,onSalir,clasificacion=CLASIFICACION_INICIAL,onClasificacionChange}:{sessionId?:string|null;onSalir?:()=>void;clasificacion?:ClasificacionEntrada;onClasificacionChange?:(value:ClasificacionEntrada)=>void}){
  const [recoveryTarget,setRecoveryTarget]=useState(requested);
  const [organizarComoDialogo,setOrganizarComoDialogo]=useState(true);
  const [ready,setReady]=useState(false),[busy,setBusy]=useState(false),[active,setActive]=useState(false);
  const [error,setError]=useState(""),[notice,setNotice]=useState(""),[text,setText]=useState("");
  const [custodiaProof,setCustodiaProof]=useState("");
  const [custodiaFailure,setCustodiaFailure]=useState(false);
  const [archivoReceiptVerified,setArchivoReceiptVerified]=useState(false);
  const [title,setTitle]=useState("Conversación"),[labels,setLabels]=useState(initial().etiquetas),[count,setCount]=useState(0);
  const [hasSession,setHasSession]=useState(false),[archived,setArchived]=useState(false),[volcadoId,setVolcadoId]=useState("");
  const [micStream,setMicStream]=useState<MediaStream|null>(null),[chromeStream,setChromeStream]=useState<MediaStream|null>(null);
  const [localCount,setLocalCount]=useState(0),[elapsed,setElapsed]=useState(0),[retryPreparation,setRetryPreparation]=useState(0);
  const visible=useRef({title,text,...clasificacion});visible.current={title,text,...clasificacion};
  const publicationIntent=useRef<PublicationIntent|undefined>(undefined);
  const archivePayload=useRef<Record<string,unknown>|null>(null);
  const archiveBusy=useRef(false),stopping=useRef(false),transcribing=useRef(false);
  const transcriptionState=useRef<string|null>(null);
  const liveJob=useRef<Promise<void>|null>(null),lastLivePart=useRef(0),lastLiveAt=useRef(0);
  const [liveTranscribing,setLiveTranscribing]=useState(false);
  const liveAbort=useRef<AbortController|null>(null);

  const releaseLock=useRef<(()=>void)|null>(null);
  const acquireLock=async(sessionId:string)=>{
    if(releaseLock.current)return;
    if(!navigator.locks)throw Error("Este navegador no permite proteger la sesión frente a otra pestaña.");
    await new Promise<void>((resolve,reject)=>{
      void navigator.locks.request("khora-dialogo:"+sessionId,{ifAvailable:true},async lock=>{
        if(!lock){reject(Error("Este diálogo está abierto en otra pestaña. Detén y cierra la otra vista antes de recuperarlo."));return;}
        await new Promise<void>(release=>{releaseLock.current=release;resolve();});
      }).catch(reject);
    });
  };
  const owner=useRef(""),id=useRef(""),manifest=useRef(initial()),textRef=useRef("");
  const localConfirmed=useRef(new Set<number>());
  const raw=useRef<ParteDialogo[]>([]),stored=useRef<ParteGuardada[]>([]),capture=useRef<CapturaDialogo|null>(null);
  const queue=useRef<Promise<void>>(Promise.resolve()),localQueue=useRef<Promise<void>>(Promise.resolve());
  const errorRemote=useRef(false),duration=useRef(0),interrupted=useRef(false),mounted=useRef(true),inProgress=useRef(false);
  const snapshot=():CapturaSnapshot=>({sessionId:id.current,...nuevaRevision(),texto:textRef.current,parcial:"",titulo:visible.current.title,tipoEntrada:visible.current.tipoEntrada,ofuscada:visible.current.ofuscada,publicationIntent:publicationIntent.current,fuenteEntrada:"dialogo",duracionSeg:duration.current,audioPartes:[...stored.current],dialogo:{...manifest.current,etiquetas:{...manifest.current.etiquetas},turnos:manifest.current.turnos.map(t=>({...t})),partesEsperadas:manifest.current.partesEsperadas}});
  const persist=async(remote=true)=>{
    const snap=snapshot();
    localQueue.current=localQueue.current.catch(()=>undefined).then(()=>guardarSnapshotLocal(owner.current,snap));try{await localQueue.current;}catch(e){setCustodiaFailure(true);throw e;}setCustodiaProof(firmaCustodia(snap));setCustodiaFailure(false);
    if(remote){
      const r=await fetch("/api/dictado/checkpoint",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(snap),signal:AbortSignal.timeout(15000)});
      const d=await r.json().catch(()=>({}));if(!r.ok||d.revisionId!==snap.revisionId)throw Error("Checkpoint remoto pendiente; conserva esta pestaña y exporta los originales.");
    }
  };
  const finish=async()=>{
    const current=capture.current;if(!current||stopping.current)return;
    stopping.current=true;
    setBusy(true);
    try{
      await current.detener();capture.current=null;liveAbort.current?.abort();
      manifest.current.estado=interrupted.current?"interrumpido":"detenido";
      await queue.current;
      await liveJob.current;
      await persist();
      const sources=new Set(raw.current.map(p=>p.fuente));
      if(!sources.has("microphone")||!sources.has("chrome_tab")){
        manifest.current.estado="interrumpido";await persist();
        setError("No se recibieron partes de ambas fuentes. No se transcribió ni se declaró completo. Conserva/exporta el audio disponible y comprueba las señales antes de otra captura.");
      }
      else if(!errorRemote.current&&mounted.current){await transcribeRef.current();}
      else setNotice(errorRemote.current?"Hay partes pendientes de confirmar en el servidor. Reintenta conservar antes de transcribir.":"Audio detenido y checkpoint confirmado. Puedes transcribir ambas fuentes.");
    }catch{setError("No se confirmó toda la custodia. El audio disponible se conserva; exporta y reintenta.");}
    finally{capture.current=null;stopping.current=false;inProgress.current=false;setActive(false);setMicStream(null);setChromeStream(null);setBusy(false);}
  };
  const finishRef=useRef(finish);finishRef.current=finish;
  const transcribeRef=useRef<(parcial?:boolean)=>Promise<void>>(async()=>undefined);
  useEffect(()=>{
    if(!active)return;
    const timer=setInterval(()=>{
      if(stopping.current||liveJob.current||errorRemote.current||!mounted.current)return;
      const parts=stored.current,cut=parts.length;
      if(cut<=lastLivePart.current||!parts.some(p=>p.fuenteAudio==="microphone")||!parts.some(p=>p.fuenteAudio==="chrome_tab")||Date.now()-lastLiveAt.current<20000)return;
      lastLiveAt.current=Date.now();
      const job=transcribeRef.current(true);liveJob.current=job;void job.finally(()=>{if(liveJob.current===job)liveJob.current=null;});
    },1000);
    return()=>{clearInterval(timer);liveAbort.current?.abort();};
  },[active]);
  useEffect(()=>{if(!active)return;const began=Date.now();setElapsed(0);const timer=setInterval(()=>setElapsed(Math.floor((Date.now()-began)/1000)),1000);return()=>clearInterval(timer);},[active]);
  // Next App Router propagates our own replaceState to useSearchParams. Publishing
  // this session's URL is NOT an external recovery request and must not stop audio.
  useEffect(()=>{
    if(requested===id.current)return;
    if(inProgress.current||id.current){
      if(requested)setError("Hay una captura abierta. Archívala o exporta sus originales antes de abrir otra sesión.");
      return;
    }
    setRecoveryTarget(requested);
  },[requested]);
  useEffect(()=>{
    let cancelled=false;mounted.current=true;setReady(false);setError("");
    (async()=>{
      try{
        const r=await fetch("/api/dictado/checkpoint?bootstrap=1",{cache:"no-store",signal:AbortSignal.timeout(15000)}),d=await r.json();
        if(!r.ok||typeof d.owner!=="string"||!d.owner)throw Error("Salvaguarda no preparada. Inicia sesión y vuelve a cargar.");
        if(cancelled)return;owner.current=d.owner;
        if(recoveryTarget){
          await acquireLock(recoveryTarget);
          if(cancelled){releaseLock.current?.();releaseLock.current=null;return;}
          const recovery=await fetch("/api/dictado/checkpoint?sessionId="+encodeURIComponent(recoveryTarget),{cache:"no-store"});
          const data=await recovery.json();
          if(!recovery.ok||data.owner!==owner.current)throw Error("No se pudo comprobar la captura solicitada.");
          const local=await recuperarLocal(owner.current);
          const localSnap=local.snapshots.find(x=>x.sessionId===recoveryTarget&&x.fuenteEntrada==="dialogo");
          const remoteSnap=data.recovery?.fuenteEntrada==="dialogo"?data.recovery as CapturaSnapshot:undefined;
          const selected=localSnap&&(!remoteSnap||localSnap.clientAt>remoteSnap.clientAt)?localSnap:remoteSnap;
          if(!selected?.dialogo)throw Error("La sesión solicitada no es un diálogo recuperable.");
          if(cancelled)return;
          id.current=recoveryTarget;manifest.current=selected.dialogo;duration.current=selected.duracionSeg;
          stored.current=(data.recovery?.audioPartes||[]) as ParteGuardada[];
          raw.current=local.audios.filter(x=>x.sessionId===recoveryTarget).map(x=>({parte:x.part,blob:x.blob,fuente:x.meta.upload.fuenteAudio,startMs:x.meta.upload.startMs,endMs:x.meta.upload.endMs,duracionMs:x.meta.upload.duracionMs})).sort((a,b)=>a.parte-b.parte);
          if(!["detenido","interrumpido"].includes(manifest.current.estado))manifest.current.estado="interrumpido";
          publicationIntent.current=selected.publicationIntent;onClasificacionChange?.(clasificacionRecuperada(selected));textRef.current=selected.texto;setText(selected.texto);setLabels(manifest.current.etiquetas);setOrganizarComoDialogo(manifest.current.organizarComoDialogo!==false);setTitle(selected.titulo);setCount(stored.current.length);localConfirmed.current=new Set(raw.current.map(p=>p.parte));setLocalCount(localConfirmed.current.size);setHasSession(true);
          setNotice("Diálogo recuperado; no se reanuda ni se mezcla con otra grabadora. Los originales permanecen separados por fuente.");
        }
        setReady(true);
      }catch(e){releaseLock.current?.();releaseLock.current=null;if(!cancelled)setError(e instanceof Error?e.message:"No se pudo preparar la custodia.");}
    })();
    return()=>{cancelled=true;mounted.current=false;if(capture.current){interrupted.current=true;void finishRef.current().finally(()=>{releaseLock.current?.();releaseLock.current=null;});}else{releaseLock.current?.();releaseLock.current=null;}};
  // An explicit session link is a recovery request, never an automatic resume.
  },[recoveryTarget,retryPreparation]);
  useEffect(()=>{const warn=(e:BeforeUnloadEvent)=>{if(inProgress.current){e.preventDefault();e.returnValue="";}};window.addEventListener("beforeunload",warn);return()=>window.removeEventListener("beforeunload",warn);},[]);
  useEffect(()=>{
    if(!hasSession||active||busy||archived||archivePayload.current)return;
    const timer=setTimeout(()=>void persist().catch(()=>setError("Edición local conservada; checkpoint remoto pendiente.")),1500);
    return()=>clearTimeout(timer);
  },[title,text,clasificacion,hasSession,active,busy,archived]);
  const upload=async(p:ParteDialogo)=>{
    if(stored.current.some(x=>x.parte===p.parte))return;
    const meta={fuenteAudio:p.fuente,startMs:p.startMs,endMs:p.endMs,duracionMs:p.duracionMs};
    const result=await subirAudioCustodiado(id.current,p.parte,p.blob,meta);
    stored.current.push(result);stored.current.sort((a,b)=>a.parte-b.parte);if(mounted.current)setCount(stored.current.length);
  };
  const start=async()=>{
    if(!ready||inProgress.current||hasSession)return;
    inProgress.current=true;setBusy(true);setError("");setNotice("Selecciona la pestaña con Compartir audio y autoriza el micrófono. Aún no se está grabando.");id.current=crypto.randomUUID();
    raw.current=[];stored.current=[];duration.current=0;errorRemote.current=false;localConfirmed.current.clear();setLocalCount(0);setCount(0);
    manifest.current={...initial(),organizarComoDialogo,etiquetas:{...labels}};interrupted.current=false;
    try{
      const c=await capturarDialogo({
        antesDeGrabar:async()=>{if(!mounted.current)throw Error("La vista se cerró antes de grabar.");await acquireLock(id.current);await persist();if(!mounted.current)throw Error("La vista se cerró durante la preparación.");},
        onParte:async p=>{
          raw.current.push(p);manifest.current.partesEsperadas=raw.current.length;duration.current=Math.max(duration.current,p.endMs/1000);
          // Retain original chunks locally even after server ACK; recovery/export must not depend on the provider.
          await guardarAudioLocal(owner.current,id.current,p.parte,p.blob,{upload:{fuenteAudio:p.fuente,startMs:p.startMs,endMs:p.endMs,duracionMs:p.duracionMs}});
          localConfirmed.current.add(p.parte);if(mounted.current)setLocalCount(localConfirmed.current.size);
          await persist(false);
          queue.current=queue.current.then(async()=>{if(errorRemote.current)return;try{await upload(p);await persist();}catch{errorRemote.current=true;if(mounted.current)setError("Audio local conservado; confirmación remota pendiente. No cierres sin exportar.");}});
        },
        onInterrupcion:reason=>{interrupted.current=true;setError(reason);queueMicrotask(()=>void finishRef.current());},
      });
      if(!mounted.current){interrupted.current=true;await c.detener();releaseLock.current?.();releaseLock.current=null;inProgress.current=false;return;}
      capture.current=c;manifest.current.estado="grabando";setMicStream(c.stream);setChromeStream(c.chromeStream);setActive(true);setHasSession(true);
      window.history.replaceState(null,"","/sistema/ingreso?modo=dialogo&sessionId="+id.current);
      setNotice("Grabando Chrome y micrófono; comprueba ambas señales. La transcripción se actualizará por avances verificados, con latencia; al detener se revisa el conjunto completo. Usa audífonos para evitar eco.");
    }catch(e){
      manifest.current.estado="interrumpido";interrupted.current=true;
      await queue.current;
      if(raw.current.length){setHasSession(true);await persist(false);window.history.replaceState(null,"","/sistema/ingreso?modo=dialogo&sessionId="+id.current);}
      releaseLock.current?.();releaseLock.current=null;
      setError(e instanceof Error?e.message:"No se pudo iniciar la captura dual.");inProgress.current=false;
    }
    finally{setBusy(false);}
  };
  const retry=async()=>{
    setBusy(true);setError("");errorRemote.current=false;
    try{for(const p of raw.current)await upload(p);await persist();setNotice("Partes y checkpoint confirmados en el servidor.");}
    catch{errorRemote.current=true;setError("Custodia remota pendiente; los originales locales no se borraron.");}
    finally{setBusy(false);}
  };
  const transcribe=async(parcial=false)=>{
    if(transcribing.current||archiveBusy.current||archived||archivePayload.current)return;
    if(parcial&&(!inProgress.current||stopping.current))return;
    const corte=stored.current.length;
    const controller=parcial?new AbortController():null;if(parcial)liveAbort.current=controller;
    transcribing.current=true;if(parcial)setLiveTranscribing(true);else{setBusy(true);setError("");setNotice("Transcribiendo ambas fuentes desde los originales conservados…");}
    try{
      await persist();
      const r=await fetch("/api/transcribir/dialogo",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({sessionId:id.current,...(parcial?{parcial:true,hastaParte:corte}:{})}),signal:controller?AbortSignal.any([controller.signal,AbortSignal.timeout(240000)]):AbortSignal.timeout(240000)}),d=await r.json();
      if(!r.ok||!Array.isArray(d.turnos))throw Error(d.detail||"No se confirmó la transcripción.");
      if(!d.exito&&manifest.current.turnos.length)throw Error("La nueva transcripción es parcial; se conserva el diálogo anterior.");
      if(!mounted.current)return;
      if(parcial&&(!d.parcial||d.hastaParte!==corte||!d.exito))throw Error("Avance pendiente: no se confirmaron ambas transcripciones.");
      transcriptionState.current=parcial?"parcial":d.exito?"completo":"parcial";
      manifest.current.turnos=d.turnos;textRef.current=formatearCaptura(d.turnos,manifest.current.etiquetas,manifest.current.organizarComoDialogo!==false);setText(textRef.current);
      await persist();
      if(parcial){lastLivePart.current=corte;setNotice("Transcripción provisional hasta "+corte+" partes verificadas. La captura sigue abierta; no es el registro completo.");return;}
      setNotice(d.exito?(textRef.current.trim()?"Diálogo insertado en Ingreso. Revísalo y pulsa Archivar como volcado; la ingesta requiere la revisión y aprobación habituales.":"No se reconoció habla en los originales. Revisa las señales y exporta el audio para comprobarlo."):"Transcripción parcial: una fuente falló. Se conserva el audio; no es un diálogo completo.");
    }catch(e){if(parcial){setNotice("Avance de transcripción pendiente; el texto anterior y los originales se conservan. Se reintentará con nuevas partes.");return;}transcriptionState.current="fallido";setError((e instanceof Error?e.message:"No se confirmó la transcripción.")+" Los originales se conservan; puedes reintentar o archivarlos sin inventar texto.");}
    finally{transcribing.current=false;if(parcial){liveAbort.current=null;setLiveTranscribing(false);}else setBusy(false);}
  };
  transcribeRef.current=transcribe;
  const archive=async()=>{
    if(archiveBusy.current||inProgress.current||transcribing.current||archived)return;
    archiveBusy.current=true;setBusy(true);setError("");
    try{
      if(!id.current||!stored.current.length||errorRemote.current||stored.current.length!==manifest.current.partesEsperadas)throw Error("Confirma todas las partes de audio antes de archivar. Los originales no se borraron.");
      if(!["detenido","interrumpido"].includes(manifest.current.estado))throw Error("Detén ambas fuentes antes de archivar.");
      if(!archivePayload.current){
      if(visible.current.tipoEntrada==="blog_personal") {
        publicationIntent.current=await iniciarIntencion(textRef.current,publicationIntent.current);
        await guardarIntencionEditorialLocal(owner.current,{sessionId:id.current,intent:publicationIntent.current,draft:{title:visible.current.title,body:textRef.current,date:new Date().toISOString(),obfuscated:visible.current.ofuscada}});
      }
      await persist();
      const ordered=[...stored.current].sort((a,b)=>a.parte-b.parte);
      archivePayload.current={sessionId:id.current,texto:textRef.current,titulo:visible.current.title.trim()||null,tipoEntrada:visible.current.tipoEntrada,ofuscada:visible.current.ofuscada,fuenteEntrada:"dialogo",audioPartes:ordered,audioUrl:ordered[0].url,audioBytes:ordered.reduce((n,p)=>n+p.bytes,0),duracionSeg:Math.ceil(duration.current),pulidoAplicado:false,estadoTranscripcion:transcriptionState.current||"pendiente"};
      }
      const payload=archivePayload.current;
      const response=await fetch("/api/dictado",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(payload),signal:AbortSignal.timeout(120000)});
      const receipt=await response.json().catch(()=>({}));
      if(!response.ok)throw Error(receipt.detail||"No se confirmó el archivo. Reintenta sin iniciar otra captura.");
      if(!receipt.id||receipt.sessionId!==id.current||!/^[a-f0-9]{64}$/i.test(receipt.sha256||""))throw Error("Recibo de archivo inválido. Conserva esta sesión y reintenta.");
      if(await huellaTexto(String(payload.texto))!==String(receipt.sha256).toLowerCase()||receipt.version!==1||receipt.tipoEntrada!==payload.tipoEntrada||receipt.ofuscada!==payload.ofuscada)throw Error("El recibo no acredita el contenido y la clasificación enviados.");
      // Mark the remote seal immediately: a local cleanup error must not permit editing the archived original.
      setArchivoReceiptVerified(true);setArchived(true);setVolcadoId(receipt.id);setNotice("Volcado archivado con ambos originales. Continúa en Custodia para revisar, aprobar e ingerir; no se ingirió automáticamente.");
      if(publicationIntent.current&&payload.tipoEntrada==="blog_personal") {
        publicationIntent.current={...publicationIntent.current,state:"awaiting_decision"};
        await guardarIntencionEditorialLocal(owner.current,{sessionId:id.current,intent:publicationIntent.current,draft:{title:visible.current.title,body:textRef.current,date:new Date().toISOString(),obfuscated:visible.current.ofuscada},receipt:{volcado_id:receipt.id,version:receipt.version,sha256:receipt.sha256}}).catch(()=>setError("Archivo confirmado; recibo editorial local pendiente. No dupliques la captura."));
      }
      await cerrarSnapshotLocal(owner.current,id.current).catch(()=>setError("Volcado confirmado en servidor; limpieza del borrador local pendiente. No dupliques el archivo."));
    }catch(e){setError((e instanceof Error?e.message:"No se confirmó el archivo.")+(archivePayload.current?" Reintenta Archivar con esta misma sesión y texto; no se duplicará voluntariamente ni se descartarán originales.":""));}
    finally{archiveBusy.current=false;setBusy(false);}
  };
  const exportAudio=async(fuente:FuenteDialogo)=>{
    setBusy(true);setError("");
    try{
      const parts=raw.current.filter(p=>p.fuente===fuente).sort((a,b)=>a.parte-b.parte);
      // Local is complete only if EVERY expected global part is present (not just this source's tail).
      if(raw.current.length===manifest.current.partesEsperadas&&parts.length){download(new Blob(parts.map(p=>p.blob),{type:"audio/webm"}),`dialogo-${fuente}.webm`);return;}
      const r=await fetch(`/api/transcribir/dialogo?sessionId=${encodeURIComponent(id.current)}&fuente=${fuente}`,{cache:"no-store"});
      if(!r.ok)throw Error("Original completo no disponible. Conserva las partes locales y reintenta la custodia.");
      download(await r.blob(),`dialogo-${fuente}.webm`);
    }catch(e){setError(e instanceof Error?e.message:"No se pudo exportar el original.");}
    finally{setBusy(false);}
  };
  useTituloCaptura(text,id.current,!archived&&!busy,setTitle);
  return <IngresoView state={{
    editorialExtra:<PublicacionCapturaPendiente owner={owner.current} refresh={Number(archived)}/>,clasificacion,titulo:title,texto:text,estado:active?"dictando":"inactivo",modoEntrada:"chrome_live_caption",
    transcripcionPorAvances:true,finalizando:busy&&active,organizarComoDialogo,dialogoChrome:true,dialogoSesion:hasSession,chromeStream,stream:micStream,
    chromeBridgeEstado:"captura nativa",chromeCaptionActivo:false,chromeCapturaEstado:active?"grabando":"inactiva",
    archivado:archived,archivoPendiente:!!archivePayload.current&&!archived,custodiaReady:ready,custodiaPreparando:!ready&&!error,
    custodiaLuz:luzCustodia({archivedReceipt:archivoReceiptVerified,exactSnapshot:custodiaProof===firmaCustodia(snapshot()),audioComplete:audioCustodiadoCompleto(snapshot()),inFlight:active||busy,confirmedFailure:custodiaFailure}),
    custodiaEstado:active?`Chrome + micrófono · ${elapsed} s · ${localCount} partes recibidas · ${count} confirmadas en servidor`:archived?"Volcado archivado · "+volcadoId:hasSession?`${localCount} partes locales · ${count} confirmadas en servidor`:ready?"Salvaguarda preparada":"Salvaguarda no preparada",
    editando:false,soportado:true,escuchando:active,guardando:archiveBusy.current,procesando:busy,generandoTitulo:false,retranscribiendo:!active&&transcribing.current,adjuntandoAudio:false,exportandoAudio:false,audioExportable:false,
    conAudio:hasSession,partesContador:count,bytesAcumulados:stored.current.reduce((n,p)=>n+p.bytes,0),reconexiones:0,pulidosOk:0,pulidosNo:0,reconciliacionMensaje:"",aviso:liveTranscribing?"Actualizando transcripción provisional; puedes detener la captura.":notice,error,resultado:archived?"Volcado disponible en Custodia":"",
    chromeExtra:<><details className={s.diagnostics}><summary>Originales y detalles de captura</summary>{hasSession&&!active&&<>
      <button className={s.secondary} disabled={busy||archived} onClick={()=>void retry()}>Reintentar conservar</button>
      <button className={s.secondary} disabled={busy} onClick={()=>void exportAudio("microphone")}>Exportar micrófono</button>
      <button className={s.secondary} disabled={busy} onClick={()=>void exportAudio("chrome_tab")}>Exportar Chrome</button>
      <button className={s.secondary} disabled={busy} onClick={()=>download(new Blob([JSON.stringify(snapshot(),null,2)],{type:"application/json"}),"dialogo-manifiesto.json")}>Exportar diálogo y manifiesto</button>
    </>}
    <p className={s.notice}>Originales separados y custodia cifrada de Khora. Mismo transcriptor configurado; sin Live Caption. Dos fuentes no identifican a cada persona dentro de una pista. Límite preventivo de 18 MB por fuente. No uses llamadas clínicas sin los permisos y condiciones requeridos.</p></details>{archived&&<a className={s.secondary} href="/sistema/custodia">Revisar volcado en Custodia</a>}</>
  }} actions={{
    onClasificacionChange:value=>{if(!busy&&!active&&!archived&&!archivePayload.current){onClasificacionChange?.(value);if(!hasSession&&value.tipoEntrada!=="conversacion_maya"&&value.tipoEntrada!=="interpretacion_simultanea")onSalir?.();}},
    onIniciar:()=>void start(),onPrepararChrome:()=>void start(),onDetener:()=>void finish(),
    onOrganizarDialogoChange:enabled=>{if(!hasSession&&!active&&!busy)setOrganizarComoDialogo(enabled);},
    onDialogoChange:enabled=>{if(!enabled&&!hasSession&&!active&&!busy)onSalir?.();},
    onGuardar:()=>void archive(),onRetranscribir:archivePayload.current?undefined:()=>void transcribe(),
    onTituloChange:value=>{if(!busy&&!active&&!archived&&!archivePayload.current)setTitle(value);},
    onTextoChange:value=>{if(!busy&&!active&&!archived&&!archivePayload.current){textRef.current=value;setText(value);}},
    onReintentarPreparacion:()=>setRetryPreparation(n=>n+1),
    onLimpiar:()=>{if(active||busy)return;if(hasSession&&!archived){setError("Archiva este diálogo o exporta sus originales antes de iniciar otro. No se descartó la captura.");return;}window.location.assign("/sistema/ingreso");}
  }}/>;
}
