"use client";
import { useState } from "react";
import * as I from "lucide-react";
import { AudioActivity } from "../ingreso/AudioActivity";
import s from "../ingreso/ingreso-studio.module.css";
export type IngresoViewState = {
  archivado?: boolean;
  custodiaEstado?: string;
  custodiaReady?: boolean;
  custodiaPreparando?: boolean;
  recuperando?: boolean;
  recuperaciones?: number;
  stream?: MediaStream | null;
  titulo: string;
  texto: string;
  estado: "inactivo" | "dictando";
  modoEntrada: "ninguno" | "microfono" | "chrome_live_caption";
  chromeBridgeEstado: string;
  chromeCaptionActivo: boolean;
  chromeCapturaEstado: string;
  editando: boolean;
  soportado: boolean;
  escuchando: boolean;
  guardando: boolean;
  generandoTitulo: boolean;
  retranscribiendo: boolean;
  adjuntandoAudio: boolean;
  exportandoAudio: boolean;
  audioExportable: boolean;
  conAudio: boolean;
  partesContador: number;
  bytesAcumulados: number;
  reconexiones: number;
  pulidosOk: number;
  pulidosNo: number;
  reconciliacionMensaje: string;
  aviso: string;
  error: string;
  resultado: string;
};

export type IngresoViewActions = {
  onReintentarPreparacion?: () => void;
  onRecuperar?: () => void;
  onTituloChange?: (val: string) => void;
  onIniciarEdicion?: () => void;
  onTextoChange?: (val: string) => void;
  onGenerarTitulo?: () => void;
  onIniciar?: () => void;
  onPrepararChrome?: () => void;
  onDetener?: () => void;
  onGuardar?: () => void;
  onRetranscribir?: () => void;
  onAdjuntarClick?: () => void;
  onExportarAudio?: () => void;
  onExportarMp3?: () => void;
  onLimpiar?: () => void;
  onConfirmarEdicion?: () => void;
};

export function IngresoView({state:v,actions:a={},isReviewMode=false}:{state:IngresoViewState;actions?:IngresoViewActions;isReviewMode?:boolean}) {
 const actions=a;
 const [more,setMore]=useState(false);
 const busy=v.guardando||v.adjuntandoAudio||v.retranscribiendo||!!v.recuperando;
 const locked=busy||!!v.archivado;
 const recording=v.estado==="dictando";
 return <main data-ui-id="ingreso.container" className={s.studio}>
  <header className={s.heading}>
   <div><p className={s.eyebrow}>ESPACIO DE CAPTURA</p><h1>Ingreso</h1><p className={s.subtitle}>Dale espacio a lo que piensas.</p></div>
   <button className={s.secondary} onClick={a.onRecuperar} disabled={busy||recording||v.editando} aria-haspopup="dialog"><I.History size={18}/><span>Recuperar capturas</span>{!!v.recuperaciones&&<span className={s.count}>{v.recuperaciones}</span>}</button>
  </header>
  <section className={s.sheet} aria-label="Captura actual">
   <div className={s.capturebar}>
    <div className={s.micgroup}>
     {!recording?<button data-ui-id="ingreso.btn-iniciar" className={s.primary} disabled={locked||v.editando||v.custodiaReady===false||v.conAudio} onClick={a.onIniciar}><I.Mic size={19}/>Iniciar dictado</button>:
      <button data-ui-id="ingreso.btn-detener" className={s.primary} disabled={busy} onClick={a.onDetener}><I.Square size={15}/>{v.modoEntrada==="chrome_live_caption"?"Detener captura Chrome":"Detener dictado"}</button>}
     <div className={s.signal}><AudioActivity stream={v.stream||null} active={recording&&!v.editando}/><span data-ui-id="ingreso.status-listening">{v.custodiaReady===false?(v.custodiaPreparando?"Preparando salvaguarda…":"Captura no preparada"):v.editando?"Dictado en pausa":recording?(v.modoEntrada==="chrome_live_caption"?"Captura de pestaña":v.stream?"Micrófono activo":"Preparando audio"):v.conAudio?"Audio conservado por partes":"Micrófono en espera"}</span></div>
    </div>
    <div className={s.toolgroup}>
     <button data-ui-id="ingreso.btn-adjuntar" className={s.quiet} disabled={locked||recording||v.editando||v.custodiaReady===false} onClick={a.onAdjuntarClick}><I.Paperclip size={17}/>{v.adjuntandoAudio?"Adjuntando…":"Adjuntar audio"}</button>
     <button className={s.iconButton} aria-label="Más opciones de captura" aria-expanded={more} aria-controls="ingreso-options" onClick={()=>setMore(!more)}><I.Ellipsis size={21}/></button>
    </div>
   </div>
   {more&&<div className={s.options} id="ingreso-options">
    <button data-ui-id="ingreso.btn-chrome" className={s.secondary} disabled={locked||recording||v.editando} onClick={a.onPrepararChrome}><I.Monitor size={17}/>Capturar Chrome</button>
    <button data-ui-id="ingreso.btn-titulo-ia" className={s.secondary} disabled={locked||v.generandoTitulo||!v.texto.trim()} onClick={a.onGenerarTitulo}><I.Sparkles size={17}/>{v.generandoTitulo?"Generando…":"Título con IA"}</button>
    {!!a.onRetranscribir&&<button data-ui-id="ingreso.btn-retranscribir" className={s.secondary} disabled={locked||recording||!v.conAudio} onClick={a.onRetranscribir}><I.RefreshCw size={17}/>{v.retranscribiendo?"Re-transcribiendo…":"Re-transcribir audio"}</button>}
    {v.audioExportable&&<button data-ui-id="ingreso.btn-exportar-audio" className={s.secondary} disabled={busy||v.exportandoAudio} onClick={a.onExportarAudio}><I.Download size={17}/>Exportar audio original</button>}
   </div>}
   {v.modoEntrada==="chrome_live_caption"&&<p data-ui-id="ingreso.banner-chrome" className={s.notice}>Captura Chrome · {v.chromeCapturaEstado}. Activa Aisthesis en la pestaña que reproduce el audio. La onda de esta pantalla representa solo el micrófono conectado, no el audio de otra pestaña.</p>}
   {!v.soportado&&<p className={s.notice}>Este navegador no ofrece reconocimiento en vivo. Puedes conservar audio, escribir o pegar texto.</p>}
  {(v.error||v.aviso||v.resultado||v.reconciliacionMensaje)&&<div className={s.messages}>
   {v.error&&<p role="alert" data-ui-id="ingreso.msg-error" className={s.error}><I.CircleAlert size={18}/>{v.error}</p>}
   {v.aviso&&<p data-ui-id="ingreso.aviso-degradado" className={s.notice}><I.Info size={18}/>{v.aviso}</p>}
   {v.resultado&&<p data-ui-id="ingreso.msg-resultado" className={s.notice}><I.Check size={18}/>{v.resultado}</p>}
   {v.reconciliacionMensaje&&<p data-ui-id="ingreso.msg-reconciliacion" className={s.notice}>{v.reconciliacionMensaje}</p>}
  </div>}
   <div className={s.editor}>
    <label className={s.srOnly} htmlFor="ingreso-title">Título de la captura</label>
    <input id="ingreso-title" aria-label="Título de la captura" data-ui-id="ingreso.titulo-input" className={s.title} value={v.titulo} readOnly={locked} onChange={e=>a.onTituloChange?.(e.target.value)} placeholder="Sin título" maxLength={500}/>
    <label className={s.srOnly} htmlFor="ingreso-text">Texto de la captura</label>
    <textarea id="ingreso-text" aria-label="Texto de la captura" data-ui-id="ingreso.textarea" className={s.textarea} value={v.texto} readOnly={locked} onFocus={()=>a.onIniciarEdicion?.()} onClick={() => actions.onIniciarEdicion?.()} onChange={e=>a.onTextoChange?.(e.target.value)} placeholder="Escribe, pega o empieza a dictar.
Este espacio es tuyo." spellCheck/>
   </div>
   {v.editando&&<div data-ui-id="ingreso.banner-edicion" className={s.editing}><span><I.PencilLine size={16}/>Edición in situ activa · tu texto se conserva.</span><button data-ui-id="ingreso.btn-confirmar-edicion" className={s.secondary} disabled={locked} onClick={a.onConfirmarEdicion}>Confirmar edición</button></div>}
   <footer className={s.sheetfooter}>
    <p role="status" aria-live="polite" data-ui-id="ingreso.custodia-status" className={s.storage}><I.ShieldCheck size={16}/><span>{v.recuperando?"Recuperando sin sustituir el original…":v.custodiaEstado||"Salvaguarda de captura"}</span></p>
    {v.custodiaReady===false&&!v.custodiaPreparando&&a.onReintentarPreparacion&&<button className={s.secondary} onClick={a.onReintentarPreparacion}>Reintentar preparación</button>}
    <span className={s.characters}>{v.texto.length.toLocaleString('es')} caracteres</span>
   </footer>
  </section>
  <div className={s.bottombar}>
   <div className={s.bottomleft}>
    {v.conAudio&&v.partesContador>0&&<button className={s.quiet} disabled={busy||v.exportandoAudio} onClick={a.onExportarMp3}><I.Download size={17}/>{v.exportandoAudio?"Preparando descarga…":"Descargar MP3 conservado"}</button>}
    <button data-ui-id="ingreso.btn-limpiar" className={s.quiet} disabled={busy||recording||v.editando} onClick={a.onLimpiar}><I.Plus size={18}/>{v.archivado?"Nueva captura":"Limpiar"}</button>
   </div>
   <button data-ui-id="ingreso.btn-archivar" className={s.archive} onClick={a.onGuardar} disabled={locked||recording||v.editando||(!v.texto.trim()&&!v.conAudio)}><I.Archive size={18}/>{v.guardando?"Archivando…":v.archivado?"Captura archivada":"Archivar registro"}</button>
  </div>
  {more&&<details className={s.diagnostics}><summary>Detalles de la captura</summary><p data-ui-id="ingreso.stats">Estado: {v.estado} · Audio: {v.partesContador} partes verificadas · {(v.bytesAcumulados/1048576).toFixed(2)} MB · Reconexiones: {v.reconexiones} · Bloques procesados: {v.pulidosOk} / pendientes: {v.pulidosNo}</p><p>Un corte conservado no demuestra que se haya registrado el último instante antes de una interrupción.</p></details>}
 </main>;
}
