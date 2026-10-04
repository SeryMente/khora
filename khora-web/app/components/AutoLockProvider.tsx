"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { LockKeyhole } from "lucide-react";

const IDLE_MS = 5 * 60 * 1000;
type CheckpointHandler = () => void | Promise<void>;

declare global {
  interface Window {
    __KHORA_LOCK_HANDLERS?: Set<CheckpointHandler>;
    __KHORA_REPORT_ACTIVITY?: () => void;
  }
}

export function registerKhoraLockCheckpoint(handler: CheckpointHandler) {
  if (typeof window === "undefined") return () => undefined;
  window.__KHORA_LOCK_HANDLERS ??= new Set();
  window.__KHORA_LOCK_HANDLERS.add(handler);
  return () => window.__KHORA_LOCK_HANDLERS?.delete(handler);
}

export function reportKhoraActivity() {
  try { window.__KHORA_REPORT_ACTIVITY?.(); } catch {}
}

export default function AutoLockProvider({ children }: { children: React.ReactNode }) {
  const [locked,setLocked]=useState(false),[pin,setPin]=useState(""),[error,setError]=useState(""),[busy,setBusy]=useState(false);
  const timerRef=useRef<number|null>(null), lastActivityRef=useRef(Date.now());

  const arm=useCallback(()=>{
    if(timerRef.current!==null) window.clearTimeout(timerRef.current);
    const remaining=Math.max(1000,IDLE_MS-(Date.now()-lastActivityRef.current));
    timerRef.current=window.setTimeout(()=>{
      if(Date.now()-lastActivityRef.current>=IDLE_MS){
        setBusy(true);
        const handlers=Array.from(window.__KHORA_LOCK_HANDLERS??[]);
        Promise.allSettled(handlers.map(h=>Promise.race([
          Promise.resolve().then(h),
          new Promise<void>(r=>window.setTimeout(r,8000)),
        ]))).finally(()=>{setBusy(false);setPin("");setError("");setLocked(true);});
      } else arm();
    },remaining);
  },[]);

  const activity=useCallback(()=>{
    if(locked)return;
    lastActivityRef.current=Date.now();
    arm();
  },[arm,locked]);

  useEffect(()=>{
    window.__KHORA_REPORT_ACTIVITY=activity;
    const events=["pointerdown","keydown","touchstart","wheel","focus"];
    events.forEach(e=>window.addEventListener(e,activity,{passive:true}));
    arm();
    return()=>{
      events.forEach(e=>window.removeEventListener(e,activity));
      if(timerRef.current!==null)window.clearTimeout(timerRef.current);
      delete window.__KHORA_REPORT_ACTIVITY;
    };
  },[activity,arm]);

  async function unlock(){
    setError("");
    if(!/^\d{4,12}$/.test(pin)){setError("PIN must be 4 to 12 digits.");return}
    setBusy(true);
    try{
      const response=await fetch("/api/security/lock",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({pin})});
      const data=await response.json().catch(()=>({}));
      if(!response.ok||data?.ok!==true){setError(data?.error==="pin_incorrecto"?"Incorrect PIN.":"Could not unlock Cora.");return}
      setLocked(false);setPin("");lastActivityRef.current=Date.now();arm();
    }catch(e){setError("Could not verify PIN: "+String(e))}
    finally{setBusy(false)}
  }

  return <>
    <div aria-hidden={locked} style={{filter:locked?"blur(10px)":undefined,pointerEvents:locked?"none":undefined}}>{children}</div>
    {locked&&<div data-testid="khora-autolock" role="dialog" aria-modal="true" className="fixed inset-0 z-[100] flex items-center justify-center p-6" style={{background:"rgba(0,0,0,.88)",color:"var(--khora-ink)"}}>
      <div className="w-full max-w-sm rounded-xl border p-7 shadow-2xl" style={{background:"var(--khora-surface)",borderColor:"var(--khora-border)"}}>
        <div className="flex flex-col items-center text-center">
          <LockKeyhole size={38} style={{color:"var(--khora-accent)"}}/>
          <h1 className="mt-4 text-xl font-bold uppercase tracking-[.18em]">Cora locked</h1>
          <p className="mt-2 text-xs opacity-70">OIDC remains authenticated. Enter the Cora security PIN to continue.</p>
        </div>
        <input autoFocus value={pin} onChange={e=>setPin(e.target.value.replace(/\D/g,"").slice(0,12))} onKeyDown={e=>{if(e.key==="Enter")void unlock()}} inputMode="numeric" type="password" autoComplete="off" className="mt-6 w-full rounded-md border bg-transparent p-3 text-center text-xl tracking-[.35em] outline-none" style={{borderColor:"var(--khora-border)"}} placeholder="****"/>
        <button type="button" onClick={()=>void unlock()} disabled={busy||pin.length<4} className="mt-4 w-full rounded-md p-3 text-sm font-bold uppercase tracking-widest disabled:opacity-50" style={{background:"var(--khora-accent)",color:"var(--khora-bg)"}}>{busy?"Verifying...":"Unlock"}</button>
        {error&&<p className="mt-3 text-center text-xs" style={{color:"var(--khora-accent)"}}>{error}</p>}
      </div>
    </div>}
  </>;
}
// Production deployment marker: Cora autolock checkpoint flow.

// Git integration production trigger after verification.
