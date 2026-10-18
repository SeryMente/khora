'use client';
import { FormEvent, useEffect, useState } from 'react';
type Opening={id:string;challenge:string;state:string;port:string};
const api='/api/seguridad/boveda-portable';
async function call(body:Record<string,unknown>){
 const r=await fetch(api,{method:'POST',credentials:'same-origin',cache:'no-store',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
 if(r.status===401){window.location.assign('/api/auth/signin?callbackUrl='+encodeURIComponent(window.location.pathname+window.location.search));throw Error('Inicia sesión en Khora para continuar.');}
 if(!r.ok)throw Error(r.status===503?'La bóveda aún no está activada.':'No se autorizó la operación. Comprueba el código y espera uno nuevo si acabas de usarlo.');
 return r.json();
}
export default function PortableControls({opening}:{opening?:Opening}){
 const [ready,setReady]=useState(false),[busy,setBusy]=useState(false),[notice,setNotice]=useState('Comprobando disponibilidad…'),[code,setCode]=useState('');
 const [enrollment,setEnrollment]=useState<{id:string;uri:string}|null>(null),[id,setId]=useState(''),[confirmed,setConfirmed]=useState(false),[reveal,setReveal]=useState(false);
 useEffect(()=>{let live=true;call({action:'capabilities'}).then(()=>{if(live){setReady(true);setNotice('Solo equipo confiable. Cada apertura requiere sesión de Khora y código de Ente Auth.');}}).catch(e=>{if(live)setNotice(e.message);});return()=>{live=false;};},[]);
 async function enroll(){setBusy(true);try{const d=await call({action:'enroll'});setEnrollment(d);setId(d.id);setNotice('Configura Khora en Ente Auth y confirma con su código. No guardes esta clave en capturas ni archivos.');}catch(e){setNotice((e as Error).message);}finally{setBusy(false);}}
 async function submit(event:FormEvent){event.preventDefault();if(!ready||busy)return;setBusy(true);try{
  if(opening){const d=await call({action:'authorize_opening',id:opening.id,challenge:opening.challenge,code});if(typeof d.grant!=='string'||!/^[A-Za-z0-9_-]{43}$/.test(d.grant))throw Error('Respuesta no válida.');
   const callback=new URL(`http://127.0.0.1:${opening.port}/callback`);callback.searchParams.set('id',opening.id);callback.searchParams.set('state',opening.state);callback.searchParams.set('grant',d.grant);setCode('');window.location.replace(callback.toString());
  }else{await call({action:'confirm',id,code});setEnrollment(null);setConfirmed(true);setNotice('Ente Auth confirmado. Guarda el identificador de bóveda, que no es una llave. La descarga entrega un cliente de revisión, no un instalador firmado.');}
 }catch(e){setNotice((e as Error).message);}finally{setCode('');setBusy(false);}}
 const field='block w-full rounded border p-3 bg-transparent';
 return <section className="space-y-5 max-w-xl" aria-labelledby="portable-operation-title">
  <h1 id="portable-operation-title" className="text-xl font-bold">{opening?'Autorizar esta apertura':'Preparar bóveda portable'}</h1>
  <p role="status" aria-live="polite">{notice}</p>
  <p className="text-sm">No uses archivos reales en equipos públicos o de renta. Este candidato no recupera un autenticador perdido y aún requiere revisión final.</p>
  {opening?<p>Solicitado por tu cliente local. Una autorización breve, una apertura; no se guarda una sesión permanente en el cliente.</p>:<>
   <button type="button" className={field} disabled={!ready||busy||!!enrollment||confirmed} onClick={enroll}>Registrar Ente Auth</button>
   {enrollment&&<div className="space-y-3"><p>En Ente Auth, agrega una cuenta con esta clave: SHA‑1, 6 dígitos, 30 segundos.</p><input aria-label="Clave privada de configuración" className={field} type={reveal?'text':'password'} readOnly autoComplete="off" value={new URL(enrollment.uri).searchParams.get('secret')||''}/><button type="button" onClick={()=>setReveal(!reveal)}>{reveal?'Ocultar clave':'Mostrar clave para configurar Ente Auth'}</button></div>}
  </>}
  {(opening||enrollment)&&<form onSubmit={submit} className="space-y-3"><label>Código de Ente Auth<input name="code" aria-label="Código de Ente Auth" className={field} type="password" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" minLength={6} maxLength={6} value={code} onChange={e=>setCode(e.target.value)} required/></label><button className={field} type="submit" disabled={!ready||busy||code.length!==6}>{busy?'Comprobando…':opening?'Autorizar esta apertura':'Confirmar Ente Auth'}</button></form>}
  {!opening&&<><label>Identificador de bóveda (no es secreto)<input className={field} value={id} onChange={e=>setId(e.target.value)} autoComplete="off" /></label><p className="text-sm">Usa este identificador en el cliente; no uses la clave de Ente Auth como identificador.</p>{ready&&<a className={field} href="/api/seguridad/boveda-portable/cliente">Descargar cliente de revisión · Node.js 22 o superior</a>}</>}
 </section>;
}
