"use client";
import { useEffect, useRef, useState } from "react";
import { capturarDialogo, type CapturaDialogo, type ParteDialogo } from "../../../lib/dialogo/capturar";
import { formatearDialogo, type FuenteDialogo, type ManifiestoDialogo } from "../../../lib/dialogo/contrato";
import { guardarAudioLocal, guardarSnapshotLocal, recuperarLocal } from "../../../lib/client/custodia-local";
import { subirAudioCustodiado } from "../../../lib/client/subir-audio-custodia";
import { nuevaRevision, type CapturaSnapshot } from "../../../lib/custodia/contrato";
import s from "./ingreso-studio.module.css";

type ParteGuardada=Awaited<ReturnType<typeof subirAudioCustodiado>>;
const initial=():ManifiestoDialogo=>({version:1,estado:"preparando",etiquetas:{microphone:"Operador",chrome_tab:"Salida Chrome"},partesEsperadas:0,turnos:[]});
function download(blob:Blob,name:string){const url=URL.createObjectURL(blob),a=document.createElement("a");a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),10000);}
export function DialogoPanel({sessionId:requested}:{sessionId?:string|null}){
  const [ready,setReady]=useState(false),[busy,setBusy]=useState(false),[active,setActive]=useState(false);
  const [error,setError]=useState(""),[notice,setNotice]=useState(""),[text,setText]=useState("");
  const [title,setTitle]=useState("Conversación"),[labels,setLabels]=useState(initial().etiquetas),[count,setCount]=useState(0);
  const [hasSession,setHasSession]=useState(false);
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
  const raw=useRef<ParteDialogo[]>([]),stored=useRef<ParteGuardada[]>([]),capture=useRef<CapturaDialogo|null>(null);
  const queue=useRef<Promise<void>>(Promise.resolve()),localQueue=useRef<Promise<void>>(Promise.resolve());
  const errorRemote=useRef(false),duration=useRef(0),interrupted=useRef(false),mounted=useRef(true),inProgress=useRef(false);
  const snapshot=():CapturaSnapshot=>({sessionId:id.current,...nuevaRevision(),texto:textRef.current,parcial:"",titulo:title,fuenteEntrada:"dialogo",duracionSeg:duration.current,audioPartes:[...stored.current],dialogo:{...manifest.current,partesEsperadas:manifest.current.partesEsperadas}});
  const persist=async(remote=true)=>{
    const snap=snapshot();
    localQueue.current=localQueue.current.catch(()=>undefined).then(()=>guardarSnapshotLocal(owner.current,snap));await localQueue.current;
    if(remote){
      const r=await fetch("/api/dictado/checkpoint",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(snap),signal:AbortSignal.timeout(15000)});
      const d=await r.json().catch(()=>({}));if(!r.ok||d.revisionId!==snap.revisionId)throw Error("Checkpoint remoto pendiente; conserva esta pestaña y exporta los originales.");
    }
  };
  const finish=async()=>{
    const current=capture.current;if(!current)return;
    setBusy(true);
    try{
      await current.detener();capture.current=null;
      manifest.current.estado=interrupted.current?"interrumpido":"detenido";
      await queue.current;
      await persist();
      setNotice(errorRemote.current?"Hay partes pendientes de confirmar en el servidor. Reintenta conservar antes de transcribir.":"Audio detenido y checkpoint confirmado. Puedes transcribir ambas fuentes.");
    }catch{setError("No se confirmó toda la custodia. El audio disponible se conserva; exporta y reintenta.");}
    finally{capture.current=null;inProgress.current=false;setActive(false);setBusy(false);}
  };
  const finishRef=useRef(finish);finishRef.current=finish;
  useEffect(()=>{
    let cancelled=false;mounted.current=true;
    (async()=>{
      try{
        const r=await fetch("/api/dictado/checkpoint?bootstrap=1",{cache:"no-store",signal:AbortSignal.timeout(15000)}),d=await r.json();
        if(!r.ok||typeof d.owner!=="string"||!d.owner)throw Error("Salvaguarda no preparada. Inicia sesión y vuelve a cargar.");
        if(cancelled)return;owner.current=d.owner;
        if(requested){
          await acquireLock(requested);
          if(cancelled){releaseLock.current?.();releaseLock.current=null;return;}
          const recovery=await fetch("/api/dictado/checkpoint?sessionId="+encodeURIComponent(requested),{cache:"no-store"});
          const data=await recovery.json();
          if(!recovery.ok||data.owner!==owner.current)throw Error("No se pudo comprobar la captura solicitada.");
          const local=await recuperarLocal(owner.current);
          const localSnap=local.snapshots.find(x=>x.sessionId===requested&&x.fuenteEntrada==="dialogo");
          const remoteSnap=data.recovery?.fuenteEntrada==="dialogo"?data.recovery as CapturaSnapshot:undefined;
          const selected=localSnap&&(!remoteSnap||localSnap.clientAt>remoteSnap.clientAt)?localSnap:remoteSnap;
          if(!selected?.dialogo)throw Error("La sesión solicitada no es un diálogo recuperable.");
          if(cancelled)return;
          id.current=requested;manifest.current=selected.dialogo;duration.current=selected.duracionSeg;
          stored.current=(data.recovery?.audioPartes||[]) as ParteGuardada[];
          raw.current=local.audios.filter(x=>x.sessionId===requested).map(x=>({parte:x.part,blob:x.blob,fuente:x.meta.upload.fuenteAudio,startMs:x.meta.upload.startMs,endMs:x.meta.upload.endMs,duracionMs:x.meta.upload.duracionMs})).sort((a,b)=>a.parte-b.parte);
          if(!["detenido","interrumpido"].includes(manifest.current.estado))manifest.current.estado="interrumpido";
          textRef.current=selected.texto;setText(selected.texto);setLabels(manifest.current.etiquetas);setTitle(selected.titulo);setCount(stored.current.length);setHasSession(true);
          setNotice("Diálogo recuperado; no se reanuda ni se mezcla con otra grabadora. Los originales permanecen separados por fuente.");
        }
        setReady(true);
      }catch(e){releaseLock.current?.();releaseLock.current=null;if(!cancelled)setError(e instanceof Error?e.message:"No se pudo preparar la custodia.");}
    })();
    return()=>{cancelled=true;mounted.current=false;if(capture.current){interrupted.current=true;void finishRef.current().finally(()=>{releaseLock.current?.();releaseLock.current=null;});}else{releaseLock.current?.();releaseLock.current=null;}};
  // An explicit session link is a recovery request, never an automatic resume.
  },[requested]);
  useEffect(()=>{const warn=(e:BeforeUnloadEvent)=>{if(inProgress.current){e.preventDefault();e.returnValue="";}};window.addEventListener("beforeunload",warn);return()=>window.removeEventListener("beforeunload",warn);},[]);
  const upload=async(p:ParteDialogo)=>{
    if(stored.current.some(x=>x.parte===p.parte))return;
    const meta={fuenteAudio:p.fuente,startMs:p.startMs,endMs:p.endMs,duracionMs:p.duracionMs};
    const result=await subirAudioCustodiado(id.current,p.parte,p.blob,meta);
    stored.current.push(result);stored.current.sort((a,b)=>a.parte-b.parte);if(mounted.current)setCount(stored.current.length);
  };
  const start=async()=>{
    if(!ready||inProgress.current||hasSession)return;
    inProgress.current=true;setBusy(true);setError("");setNotice("");id.current=crypto.randomUUID();
    raw.current=[];stored.current=[];duration.current=0;errorRemote.current=false;
    manifest.current={...initial(),etiquetas:{...labels}};interrupted.current=false;
    try{
      const c=await capturarDialogo({
        antesDeGrabar:async()=>{await acquireLock(id.current);await persist();},
        onParte:async p=>{
          raw.current.push(p);manifest.current.partesEsperadas=raw.current.length;duration.current=Math.max(duration.current,p.endMs/1000);
          // Retain original chunks locally even after server ACK; recovery/export must not depend on the provider.
          await guardarAudioLocal(owner.current,id.current,p.parte,p.blob,{upload:{fuenteAudio:p.fuente,startMs:p.startMs,endMs:p.endMs,duracionMs:p.duracionMs}});
          await persist(false);
          queue.current=queue.current.then(async()=>{if(errorRemote.current)return;try{await upload(p);await persist();}catch{errorRemote.current=true;if(mounted.current)setError("Audio local conservado; confirmación remota pendiente. No cierres sin exportar.");}});
        },
        onInterrupcion:reason=>{interrupted.current=true;setError(reason);queueMicrotask(()=>void finishRef.current());},
      });
      capture.current=c;manifest.current.estado="grabando";setActive(true);setHasSession(true);
      window.history.replaceState(null,"","/sistema/ingreso?modo=dialogo&sessionId="+id.current);
      setNotice("Grabando Chrome y micrófono. Usa audífonos para evitar que la voz de Chrome vuelva a entrar por el micrófono.");
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
  const transcribe=async()=>{
    setBusy(true);setError("");
    try{
      await persist();
      const r=await fetch("/api/transcribir/dialogo",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({sessionId:id.current}),signal:AbortSignal.timeout(240000)}),d=await r.json();
      if(!r.ok||!Array.isArray(d.turnos))throw Error(d.detail||"No se confirmó la transcripción.");
      if(!d.exito&&manifest.current.turnos.length)throw Error("La nueva transcripción es parcial; se conserva el diálogo anterior.");
      manifest.current.turnos=d.turnos;textRef.current=formatearDialogo(d.turnos,manifest.current.etiquetas);setText(textRef.current);
      await persist();
      setNotice(d.exito?"Diálogo transcrito y checkpoint confirmado. Revisa atribución por fuente, tiempos y fidelidad contra los originales.":"Transcripción parcial: una fuente falló. Se conserva el audio; no es un diálogo completo.");
    }catch(e){setError(e instanceof Error?e.message:"No se confirmó la transcripción. Los originales se conservan.");}
    finally{setBusy(false);}
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
  return <main className={s.studio} data-ui-id="dialogo.container">
    <header className={s.heading}><div><p className={s.eyebrow}>CAPTURA DE CONVERSACIÓN</p><h1>Modo Diálogo</h1><p className={s.subtitle}>Chrome y micrófono, conservados por separado.</p></div>{!active&&!busy&&<a className={s.secondary} href="/sistema/ingreso">Volver a Ingreso</a>}</header>
    <section className={s.sheet} aria-label="Diálogo actual">
      <div className={s.capturebar}>
        {!active?<button className={s.primary} disabled={!ready||busy||hasSession} onClick={()=>void start()}>Iniciar Chrome + micrófono</button>:<button className={s.primary} disabled={busy} onClick={()=>void finish()}>Detener ambas fuentes</button>}
        <span role="status">{active?"Ambas fuentes en grabación":ready?"Custodia preparada":"Preparando salvaguarda"} · {count} partes confirmadas</span>
      </div>
      <div className={s.editor}>
        <label>Título<input className={s.title} value={title} maxLength={500} disabled={hasSession||busy} onChange={e=>setTitle(e.target.value)}/></label>
        <label>Micrófono<input value={labels.microphone} maxLength={80} disabled={hasSession||busy} onChange={e=>setLabels({...labels,microphone:e.target.value||"Micrófono"})}/></label>
        <label>Salida de Chrome<input value={labels.chrome_tab} maxLength={80} disabled={hasSession||busy} onChange={e=>setLabels({...labels,chrome_tab:e.target.value||"Salida Chrome"})}/></label>
        <p className={s.notice}>Selecciona la pestaña de la conversación y activa Compartir audio. La fuente no identifica a cada persona: una pestaña puede contener varios hablantes. No se deducen roles por idioma.</p>
        <p className={s.notice}>Audio local cifrado y custodia de Khora; transcripción externa mediante el proveedor ya configurado. Sin Live Caption, escucha permanente, aprobación ni ingesta automática. No uses llamadas clínicas sin los permisos y condiciones requeridos.</p>
        {error&&<p role="alert" className={s.error}>{error}</p>}{notice&&<p role="status" className={s.notice}>{notice}</p>}
        <label htmlFor="dialogo-text">Transcripción por fuente</label><textarea id="dialogo-text" className={s.textarea} value={text} readOnly placeholder="El diálogo se transcribe desde los originales después de detener ambas fuentes."/>
      </div>
    </section>
    {hasSession&&!active&&<div className={s.options}>
      <button className={s.secondary} disabled={busy} onClick={()=>void retry()}>Reintentar conservar</button>
      <button className={s.primary} disabled={busy} onClick={()=>void transcribe()}>{busy?"Procesando…":"Transcribir diálogo"}</button>
      <button className={s.secondary} disabled={busy} onClick={()=>void exportAudio("microphone")}>Exportar micrófono</button>
      <button className={s.secondary} disabled={busy} onClick={()=>void exportAudio("chrome_tab")}>Exportar Chrome</button>
      <button className={s.secondary} disabled={busy} onClick={()=>download(new Blob([JSON.stringify(snapshot(),null,2)],{type:"application/json"}),"dialogo-manifiesto.json")}>Exportar diálogo y manifiesto</button>
      <a className={s.secondary} href="/sistema/ingreso?modo=dialogo">Nuevo diálogo</a>
    </div>}
    <p className={s.notice}>Las partes locales se intentan conservar cada 5 segundos; no es garantía ante suspensión o fallo físico. Los tiempos derivan del modelo y del reloj de captura, no están certificados palabra por palabra. Dos fuentes no sustituyen diarización médica. Límite preventivo: 18 MB por fuente; al alcanzarlo se detiene y se conserva el tramo como interrumpido.</p>
  </main>;
}
