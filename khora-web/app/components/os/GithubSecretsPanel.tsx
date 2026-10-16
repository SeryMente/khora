"use client";
import { useEffect, useState } from 'react';
type Purpose = 'norm' | 'ep';
type Status = { purpose: Purpose; configured: boolean; updatedAt: string | null };
export default function GithubSecretsPanel({ unlocked }: { unlocked: boolean }) {
  const [purpose,setPurpose]=useState<Purpose>('norm');
  const [token,setToken]=useState('');
  const [items,setItems]=useState<Status[]>([]);
  const [message,setMessage]=useState('');
  const [busy,setBusy]=useState(false);
  const [loaded,setLoaded]=useState(false);
  const border={borderColor:'var(--khora-border)'};
  useEffect(()=>{ setToken(''); setItems([]); setLoaded(false); if(!unlocked) return;
    const controller=new AbortController();
    fetch('/api/security/github-credentials',{cache:'no-store',signal:controller.signal}).then(async response=>{ const data=await response.json(); if(!response.ok) throw Error(data.message || 'No pudimos consultar los tokens.'); setItems(data.credentials); setLoaded(true); }).catch(error=>{if(error.name!=='AbortError')setMessage(error.message);});
    return ()=>controller.abort();
  },[unlocked]);
  useEffect(()=>{const clear=()=>setToken('');window.addEventListener('pagehide',clear);return ()=>window.removeEventListener('pagehide',clear);},[]);
  async function change(remove=false) {
    if(remove && !window.confirm('¿Retirar de Khora el token de este uso? Las siguientes consultas dejarán de usarlo.'))return;
    setBusy(true);setMessage('');
    const value=token;setToken('');
    try {const response=await fetch('/api/security/github-credentials',{method:remove?'DELETE':'POST',headers:{'Content-Type':'application/json'},cache:'no-store',body:JSON.stringify(remove?{purpose}:{purpose,token:value})});const data=await response.json();setMessage(data.message || 'No pudimos completar la operación.');if(response.ok){setItems(data.credentials);setLoaded(true);}}
    catch {setMessage('No pudimos confirmar el cambio. Consulta el estado antes de repetir.');setLoaded(false);}
    finally {setBusy(false);}
  }
  const configured=items.find(item=>item.purpose===purpose)?.configured;
  return <section data-ui-id="seguridad.boveda.github" className="space-y-3 border-t pt-5" style={border}>
    <h2 className="text-sm font-bold">Secretos de GitHub</h2>
    <p className="text-xs opacity-70">Credenciales separadas: el entorno persistente trabaja con código; las instrucciones MCP solo necesitan lectura. No son tus tokens de dictados.</p>
    {!unlocked ? <p role="status" className="text-xs">Abre la bóveda con tu PIN para gestionar estos secretos.</p> : <>
      <label className="block text-xs" htmlFor="github-secret-purpose">Uso del token</label>
      <select id="github-secret-purpose" value={purpose} disabled={busy} onChange={event=>{setPurpose(event.target.value as Purpose);setToken('');setMessage('');}} className="w-full border p-3 text-sm" style={{...border,background:'var(--khora-bg)',color:'var(--khora-ink)'}}>
        <option value="norm">Instrucciones MCP · solo lectura</option><option value="ep">Entorno persistente · repositorios de trabajo</option>
      </select>
      <p className="text-xs">{!loaded?'Estado sin comprobar':configured?'Hay una credencial guardada para este uso.':'Falta guardar una credencial para este uso.'}</p>
      <p id="github-secret-help" className="text-xs opacity-70">{purpose==='norm'?'Token de permisos específicos limitado a SeryMente/metodologia, con Contents: read.':'Token de permisos específicos para tus repositorios de trabajo, incluido SeryMente/khora. Concede escritura solo donde la necesites.'} Se comprueba lectura antes de guardarlo; eso no demuestra todos sus permisos.</p>
      <label htmlFor="github-secret-token" className="block text-xs">Token de GitHub</label>
      <input id="github-secret-token" type="password" autoComplete="off" spellCheck={false} value={token} maxLength={251} disabled={busy} onChange={event=>setToken(event.target.value)} aria-describedby="github-secret-help" className="w-full border p-3 text-sm" style={{...border,background:'var(--khora-bg)',color:'var(--khora-ink)'}} />
      <p className="text-xs opacity-70">Se cifra en el servidor y no vuelve a mostrarse. No se guarda en el navegador. Reemplazarlo afecta solo al uso seleccionado.</p>
      <div className="flex gap-2"><button type="button" disabled={busy||!token} onClick={()=>change()} className="border p-3 text-xs disabled:opacity-50" style={border}>{busy?'Procesando…':'Comprobar y guardar'}</button><button type="button" disabled={busy||!configured} onClick={()=>change(true)} className="border p-3 text-xs disabled:opacity-50" style={border}>Retirar de Khora</button></div>
      <p className="text-xs opacity-70">Guardar aquí no modifica los permisos concedidos en GitHub. Retirar aquí no revoca el token en GitHub.</p>
    </>}
    {message&&<p role="status" aria-live="polite" className="text-xs">{message}</p>}
  </section>;
}
