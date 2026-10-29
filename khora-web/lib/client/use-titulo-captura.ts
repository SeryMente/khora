"use client";
import {useEffect,useRef,useState} from 'react';
/** Latest-source scheduling, abort on session change; no title is inferred when provider fails. */
export function useTituloCaptura(text:string,session:string,enabled:boolean,onTitle:(title:string)=>void){
 const latest=useRef({text,session,enabled,onTitle});latest.current={text,session,enabled,onTitle};
 const completed=useRef(''),inFlight=useRef(false),[busy,setBusy]=useState(false);
 useEffect(()=>{completed.current='';const controller=new AbortController();
  const attempt=async()=>{const v=latest.current;
   if(!v.enabled||inFlight.current||v.text.trim().length<30||v.text.trim().split(/\s+/).length<6||completed.current===v.text)return;
   const source=v.text,key=v.session;inFlight.current=true;setBusy(true);
   try{const r=await fetch('/api/dictado-archivo/titulo',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({texto:source}),signal:AbortSignal.any([controller.signal,AbortSignal.timeout(20000)])});const d=await r.json();const title=d.title??d.titulo;
    if(r.ok&&typeof title==='string'&&title.trim()&&latest.current.enabled&&latest.current.session===key&&(latest.current.text===source||latest.current.text.startsWith(source))){completed.current=source;latest.current.onTitle(title);}
   }catch{/* Original/checkpoints remain authoritative. Retry next cadence, no fabricated title. */}finally{inFlight.current=false;if(!controller.signal.aborted)setBusy(false);}
  };const timer=setInterval(()=>void attempt(),3000);void attempt();return()=>{clearInterval(timer);controller.abort();};
 },[session]);
 return busy;
}
