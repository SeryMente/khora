"use client";
import {useEffect,useRef,useState} from "react";
import {X,History,FileAudio,ArrowUpRight} from "lucide-react";
import s from "./ingreso-studio.module.css";
export type RecoveryItem={sessionId:string;revisionId:string|null;savedAt:string|number;title:string;preview:string;chars:number;duration:number;audioParts:number;paired:boolean;throughPart?:number|null;local?:boolean;localVersions?:RecoveryItem[];sourceVersions?:RecoveryItem[]};
export function RecoveryDrawer({items,nextCursor,loading,error,busy,onClose,onMore,onRecover}:{items:RecoveryItem[];nextCursor:string|null;loading:boolean;error:string;busy:boolean;onClose:()=>void;onMore:()=>void;onRecover:(item:RecoveryItem)=>Promise<void>}){
 const panel=useRef<HTMLDivElement>(null),[versions,setVersions]=useState<Record<string,RecoveryItem[]>>({}),[selected,setSelected]=useState<Record<string,string>>({}),[message,setMessage]=useState('');
 const [revisionCursor,setRevisionCursor]=useState<Record<string,string|null>>({}),[versionBusy,setVersionBusy]=useState<string|null>(null);
 useEffect(()=>{const previous=document.activeElement as HTMLElement|null;const old=document.body.style.overflow;document.body.style.overflow='hidden';panel.current?.querySelector<HTMLButtonElement>('button')?.focus();return()=>{document.body.style.overflow=old;previous?.focus();};},[]);
 useEffect(()=>{const key=(e:KeyboardEvent)=>{if(e.key==='Escape'&&!busy){e.preventDefault();onClose();}if(e.key==='Tab'){const nodes=Array.from(panel.current?.querySelectorAll<HTMLElement>('button:not(:disabled),select:not(:disabled),a[href]')||[]);const first=nodes[0],last=nodes.at(-1);if(e.shiftKey&&document.activeElement===first){e.preventDefault();last?.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first?.focus();}}};document.addEventListener('keydown',key);return()=>document.removeEventListener('keydown',key);},[busy,onClose]);
 const stamp=(value:string|number)=>{const date=new Date(value);return Number.isFinite(date.getTime())?new Intl.DateTimeFormat('es-MX',{dateStyle:'medium',timeStyle:'short'}).format(date):'Fecha no disponible';};
 const itemKey=(item:RecoveryItem)=>item.sessionId;
 const versionKey=(item:RecoveryItem)=>item.sessionId+':'+(item.local?'local':'remote')+':'+(item.revisionId||'at:'+new Date(item.savedAt).getTime()+':'+item.title);
 const uniqueVersions=(entries:RecoveryItem[])=>{
  const map=new Map<string,RecoveryItem>();
  for(const entry of entries){const id=versionKey(entry);const old=map.get(id);if(!old||new Date(entry.savedAt).getTime()>new Date(old.savedAt).getTime())map.set(id,entry);}
  return [...map.values()].sort((a,b)=>new Date(b.savedAt).getTime()-new Date(a.savedAt).getTime());
 };
 async function loadVersions(item:RecoveryItem,more=false){
  const key=itemKey(item),existing=versions[key]||[];
  const seeded=uniqueVersions(more?existing:(item.sourceVersions?.length?item.sourceVersions:[item]));
  if(!more){setVersions(p=>({...p,[key]:seeded}));setRevisionCursor(p=>({...p,[key]:null}));}
  setVersionBusy(key);setMessage('');
  try{
   const response=await fetch('/api/dictado/checkpoint?revisions=1&sessionId='+encodeURIComponent(item.sessionId)+(more&&revisionCursor[key]?'&cursor='+encodeURIComponent(revisionCursor[key]!):''),{cache:'no-store',signal:AbortSignal.timeout(15000)});
   if(!response.ok)throw Error();
   const data=await response.json();
   const remote:RecoveryItem[]=(Array.isArray(data.items)?data.items:[]).map((entry:RecoveryItem)=>({...entry,local:false}));
   setVersions(prev=>({...prev,[key]:uniqueVersions([...(more?(prev[key]||existing):seeded),...remote])}));
   setRevisionCursor(prev=>({...prev,[key]:data.nextCursor||null}));
  }catch{setMessage('No se pudieron consultar todos los puntos guardados. Los puntos locales ya detectados siguen disponibles y el original no se modificó.');}
  finally{setVersionBusy(null);}
 }
 return <div className={s.veil} onMouseDown={e=>{if(e.target===e.currentTarget&&!busy)onClose();}}><div ref={panel} role="dialog" aria-modal="true" aria-labelledby="recovery-title" aria-describedby="recovery-description" className={s.drawer}>
  <div className={s.drawerhead}><div><h2 id="recovery-title">Recuperar capturas</h2><p id="recovery-description">Elige qué quieres retomar. El original permanece intacto.</p></div><button className={s.iconButton} aria-label="Cerrar recuperaciones" disabled={busy} onClick={onClose}><X size={20}/></button></div>
  <div className={s.drawerbody} aria-busy={loading||busy}>
   {(error||message)&&<p role="alert" className={s.error}>{error||message}</p>}
   {loading&&!items.length?<p role="status">Buscando capturas conservadas…</p>:!items.length?<div className={s.empty}><History size={28}/><h3>Un comienzo limpio</h3><p>No hay capturas abiertas para recuperar. Los registros archivados siguen en Custodia.</p><a href="/sistema/custodia">Abrir Custodia <ArrowUpRight size={14} style={{display:'inline'}}/></a></div>:items.map(item=>{
    const key=itemKey(item),list=versions[key],choice=list?.find(x=>versionKey(x)===selected[key])||item;
    const hasLocal=(item.sourceVersions||[item]).some(x=>!!x.local),hasRemote=(item.sourceVersions||[item]).some(x=>!x.local);
    const originLabel=hasLocal&&hasRemote?'Hay copia local y de servidor':hasLocal?'En este dispositivo':'En el servidor';
    return <article key={item.sessionId} className={s.captureCard}><div className={s.cardmeta}>{stamp(choice.savedAt)} · {choice.local?'En este dispositivo':'En el servidor'} · {originLabel}</div><h3>{choice.title||'Captura sin título'}</h3><p className={s.preview}>{choice.preview||'Captura de audio sin texto confirmado'}</p><p className={s.cardmeta}>{choice.chars.toLocaleString('es')} caracteres · {Math.max(0,Math.floor(choice.duration/60))}:{String(Math.max(0,Math.floor(choice.duration%60))).padStart(2,'0')}</p>
     <p className={s.recovered}><FileAudio size={16}/>{choice.audioParts>0?choice.audioParts+' partes de audio conservadas':'Sin audio en este punto guardado'}</p><span className={s.cardbadge}>{choice.paired?'Texto y corte de audio vinculados':'Sin sincronía histórica acreditada'}</span>
     {choice.paired&&<p className={s.cardmeta}>Incluye el audio del corte elegido. Puede faltar el último segmento no confirmado.</p>}
     <div className={s.cardactions}><button className={s.primary} disabled={busy||!choice.revisionId} onClick={()=>void onRecover(choice)}>{busy?'Recuperando…':'Recuperar esta captura'}</button>{<button className={s.secondary} disabled={busy||!!versionBusy} onClick={()=>void loadVersions(item)}>{versionBusy===key?'Consultando…':'Ver puntos guardados'}</button>}</div>
     {list&&<div className={s.versions}><label htmlFor={'versions-'+key}>Punto de recuperación</label><select id={'versions-'+key} value={selected[key]||''} disabled={busy} onChange={e=>setSelected(p=>({...p,[key]:e.target.value}))}><option value="">Último punto de esta captura</option>{list.map(x=><option key={versionKey(x)} value={versionKey(x)}>{stamp(x.savedAt)} · {x.local?'copia local':'servidor'} · {x.paired?'texto + audio':'texto guardado'} · {x.chars} caracteres</option>)}</select>{!!revisionCursor[key]&&<button className={s.quiet} disabled={!!versionBusy||busy} onClick={()=>void loadVersions(item,true)}>Más puntos anteriores</button>}</div>}
    </article>;
   })}
   {nextCursor&&<button className={s.secondary} disabled={loading||busy} onClick={onMore}>Más capturas anteriores</button>}
  </div><div className={s.drawerfoot}>El original se conserva. El MP3 se prepara por separado; recuperar no garantiza el último instante de una interrupción.</div>
 </div></div>;
}
