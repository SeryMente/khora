"use client";
import { useEffect, useRef, useState } from "react";
import { capturarDialogo, type CapturaDialogo, type ParteDialogo } from "../../../lib/dialogo/capturar";
import { formatearCaptura, type FuenteDialogo, type ManifiestoDialogo, type SegmentoCrudoDialogo } from "../../../lib/dialogo/contrato";
import { ColasDialogoVivo, agregarSegmentosAlFinal, formatearSegmentosCrudos, protegerEdicionHumana, reconciliarSegmentosCrudos } from "../../../lib/dialogo/live-transcription";
import type { VentanaDialogo } from "../../../lib/dialogo/live-audio-client";
import { guardarAudioLocal, guardarSnapshotLocal, recuperarLocal, cerrarSnapshotLocal } from "../../../lib/client/custodia-local";
import { subirAudioCustodiado } from "../../../lib/client/subir-audio-custodia";
import { nuevaRevision, type CapturaSnapshot } from "../../../lib/custodia/contrato";
import { IngresoView } from "../shared/IngresoView";
import s from "./ingreso-studio.module.css";

type ParteGuardada=Awaited<ReturnType<typeof subirAudioCustodiado>>;
const initial=():ManifiestoDialogo=>({version:1,estado:"preparando",etiquetas:{microphone:"Operador",chrome_tab:"Salida Chrome"},partesEsperadas:0,turnos:[]});
function download(blob:Blob,name:string){const url=URL.createObjectURL(blob),a=document.createElement("a");a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),10000);}
export function DialogoPanel({sessionId:requested,onSalir}:{sessionId?:string|null;onSalir?:()=>void}){
  const [recoveryTarget,setRecoveryTarget]=useState(requested);
  const [organizarComoDialogo,setOrganizarComoDialogo]=useState(true);
  const [ready,setReady]=useState(false),[busy,setBusy]=useState(false),[active,setActive]=useState(false);
  const [error,setError]=useState(""),[notice,setNotice]=useState(""),[text,setText]=useState("");
  const [rawSegments,setRawSegments]=useState<SegmentoCrudoDialogo[]>([]),[pendingSegments,setPendingSegments]=useState<SegmentoCrudoDialogo[]>([]);
  const [title,setTitle]=useState("Conversación"),[labels,setLabels]=useState(initial().etiquetas),[count,setCount]=useState(0);
  const [hasSession,setHasSession]=useState(false),[archived,setArchived]=useState(false),[volcadoId,setVolcadoId]=useState("");
  const [micStream,setMicStream]=useState<MediaStream|null>(null),[chromeStream,setChromeStream]=useState<MediaStream|null>(null);
  const [localCount,setLocalCount]=useState(0),[elapsed,setElapsed]=useState(0),[retryPreparation,setRetryPreparation]=useState(0);
  const visible=useRef({title,text});visible.current={title,text};
  const archivePayload=useRef<Record<string,unknown>|null>(null);
  const archiveBusy=useRef(false),stopping=useRef(false),transcribing=useRef(false);
  const rawSegmentsRef=useRef<SegmentoCrudoDialogo[]>([]),manualEditRef=useRef(false);
  const liveQueue=useRef<ColasDialogoVivo|null>(null),liveFailedSources=useRef(new Set<FuenteDialogo>());
  const transcriptionState=useRef<string|null>(null);

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
  const snapshot=():CapturaSnapshot=>({sessionId:id.current,...nuevaRevision(),texto:textRef.current,parcial:"",titulo:visible.current.title,fuenteEntrada:"dialogo",duracionSeg:duration.current,audioPartes:[...stored.current],dialogo:{...manifest.current,partesEsperadas:manifest.current.partesEsperadas,segmentosRaw:[...rawSegmentsRef.current]}});
  const persist=async(remote=true)=>{
    const snap=snapshot();
    localQueue.current=localQueue.current.catch(()=>undefined).then(()=>guardarSnapshotLocal(owner.current,snap));await localQueue.current;
    if(remote){
      const r=await fetch("/api/dictado/checkpoint",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(snap),signal:AbortSignal.timeout(15000)});
      const d=await r.json().catch(()=>({}));if(!r.ok||d.revisionId!==snap.revisionId)throw Error("Checkpoint remoto pendiente; conserva esta pestaña y exporta los originales.");
    }
  };
  const finish=async()=>{
    const current=capture.current;if(!current||stopping.current)return;
    stopping.current=true;setBusy(true);
    try{
      await current.detener();capture.current=null;
      manifest.current.estado=interrupted.current?"interrumpido":"detenido";
      await queue.current;
      const liveResult=await liveQueue.current?.waitForIdle(25000);
      for(const source of liveResult?.failedSources||[])liveFailedSources.current.add(source);
      transcriptionState.current=liveFailedSources.current.size?"parcial":"completo";
      await persist();
      const sources=new Set(raw.current.map(p=>p.fuente));
      if(!sources.has("microphone")||!sources.has("chrome_tab")){
        manifest.current.estado="interrumpido";await persist();
        setError("No se recibieron partes de ambas fuentes. No se transcribió ni se declaró completo. Conserva los originales disponibles y comprueba ambas señales.");
      }else if(errorRemote.current){
        setNotice("Hay partes pendientes de confirmar en servidor; los originales locales siguen conservados. Reintenta custodiar antes de archivar.");
      }else if(mounted.current&&liveFailedSources.current.size){
        await transcribeRef.current([...liveFailedSources.current]);
      }else if(mounted.current){
        const rendered=formatearSegmentosCrudos(rawSegmentsRef.current,manifest.current.etiquetas);
        if(!manualEditRef.current&&rendered){textRef.current=rendered;setText(rendered);}
        setNotice(rendered?"Transcripción en vivo completa. Revisa y edita el texto; los segmentos crudos quedan separados en el checkpoint.":"No se detectó voz en las ventanas procesadas. Revisa las señales y conserva los originales.");
      }
    }catch(e){setError("No se confirmó toda la custodia o el cierre de la transcripción. El audio disponible se conserva; reintenta y exporta si es necesario.");}
    finally{
      capture.current=null;stopping.current=false;inProgress.current=false;setActive(false);
      setMicStream(null);setChromeStream(null);setBusy(false);
    }
  };  const finishRef=useRef(finish);finishRef.current=finish;
  const transcribeRef=useRef<(sources?:FuenteDialogo[])=>Promise<void>>(async()=>undefined);
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
          rawSegmentsRef.current=[...(selected.dialogo.segmentosRaw||[])];setRawSegments(rawSegmentsRef.current);setPendingSegments([]);manualEditRef.current=false;
          stored.current=(data.recovery?.audioPartes||[]) as ParteGuardada[];
          raw.current=local.audios.filter(x=>x.sessionId===recoveryTarget).map(x=>({parte:x.part,blob:x.blob,fuente:x.meta.upload.fuenteAudio,startMs:x.meta.upload.startMs,endMs:x.meta.upload.endMs,duracionMs:x.meta.upload.duracionMs})).sort((a,b)=>a.parte-b.parte);
          if(!["detenido","interrumpido"].includes(manifest.current.estado))manifest.current.estado="interrumpido";
          textRef.current=selected.texto;setText(selected.texto);setLabels(manifest.current.etiquetas);setOrganizarComoDialogo(manifest.current.organizarComoDialogo!==false);setTitle(selected.titulo);setCount(stored.current.length);localConfirmed.current=new Set(raw.current.map(p=>p.parte));setLocalCount(localConfirmed.current.size);setHasSession(true);
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
  },[title,text,hasSession,active,busy,archived]);
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
    manifest.current={...initial(),organizarComoDialogo:true,etiquetas:{...labels},segmentosRaw:[]};interrupted.current=false;
    rawSegmentsRef.current=[];setRawSegments([]);setPendingSegments([]);manualEditRef.current=false;liveFailedSources.current.clear();
    liveQueue.current=new ColasDialogoVivo({onSegments:segments=>{
      const update=protegerEdicionHumana(textRef.current,rawSegmentsRef.current,segments,manualEditRef.current,manifest.current.etiquetas);
      const next=update.rawSegments;rawSegmentsRef.current=next;manifest.current.segmentosRaw=next;setRawSegments(next);
      if(manualEditRef.current)setPendingSegments(previous=>reconciliarSegmentosCrudos([...previous,...segments]));
      else {textRef.current=update.displayText;setText(update.displayText);}
      void persist().catch(()=>{if(mounted.current)setError("Transcripción en vivo recibida; checkpoint pendiente. Los originales siguen conservados.");});
    }});
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
        onVentana:(window:VentanaDialogo)=>{if(!liveQueue.current?.enqueue({...window,sessionId:id.current}))liveFailedSources.current.add(window.fuente);},
        onLiveUnavailable:source=>{liveFailedSources.current.add(source);if(mounted.current)setNotice("La transcripción en vivo de una fuente no está disponible; se reconstruirá desde su original al detener.");},
        onInterrupcion:reason=>{interrupted.current=true;setError(reason);queueMicrotask(()=>void finishRef.current());},
      });
      if(!mounted.current){interrupted.current=true;await c.detener();releaseLock.current?.();releaseLock.current=null;inProgress.current=false;return;}
      capture.current=c;manifest.current.estado="grabando";setMicStream(c.stream);setChromeStream(c.chromeStream);setActive(true);setHasSession(true);
      await persist();
      window.history.replaceState(null,"","/sistema/ingreso?modo=dialogo&sessionId="+id.current);
      setNotice("La transcripción llega en vivo. Puedes editar el texto; los segmentos crudos y las pistas originales se conservan en Custodia.");
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
  const transcribe=async(fuentes?:FuenteDialogo[])=>{
    if(transcribing.current||archiveBusy.current||archived||archivePayload.current)return;
    transcribing.current=true;setBusy(true);setError("");setNotice("Reconstruyendo desde los originales custodiados las ventanas que no llegaron por el carril en vivo…");
    try{
      await persist();
      const r=await fetch("/api/transcribir/dialogo",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({sessionId:id.current,...(fuentes?{fuentes}:{})}),signal:AbortSignal.timeout(240000)});
      const d=await r.json();
      if(!r.ok||!Array.isArray(d.turnos))throw Error(d.detail||"No se confirmó la reconstrucción.");
      if(!d.exito&&manifest.current.turnos.length)throw Error("La reconstrucción es parcial; se conservan los segmentos anteriores.");
      transcriptionState.current=d.exito?"completo":"parcial";
      manifest.current.turnos=[...manifest.current.turnos,...d.turnos];
      const recovered=(d.turnos||[]).map((turn:any,index:number)=>({fuente:turn.fuente,sequence:Math.max(1,Math.min(10000,Math.floor(turn.start_ms/6000)+1)),start_ms:turn.start_ms,end_ms:turn.end_ms,texto:turn.texto} as SegmentoCrudoDialogo));
      const merged=reconciliarSegmentosCrudos([...rawSegmentsRef.current,...recovered]);rawSegmentsRef.current=merged;manifest.current.segmentosRaw=merged;setRawSegments(merged);
      if(manualEditRef.current)setPendingSegments(previous=>reconciliarSegmentosCrudos([...previous,...recovered]));
      else {textRef.current=formatearSegmentosCrudos(merged,manifest.current.etiquetas);setText(textRef.current);}
      await persist();
      setNotice(d.exito?(manualEditRef.current?"Reconstrucción completada para ventanas fallidas. Tu edición se conserva; los segmentos recuperados están pendientes para añadirlos al final.":"Ventanas fallidas reconstruidas desde los originales. Revisa el texto y archiva el volcado."):"Reconstrucción parcial: una fuente sigue pendiente. El audio original permanece íntegro.");
    }catch(e){transcriptionState.current="fallido";setError((e instanceof Error?e.message:"No se confirmó la reconstrucción.")+" Los originales se conservan; puedes reintentar.");}
    finally{transcribing.current=false;setBusy(false);}
  };  transcribeRef.current=transcribe;
  const archive=async()=>{
    if(archiveBusy.current||inProgress.current||transcribing.current||archived)return;
    archiveBusy.current=true;setBusy(true);setError("");
    try{
      if(!id.current||!stored.current.length||errorRemote.current||stored.current.length!==manifest.current.partesEsperadas)throw Error("Confirma todas las partes de audio antes de archivar. Los originales no se borraron.");
      if(!["detenido","interrumpido"].includes(manifest.current.estado))throw Error("Detén ambas fuentes antes de archivar.");
      if(!archivePayload.current){
      await persist();
      const ordered=[...stored.current].sort((a,b)=>a.parte-b.parte);
      archivePayload.current={sessionId:id.current,texto:textRef.current,titulo:visible.current.title.trim()||null,fuenteEntrada:"dialogo",audioPartes:ordered,audioUrl:ordered[0].url,audioBytes:ordered.reduce((n,p)=>n+p.bytes,0),duracionSeg:Math.ceil(duration.current),pulidoAplicado:false,estadoTranscripcion:transcriptionState.current||"pendiente"};
      }
      const payload=archivePayload.current;
      const response=await fetch("/api/dictado",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(payload),signal:AbortSignal.timeout(120000)});
      const receipt=await response.json().catch(()=>({}));
      if(!response.ok)throw Error(receipt.detail||"No se confirmó el archivo. Reintenta sin iniciar otra captura.");
      if(!receipt.id||receipt.sessionId!==id.current||!/^[a-f0-9]{64}$/i.test(receipt.sha256||""))throw Error("Recibo de archivo inválido. Conserva esta sesión y reintenta.");
      // Mark the remote seal immediately: a local cleanup error must not permit editing the archived original.
      setArchived(true);setVolcadoId(receipt.id);setNotice("Volcado archivado con ambos originales. Continúa en Custodia para revisar, aprobar e ingerir; no se ingirió automáticamente.");
      await cerrarSnapshotLocal(owner.current,id.current).catch(()=>setError("Volcado confirmado en servidor; limpieza del borrador local pendiente. No dupliques el archivo."));
    }catch(e){setError((e instanceof Error?e.message:"No se confirmó el archivo.")+(archivePayload.current?" Reintenta Archivar con esta misma sesión y texto; no se duplicará voluntariamente ni se descartarán originales.":""));}
    finally{archiveBusy.current=false;setBusy(false);}
  };
  const downloadMaster=async()=>{
    setBusy(true);setError("");
    try{
      const response=await fetch("/api/transcribir/dialogo/master?sessionId="+encodeURIComponent(id.current),{cache:"no-store"});
      if(!response.ok||!response.headers.get("content-type")?.startsWith("audio/wav"))throw Error("No se pudo generar el audio estéreo combinado. Los originales siguen en Custodia.");
      const bytes=await response.arrayBuffer(),expected=response.headers.get("x-audio-sha256")||"";
      const digest=Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256",bytes))).map(value=>value.toString(16).padStart(2,"0")).join("");
      if(!/^[a-f0-9]{64}$/i.test(expected)||digest!==expected)throw Error("La huella SHA-256 del WAV combinado no coincide; no se descargó.");
      const blob=new Blob([bytes],{type:"audio/wav"}),url=URL.createObjectURL(blob),link=document.createElement("a");
      link.href=url;link.download="dialogo-"+id.current+".wav";link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
      setNotice("Master WAV estéreo verificado: canal izquierdo USUARIO y canal derecho CHROME. Las pistas originales permanecen intactas.");
    }catch(e){setError(e instanceof Error?e.message:"No se pudo descargar el master estéreo.");}
    finally{setBusy(false);}
  };  return <IngresoView state={{
    titulo:title,texto:text,estado:active?"dictando":"inactivo",modoEntrada:"chrome_live_caption",
    finalizando:busy&&active,organizarComoDialogo,dialogoChrome:true,dialogoSesion:hasSession,chromeStream,stream:micStream,
    chromeBridgeEstado:"captura nativa",chromeCaptionActivo:false,chromeCapturaEstado:active?"grabando":"inactiva",
    archivado:archived,archivoPendiente:!!archivePayload.current&&!archived,custodiaReady:ready,custodiaPreparando:!ready&&!error,
    custodiaEstado:active?`Chrome + micrófono · ${elapsed} s · ${localCount} partes recibidas · ${count} confirmadas en servidor`:archived?"Volcado archivado · "+volcadoId:hasSession?`${localCount} partes locales · ${count} confirmadas en servidor`:ready?"Salvaguarda preparada":"Salvaguarda no preparada",
    editando:false,soportado:true,escuchando:active,guardando:archiveBusy.current,procesando:busy,generandoTitulo:false,retranscribiendo:transcribing.current,adjuntandoAudio:false,exportandoAudio:false,audioExportable:false,
    conAudio:hasSession,segmentosPendientes:pendingSegments.length,partesContador:count,bytesAcumulados:stored.current.reduce((n,p)=>n+p.bytes,0),reconexiones:0,pulidosOk:0,pulidosNo:0,reconciliacionMensaje:"",aviso:notice,error,resultado:archived?"Volcado disponible en Custodia":"",
    chromeExtra:<><details className={s.diagnostics}><summary>Originales y detalles de captura</summary>{hasSession&&!active&&<>
      <button className={s.secondary} disabled={busy||archived} onClick={()=>void retry()}>Reintentar conservar</button>
      <button className={s.secondary} disabled={busy||active||!hasSession||errorRemote.current} onClick={()=>void downloadMaster()}>Descargar audio estéreo único</button>
      <button className={s.secondary} disabled={busy} onClick={()=>download(new Blob([JSON.stringify(snapshot(),null,2)],{type:"application/json"}),"dialogo-manifiesto.json")}>Exportar diálogo y manifiesto</button>
    </>}
    <p className={s.notice}>Originales separados y custodia cifrada de Khora. Mismo transcriptor configurado; sin Live Caption. Dos fuentes no identifican a cada persona dentro de una pista. Límite preventivo de 18 MB por fuente. No uses llamadas clínicas sin los permisos y condiciones requeridos.</p></details>{archived&&<a className={s.secondary} href="/sistema/custodia">Revisar volcado en Custodia</a>}</>
  }} actions={{
    onIniciar:()=>void start(),onPrepararChrome:()=>void start(),onDetener:()=>void finish(),
    onAppendLiveSegments:()=>{if(!pendingSegments.length||busy||archived)return;const next=agregarSegmentosAlFinal(textRef.current,pendingSegments,manifest.current.etiquetas);textRef.current=next;setText(next);setPendingSegments([]);},
    onDialogoChange:enabled=>{if(!enabled&&!hasSession&&!active&&!busy)onSalir?.();},
    onGuardar:()=>void archive(),onRetranscribir:undefined,
    onTituloChange:value=>{if(!busy&&!active&&!archived&&!archivePayload.current)setTitle(value);},
    onTextoChange:value=>{if(!busy&&!archived&&!archivePayload.current){if(value!==textRef.current)manualEditRef.current=true;textRef.current=value;setText(value);}},
    onReintentarPreparacion:()=>setRetryPreparation(n=>n+1),
    onLimpiar:()=>{if(active||busy)return;if(hasSession&&!archived){setError("Archiva este diálogo o exporta sus originales antes de iniciar otro. No se descartó la captura.");return;}window.location.assign("/sistema/ingreso");}
  }}/>;
}
