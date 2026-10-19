"use client";
import {descripcionLuz,type LuzCustodia} from "../../../lib/custodia/estado";
import { useState } from "react";
import * as I from "lucide-react";
import { TipoEntradaControl } from "../ingreso/TipoEntradaControl";
import type { ClasificacionEntrada } from "../../../lib/custodia/editorial";
import { AudioActivity } from "../ingreso/AudioActivity";
import s from "../ingreso/ingreso-studio.module.css";
export type IngresoViewState = {
  clasificacion?: ClasificacionEntrada;
  editorialExtra?: import("react").ReactNode;
  archivado?: boolean;
  procesando?: boolean;
  finalizando?: boolean;
  organizarComoDialogo?: boolean;
  custodiaDetalle?: string;
  audioPendiente?: number;
  archivoPendiente?: boolean;
  dialogoChrome?: boolean;
  dialogoSesion?: boolean;
  chromeStream?: MediaStream | null;
  chromeExtra?: import("react").ReactNode;
  custodiaEstado?: string;
  custodiaLuz?: LuzCustodia;
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
  onClasificacionChange?: (value: ClasificacionEntrada) => void;
  onReintentarPreparacion?: () => void;
  onRecuperar?: () => void;
  onTituloChange?: (val: string) => void;
  onIniciarEdicion?: () => void;
  onTextoChange?: (val: string) => void;
  onGenerarTitulo?: () => void;
  onIniciar?: () => void;
  onPrepararChrome?: () => void;
  onDialogoChange?: (enabled:boolean) => void;
  onOrganizarDialogoChange?: (enabled:boolean) => void;
  onReintentarCustodia?: () => void;
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
 const [chromeOpen,setChromeOpen]=useState(!!v.dialogoChrome);
 const busy=!!v.finalizando||!!v.procesando||v.guardando||v.adjuntandoAudio||v.retranscribiendo||!!v.recuperando;
 const locked=busy||!!v.archivado;
 const recording=v.estado==="dictando";
 return <main data-ui-id="ingreso.container" className={s.studio}>
  <header className={s.heading}>
   <div><p className={s.eyebrow}>ESPACIO DE CAPTURA</p><h1>Ingreso</h1><p className={s.subtitle}>Dale espacio a lo que piensas.</p></div>
   {(a.onRecuperar||isReviewMode)&&<button className={s.secondary} onClick={a.onRecuperar} disabled={busy||recording||v.editando} aria-haspopup="dialog"><I.History size={18}/><span>Recuperar capturas</span>{!!v.recuperaciones&&<span className={s.count}>{v.recuperaciones}</span>}</button>}
  </header>
  <section className={s.sheet} aria-label="Captura actual">
   {v.clasificacion&&a.onClasificacionChange&&<TipoEntradaControl value={v.clasificacion} onChange={a.onClasificacionChange} disabled={locked||recording||!!v.archivoPendiente}/>}
   <div className={s.capturebar}>
    <div className={s.micgroup}>
     {!recording?<button data-ui-id="ingreso.btn-iniciar" className={s.primary} disabled={locked||v.editando||v.custodiaReady===false||v.conAudio||!!v.dialogoSesion} onClick={a.onIniciar}><I.Mic size={19}/>{v.dialogoChrome?"Iniciar Chrome + micrófono":"Iniciar dictado"}</button>:
      <button data-ui-id="ingreso.btn-detener" className={s.primary} disabled={busy} onClick={a.onDetener}><I.Square size={15}/>{v.finalizando?"Terminando captura…":v.dialogoChrome?"Detener y transcribir":v.modoEntrada==="chrome_live_caption"?"Detener captura Chrome":"Detener dictado"}</button>}
     <div className={s.signal}>{!v.dialogoChrome&&<AudioActivity stream={v.stream||null} active={recording&&!v.editando}/>}<span role="status" aria-live="polite" data-ui-id="ingreso.status-listening">{v.finalizando?"Terminando y conservando audio…":v.custodiaReady===false?(v.custodiaPreparando?"Preparando salvaguarda…":"Captura no preparada"):v.editando?"Dictado en pausa":recording?(v.dialogoChrome?"Chrome + micrófono":v.modoEntrada==="chrome_live_caption"?"Captura de pestaña":v.stream?"Micrófono activo":"Preparando audio"):v.conAudio?"Audio conservado por partes":"Micrófono en espera"}</span></div>
    </div>
    <div className={s.toolgroup}>
     <button data-ui-id="ingreso.btn-chrome" className={s.secondary} disabled={busy||recording||v.editando} aria-expanded={chromeOpen} aria-controls="ingreso-chrome-options" onClick={()=>setChromeOpen(!chromeOpen)}><I.Monitor size={17}/>Escuchar a Chrome</button>
     <button data-ui-id="ingreso.btn-adjuntar" className={s.quiet} disabled={locked||recording||v.editando||v.custodiaReady===false||!!v.dialogoChrome} onClick={a.onAdjuntarClick}><I.Paperclip size={17}/>{v.adjuntandoAudio?"Adjuntando…":"Adjuntar audio"}</button>
     <button className={s.iconButton} aria-label="Más opciones de captura" aria-expanded={more} aria-controls="ingreso-options" onClick={()=>setMore(!more)}><I.Ellipsis size={21}/></button>
    </div>
   </div>
   {more&&<div className={s.options} id="ingreso-options">
    {(a.onGenerarTitulo||isReviewMode)&&<button data-ui-id="ingreso.btn-titulo-ia" className={s.secondary} disabled={locked||v.generandoTitulo||!v.texto.trim()} onClick={a.onGenerarTitulo}><I.Sparkles size={17}/>{v.generandoTitulo?"Generando…":"Título con IA"}</button>}
    {!!a.onRetranscribir&&<button data-ui-id="ingreso.btn-retranscribir" className={s.secondary} disabled={locked||recording||!v.conAudio} onClick={a.onRetranscribir}><I.RefreshCw size={17}/>{v.retranscribiendo?"Re-transcribiendo…":"Re-transcribir audio"}</button>}
    {v.audioExportable&&<button data-ui-id="ingreso.btn-exportar-audio" className={s.secondary} disabled={busy||v.exportandoAudio} onClick={a.onExportarAudio}><I.Download size={17}/>Exportar audio original</button>}
   </div>}
   {chromeOpen&&<div id="ingreso-chrome-options" className={s.options} role="group" aria-label="Escuchar a Chrome">
    <label><input data-ui-id="ingreso.btn-dialogo" type="checkbox" checked={!!v.dialogoChrome} disabled={!a.onDialogoChange||locked||recording||v.editando||!!v.dialogoSesion||(!v.dialogoChrome&&(!!v.texto.trim()||v.conAudio||!!v.titulo.trim()))} onChange={e=>a.onDialogoChange?.(e.target.checked)}/> Incluir micrófono</label>
    <label><input data-ui-id="ingreso.organizar-dialogo" type="checkbox" checked={!!v.dialogoChrome&&v.organizarComoDialogo!==false} disabled={!v.dialogoChrome||!a.onOrganizarDialogoChange||locked||recording||!!v.dialogoSesion} onChange={e=>a.onOrganizarDialogoChange?.(e.target.checked)}/> Organizar como diálogo</label>
    {!v.dialogoChrome&&<button className={s.secondary} disabled={locked||recording||v.editando||v.custodiaReady===false||v.conAudio||!!v.texto.trim()} onClick={a.onPrepararChrome}>Escuchar solo Chrome</button>}
    {v.dialogoChrome&&<p className={s.notice}>Comparte el audio de la pestaña y permite el micrófono. Al detener se transcribe aquí. Usa audífonos; no son subtítulos en vivo.</p>}
    {v.chromeExtra}
   </div>}
   {v.dialogoChrome&&recording&&<div className={s.options} role="group" aria-label="Audio de ambas fuentes">
    <div>Chrome<AudioActivity stream={v.chromeStream||null} active={recording} label="Chrome"/></div>
    <div>Micrófono<AudioActivity stream={v.stream||null} active={recording} label="Micrófono"/></div>
   </div>}
   {v.modoEntrada==="chrome_live_caption"&&!v.dialogoChrome&&<p data-ui-id="ingreso.banner-chrome" className={s.notice}>Captura Chrome · {v.chromeCapturaEstado}. Activa Aisthesis en la pestaña que reproduce el audio. La onda de esta pantalla representa solo el micrófono conectado, no el audio de otra pestaña.</p>}
   {!v.soportado&&<p className={s.notice}>Este navegador no ofrece reconocimiento en vivo. Puedes conservar audio, escribir o pegar texto.</p>}
  {(v.error||v.aviso||v.resultado||v.reconciliacionMensaje)&&<div className={s.messages}>
   {v.error&&<p role="alert" data-ui-id="ingreso.msg-error" className={s.error}><I.CircleAlert size={18}/>{v.error}</p>}
   {v.aviso&&<p data-ui-id="ingreso.aviso-degradado" className={s.notice}><I.Info size={18}/>{v.aviso}</p>}
   {v.resultado&&<p data-ui-id="ingreso.msg-resultado" className={s.notice}><I.Check size={18}/>{v.resultado}</p>}
   {v.reconciliacionMensaje&&<p data-ui-id="ingreso.msg-reconciliacion" className={s.notice}>{v.reconciliacionMensaje}</p>}
  </div>}
   <div className={s.editor}>
    <label className={s.srOnly} htmlFor="ingreso-title">Título de la captura</label>
    <input id="ingreso-title" aria-label="Título de la captura" data-ui-id="ingreso.titulo-input" className={s.title} value={v.titulo} readOnly={locked||!!v.archivoPendiente||(!!v.dialogoChrome&&recording)} onChange={e=>a.onTituloChange?.(e.target.value)} placeholder="Sin título" maxLength={500}/>
    <label className={s.srOnly} htmlFor="ingreso-text">Texto de la captura</label>
    <textarea id="ingreso-text" aria-label="Texto de la captura" data-ui-id="ingreso.textarea" className={s.textarea} value={v.texto} readOnly={locked||!!v.archivoPendiente||(!!v.dialogoChrome&&recording)} onFocus={()=>a.onIniciarEdicion?.()} onClick={() => actions.onIniciarEdicion?.()} onChange={e=>a.onTextoChange?.(e.target.value)} placeholder={v.dialogoChrome?(v.organizarComoDialogo===false?"La transcripción de ambas fuentes aparecerá aquí al detener. Los originales se conservan separados.":"El diálogo aparecerá aquí al detener Chrome y micrófono. Durante la captura, comprueba las dos señales de audio."):"Escribe, pega o empieza a dictar.\nEste espacio es tuyo."} spellCheck/>
   </div>
   {v.editando&&<div data-ui-id="ingreso.banner-edicion" className={s.editing}><span><I.PencilLine size={16}/>Edición in situ activa · tu texto se conserva.</span><button data-ui-id="ingreso.btn-confirmar-edicion" className={s.secondary} disabled={locked} onClick={a.onConfirmarEdicion}>Confirmar edición</button></div>}
   <footer className={s.sheetfooter}>
    <div className={s.storage}><span role="status" aria-live="polite" data-ui-id="ingreso.custodia-status" data-custodia-estado={v.custodiaLuz||"amarillo"} aria-label={descripcionLuz[v.custodiaLuz||"amarillo"]} title={descripcionLuz[v.custodiaLuz||"amarillo"]} style={{display:"inline-block",width:14,height:14,borderRadius:"50%",background:({azul:"#2563eb",verde:"#15803d",amarillo:"#ca8a04",rojo:"#dc2626"})[v.custodiaLuz||"amarillo"],border:"2px solid currentColor"}}/><details className={s.diagnostics}><summary>Detalle de conservación</summary><p>{descripcionLuz[v.custodiaLuz||"amarillo"]}. {v.custodiaEstado}</p><p>La confirmación cubre el contenido acreditado, no segmentos aún en memoria. El almacenamiento de este dispositivo puede desaparecer si se borra el perfil o falla el equipo.</p></details></div>
    {v.custodiaReady===false&&!v.custodiaPreparando&&a.onReintentarPreparacion&&<button className={s.secondary} onClick={a.onReintentarPreparacion}>Reintentar preparación</button>}
    {!!v.custodiaDetalle&&<details className={s.diagnostics}><summary>Detalle de sincronización de audio</summary><p>{v.custodiaDetalle}</p>{a.onReintentarCustodia&&<button className={s.secondary} disabled={busy} onClick={a.onReintentarCustodia}>Reintentar sincronización</button>}</details>}
    <span className={s.characters}>{v.texto.length.toLocaleString('es')} caracteres</span>
   </footer>
  </section>
  <div className={s.bottombar}>
   <div className={s.bottomleft}>
    {!v.dialogoChrome&&v.conAudio&&v.partesContador>0&&<button className={s.quiet} disabled={busy||v.exportandoAudio} onClick={a.onExportarMp3}><I.Download size={17}/>{v.exportandoAudio?"Preparando descarga…":"Descargar MP3 conservado"}</button>}
    <button data-ui-id="ingreso.btn-limpiar" className={s.quiet} disabled={busy||recording||v.editando} onClick={a.onLimpiar}><I.Plus size={18}/>{v.archivado?"Nueva captura":"Limpiar"}</button>
   </div>
   <button data-ui-id="ingreso.btn-archivar" className={s.archive} onClick={a.onGuardar} disabled={locked||recording||v.editando||(!v.texto.trim()&&!v.conAudio)}><I.Archive size={18}/>{v.guardando?"Archivando…":v.archivado?"Captura archivada":v.dialogoChrome?"Archivar como volcado":"Archivar registro"}</button>
  </div>
  {v.editorialExtra}
  {more&&<details className={s.diagnostics}><summary>Detalles de la captura</summary><p data-ui-id="ingreso.stats">Estado: {v.estado} · Audio: {v.partesContador} partes verificadas · {(v.bytesAcumulados/1048576).toFixed(2)} MB · Reconexiones: {v.reconexiones} · Bloques procesados: {v.pulidosOk} / pendientes: {v.pulidosNo}</p><p>Un corte conservado no demuestra que se haya registrado el último instante antes de una interrupción.</p></details>}
 </main>;
}
