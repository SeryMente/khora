"use client";
import { useEffect,useState } from "react";
import { Check,Clipboard,KeyRound,RefreshCw,ShieldAlert,TerminalSquare } from "lucide-react";
type Issued={token:string;sessionId:string;expiresAt:string;command:string;apiBase:string};
type Summary={id:string;estado:string;creado_en:string;ultimo_evento_en:string|null;cerrado_en:string|null};
export default function EntornoPersistentePage(){
 const [issued,setIssued]=useState<Issued|null>(null);const [sessions,setSessions]=useState<Summary[]>([]);const [busy,setBusy]=useState(false);const [message,setMessage]=useState("");
 async function refresh(){const r=await fetch('/api/ep/token',{cache:'no-store'});if(r.ok)setSessions((await r.json()).sessions||[])}
 useEffect(()=>{refresh()},[]);
 async function issue(){setBusy(true);setMessage('Generando token de una sola sesión…');try{const r=await fetch('/api/ep/token',{method:'POST'});const d=await r.json();if(!r.ok)throw new Error(d.error||String(r.status));setIssued(d);setMessage('Token listo. Sigue los tres pasos en orden.');await refresh()}catch(e){setMessage('Error: '+String(e))}finally{setBusy(false)}}
 async function copy(value:string,label:string){await navigator.clipboard.writeText(value);setMessage('Copiado: '+label)}
 return <main className="w-full flex justify-center p-4 py-12 font-mono" style={{background:'var(--khora-bg)',color:'var(--khora-ink)'}}><section className="w-full max-w-3xl p-6 space-y-6 border" style={{background:'var(--khora-surface)',borderColor:'var(--khora-border)'}}>
  <header className="text-center space-y-2"><KeyRound className="mx-auto" size={34} style={{color:'var(--khora-accent)'}}/><h1 className="text-2xl font-bold uppercase tracking-wider">Entorno Persistente</h1><p className="text-xs opacity-70">Google OpenID Connect → token efímero → instanciador privado → registro persistente.</p></header>
  <button disabled={busy} onClick={issue} className="w-full p-3 font-bold uppercase tracking-widest bg-blue-700 text-white disabled:opacity-50">{busy?'Generando…':'Generar token para nueva sesión'}</button>
  {issued&&<div className="space-y-4 border p-4" style={{borderColor:'var(--khora-border)'}}>
   <p className="text-sm"><Check className="inline mr-2 text-emerald-400" size={18}/>Sesión <code>{issued.sessionId}</code> · expira {new Date(issued.expiresAt).toLocaleString('es-MX')}</p>
   <ol className="list-decimal ml-6 text-sm space-y-3"><li><button onClick={()=>copy(issued.command,'comando')} className="underline"><TerminalSquare className="inline mr-2" size={16}/>Copia el comando</button> y pégalo en PowerShell sin ejecutarlo todavía.</li><li><button onClick={()=>copy(issued.token,'token Khora')} className="underline"><Clipboard className="inline mr-2" size={16}/>Copia el token Khora</button>; sustituirá al comando en el portapapeles.</li><li>Regresa a PowerShell y presiona Enter. El comando recoge y borra el token del portapapeles.</li></ol>
   <details><summary className="cursor-pointer text-xs opacity-80">Acceso programático al registro</summary><pre className="mt-2 whitespace-pre-wrap break-all text-xs p-3" style={{background:'var(--khora-bg)'}}>{`GET ${issued.apiBase}/logs?which=current\nGET ${issued.apiBase}/logs?which=last\nAuthorization: Bearer <token-de-esta-sesión>`}</pre></details>
  </div>}
  {message&&<p className="text-xs border p-3" style={{borderColor:'var(--khora-border)'}}>{message.includes('Error')?<ShieldAlert className="inline mr-2 text-red-400" size={16}/>:<Check className="inline mr-2 text-emerald-400" size={16}/>} {message}</p>}
  <div><div className="flex justify-between"><h2 className="font-bold uppercase text-sm">Sesiones recientes</h2><button onClick={refresh}><RefreshCw size={16}/></button></div><ul className="mt-2 text-xs space-y-1">{sessions.map(s=><li key={s.id}>[{s.estado}] {s.id} · {new Date(s.creado_en).toLocaleString('es-MX')}</li>)}</ul></div>
 </section></main>
}
