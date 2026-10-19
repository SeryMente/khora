'use client';
import {useEffect,useRef,useState,type CSSProperties} from 'react';
import {BlogTextWorkflow,type Draft,type Preview,type Receipt} from '../../../lib/blog/text-workflow';
const KEY='khora.blog.text.reference.v1';
const box:CSSProperties={display:'grid',gap:16,padding:24,border:'1px solid var(--khora-border)',borderRadius:8,minWidth:0};
const control:CSSProperties={font:'inherit',width:'100%',boxSizing:'border-box',padding:12,border:'1px solid var(--khora-accent)',borderRadius:4,background:'var(--khora-bg)',color:'inherit',minHeight:44};
const button:CSSProperties={...control,width:'auto',cursor:'pointer'};
const label:CSSProperties={display:'grid',gap:8,minWidth:0};
export default function BlogTextWorkspace(){
 const workflow=useRef<BlogTextWorkflow|null>(null);
 const [ready,setReady]=useState(false),[restored,setRestored]=useState(false),[text,setText]=useState(''),[ofuscada,setOfuscada]=useState(false),[archived,setArchived]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState(''),[preview,setPreview]=useState<Preview|null>(null),[receipt,setReceipt]=useState<Receipt|null>(null),[exposure,setExposure]=useState(false);
 const [draft,setDraft]=useState<Draft>({title:'',body:'',date:'',format:'link',message:''}),[formatChosen,setFormatChosen]=useState(false);
 useEffect(()=>{try{
  workflow.current=new BlogTextWorkflow((url,init)=>fetch(url,init),{read:()=>{const r=sessionStorage.getItem(KEY);return r?JSON.parse(r):null;},write:r=>sessionStorage.setItem(KEY,JSON.stringify(r))});
  const r=workflow.current.reference;if(r){setRestored(true);setOfuscada(r.obfuscated);setArchived(!!r.sourceId);}setReady(true);
 }catch{setError('No se pudo recuperar la referencia privada. No se enviará ningún texto. Conserva esta pestaña y revisa el almacenamiento del navegador.');}},[]);
 useEffect(()=>{
  const protect=(e:BeforeUnloadEvent)=>{if(text&&!archived||archived&&!preview&&!!draft.body||busy){e.preventDefault();e.returnValue='';}};
  window.addEventListener('beforeunload',protect);return()=>window.removeEventListener('beforeunload',protect);
 },[text,archived,busy,preview,draft.body]);
 const run=async(fn:()=>Promise<void>)=>{setBusy(true);setError('');try{await fn();setReceipt(workflow.current!.statusReceipt);}catch(e){setReceipt(workflow.current?.statusReceipt??null);setError(e instanceof Error?e.message:'OPERACION_NO_VERIFICADA');}finally{setBusy(false);}};
 const change=(field:keyof Draft,value:string)=>{setDraft(d=>({...d,[field]:value}));setPreview(null);setExposure(false);};
 const frozen=busy||workflow.current?.locked===true;
 const resume=()=>run(async()=>{const p=await workflow.current!.resume();setPreview(p);setDraft({title:p.revision.entry.title,body:p.revision.entry.body,date:p.revision.entry.date,...p.revision.facebook});setFormatChosen(true);});
 const refresh=()=>run(async()=>{await workflow.current!.status();});
 useEffect(()=>{
  if(receipt?.consent!=='approved'||receipt.filter==='published_both')return;
  const timer=setInterval(()=>{if(!busy)void refresh();},15000);return()=>clearInterval(timer);
 },[receipt?.consent,receipt?.filter,busy]); // Reads receipts only; never dispatches a provider POST.
 const exportPrivate=()=>{
  const data=JSON.stringify({warning:'PRIVADO: contiene el original y borrador. No publicar este archivo.',reference:workflow.current?.reference,original:text,draft,preview,receipt},null,2);
  const url=URL.createObjectURL(new Blob([data],{type:'application/json'}));const a=document.createElement('a');a.href=url;a.download='khora-blog-respaldo-privado.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
 };
 return <main style={{maxWidth:760,margin:'0 auto',padding:'32px 20px 120px',fontSize:16,lineHeight:1.5,display:'grid',gap:32,overflowWrap:'anywhere'}}>
  <header><p>Khora · Blog personal</p><h1 style={{fontSize:32,lineHeight:1.2}}>Una entrada, desde tu experiencia</h1><p>Texto primero. El original se conserva privado; solo la versión exacta que apruebes puede salir al blog y a la Página de Facebook. No se solicita micrófono.</p></header>
  {!ready&&<p role="status">Preparando referencia privada…</p>}
  {error&&<section role="alert" style={box}><strong>Operación no confirmada</strong><p>{error}</p><p>No inicies otra captura para resolver una respuesta perdida. Reintenta con la misma referencia o recupera la revisión; no se reenviarán publicaciones desde esta pantalla.</p></section>}
  {restored&&<section style={box}><h2>Retomar esta entrada</h2><p>Se recuperaron referencias, no texto ni credenciales. Si ya preparaste la entrada, recupera su revisión privada desde el servidor. Si no se confirmó el archivado, vuelve a pegar exactamente el mismo original.</p><button style={button} disabled={!archived||busy} onClick={resume}>Recuperar revisión preparada</button><button style={button} disabled={busy||!ready} onClick={refresh}>Consultar comprobantes</button></section>}
  <section style={box} aria-labelledby="original-heading"><h2 id="original-heading">1. Original privado</h2>
   <p>Molde opcional: qué ocurrió; cuándo y con qué certeza; personas o contexto; cómo lo viviste y qué significa; qué cambió o quedó abierto. Puedes escribir libremente y omitir lo que no sepas. No se infieren fechas ni hechos.</p>
   <label style={label}><span id="blog-original-label">Texto original</span><textarea aria-labelledby="blog-original-label" rows={9} style={{...control,resize:'vertical'}} maxLength={200000} value={text} disabled={archived||busy} onChange={e=>setText(e.target.value)}/></label>
   <label style={{display:'flex',alignItems:'center',gap:12,minHeight:44}}><input type="checkbox" checked={ofuscada} disabled={archived||restored||busy} onChange={e=>setOfuscada(e.target.checked)}/>Entrada ofuscada (no se descifra ni publica automáticamente)</label>
   <button style={button} disabled={!ready||busy||archived||!text.trim()} onClick={()=>run(async()=>{await workflow.current!.archive(text,ofuscada);setArchived(true);setDraft(d=>({...d,...workflow.current!.literalDraft(new Date().toISOString())}));})}>Conservar original y preparar borrador</button>
   {archived&&<p role="status">Original archivado con recibo verificado. Esto no concede permiso de publicación.</p>}
   <button style={button} disabled={!text&&!archived} onClick={exportPrivate}>Descargar respaldo privado</button>
  </section>
  {archived&&<section style={box} aria-labelledby="draft-heading"><h2 id="draft-heading">2. Versión que puede hacerse pública</h2>
   <p>La preparación literal conserva el orden y los caracteres del texto, salvo espacios entre párrafos. Revisa y edita la selección pública: no altera el original. El título es una propuesta, no un hecho añadido.</p>
   <label style={label}><span id="blog-title-label">Título público</span><input aria-labelledby="blog-title-label" style={control} maxLength={160} value={draft.title} disabled={frozen} onChange={e=>change('title',e.target.value)}/></label>
   <label style={label}><span id="blog-body-label">Texto público del blog</span><textarea aria-labelledby="blog-body-label" rows={10} style={{...control,resize:'vertical'}} maxLength={200000} value={draft.body} disabled={frozen} onChange={e=>change('body',e.target.value)}/></label>
   <label style={label}><span id="blog-date-label">Fecha de publicación (con zona horaria; no fecha del acontecimiento)</span><input aria-labelledby="blog-date-label" style={control} value={draft.date} disabled={frozen} onChange={e=>change('date',e.target.value)}/></label>
   <label style={label}><span id="blog-format-label">Formato en Facebook</span><select aria-labelledby="blog-format-label" style={control} value={formatChosen?draft.format:''} disabled={frozen} onChange={e=>{setFormatChosen(true);change('format',e.target.value);}}><option value="" disabled>Elige cómo presentar el texto</option><option value="link">Mensaje y enlace a la entrada</option><option value="full_text">Texto completo en Facebook</option></select></label>
   <label style={label}><span id="blog-facebook-label">Texto exacto de Facebook</span><textarea aria-labelledby="blog-facebook-label" rows={5} style={{...control,resize:'vertical'}} maxLength={60000} value={draft.message} disabled={frozen} onChange={e=>change('message',e.target.value)}/></label>
   <p>Si eliges texto completo, pega aquí el texto completo que deseas publicar. No se sustituye automáticamente por otro borrador.</p>
   <button style={button} disabled={frozen||!formatChosen||!draft.title.trim()||!draft.body.trim()||!draft.message.trim()} onClick={()=>run(async()=>{setPreview(await workflow.current!.prepare(draft));setExposure(false);})}>Preparar y verificar previa exacta</button>
   <button style={button} disabled={busy||!!preview||workflow.current?.locked===true} onClick={()=>run(async()=>{await workflow.current!.decide(false);})}>No publicar: conservar sin permiso</button>
  </section>}
  {preview&&<section style={box} aria-labelledby="preview-heading"><h2 id="preview-heading">3. Revisa antes de autorizar</h2>
   <article aria-label="Previa exacta del blog"><p>Blog · {preview.revision.entry.date}</p><h3>{preview.revision.entry.title}</h3><p style={{whiteSpace:'pre-wrap'}}>{preview.revision.entry.body}</p></article>
   <article aria-label="Previa exacta de Facebook"><h3>Facebook · {preview.revision.facebook.format==='link'?'mensaje y enlace':'texto completo'}</h3><p style={{whiteSpace:'pre-wrap'}}>{preview.revision.facebook.message}</p>{preview.revision.facebook.format==='link'&&<p>Enlace automático a la entrada anterior, únicamente después de comprobar su publicación en el blog.</p>}</article>
   <p>Revisión {preview.revision.revision} · Huella exacta: <code>{preview.digest}</code></p>
   {ofuscada&&<label style={{display:'flex',gap:12,alignItems:'center',minHeight:44}}><input type="checkbox" checked={exposure} disabled={frozen} onChange={e=>setExposure(e.target.checked)}/>Autorizo expresamente la exposición pública de esta versión ofuscada. No implica anonimato garantizado.</label>}
   <strong>¿Quieres que esta entrada se publique en el blog y en la Página de Facebook?</strong>
   <button style={button} disabled={frozen||ofuscada&&!exposure} onClick={()=>run(async()=>{await workflow.current!.decide(true,exposure);})}>Sí, publicar esta versión exacta en ambos</button>
   <button style={button} disabled={busy||workflow.current?.locked===true} onClick={()=>run(async()=>{await workflow.current!.decide(false);})}>No, conservar sin permiso</button>
  </section>}
  {receipt&&<section style={box} aria-labelledby="receipt-heading"><h2 id="receipt-heading">4. Comprobantes por destino</h2>
   <p role="status">{workflow.current?.publishedBoth()?'Publicación comprobada en ambos destinos.':receipt.consent==='declined'?'Conservada sin permiso de publicación.':receipt.filter==='approval_blocked'?'Aprobación bloqueada: no hay permiso registrado por esta solicitud.':receipt.filter==='approval_receipt_unconfirmed'?'Solicitud de aprobación sin comprobante. Consulta el estado antes de continuar.':receipt.consent==='approved'?'Aprobación registrada. La publicación en ambos destinos aún no está comprobada.':'Pendiente de decisión.'}</p>
   {['blog','facebook'].map(target=>{const d=receipt.deliveries.find(x=>x.target===target&&x.revision===receipt.revision);return <div key={target}><strong>{target==='blog'?'Blog GitHub':'Página de Facebook'}</strong><p>{d?d.state:'Sin comprobante'}{d?.last_code?' · '+d.last_code:''}</p>{d?.state==='confirmed'&&d.url&&/^https:\/\//.test(d.url)&&<a style={{display:'inline-block',minHeight:44,padding:'8px 0'}} href={d.url} target="_blank" rel="noopener noreferrer">Abrir comprobante</a>}</div>;})}
   <p>La cola del servidor ejecuta las entregas solo si sus proveedores y automatización están habilitados. Un recibo pendiente o incierto no autoriza un segundo envío manual. Esta pantalla consulta estados; no activa credenciales ni el planificador.</p>
   <button style={button} disabled={busy} onClick={refresh}>Actualizar comprobantes</button>
  </section>}
 </main>;
}
