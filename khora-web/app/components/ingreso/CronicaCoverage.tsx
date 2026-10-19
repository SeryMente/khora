"use client";
import { useMemo } from "react";
import { Check, Clock3, MapPin, Feather } from "lucide-react";
import { analyzeCronicaCoverage } from "../../../lib/ingreso/cronica-coverage";
import s from "./ingreso-studio.module.css";
const labels={when:"Momento",where:"Lugar",what:"Qué haces"};
const icons={when:Clock3,where:MapPin,what:Feather};
/** Optional textual cues only. Never a custody, truth or publication gate. */
export function CronicaCoverage({text,provisional=""}:{text:string;provisional?:string}) {
 const result=useMemo(()=>analyzeCronicaCoverage([text,provisional].filter(Boolean).join("\n")),[text,provisional]);
 const pending=result.items.filter(item=>!item.covered);
 const mentioned=result.items.filter(item=>item.covered);
 return <aside className={s.cronicaCoverage} aria-label="Pistas opcionales para tu crónica" data-ui-id="ingreso.cronica-pistas">
  <div className={s.cronicaCueRow}>
   {pending.length>0?<>
    <span className={s.cronicaCueLabel}>Pistas opcionales</span>
    <ul className={s.cronicaCueList} aria-label="Por mencionar, solo si quieres">
     {pending.map(item=>{const Icon=icons[item.id];return <li key={item.id} data-cue={item.id}><Icon size={14} aria-hidden="true"/>{labels[item.id]}</li>;})}
    </ul>
   </>:<span className={s.cronicaAllMentioned}><Check size={16} aria-hidden="true"/>Tu relato ya sitúa momento, lugar y actividad.</span>}
   {mentioned.length>0&&pending.length>0&&<span className={s.cronicaMentioned} aria-hidden="true"><Check size={14}/>{mentioned.length} {mentioned.length===1?"mención":"menciones"}</span>}
  </div>
  <span className={s.srOnly} role="status" aria-live="polite" aria-atomic="true">{mentioned.length===0?"Puedes dictar libremente. Las pistas no son obligatorias.":`${mentioned.map(item=>labels[item.id]).join(", ")}: mención encontrada en el texto. ${pending.length>0?"Puedes continuar a tu ritmo.":"Puedes seguir contando lo que quieras."}`}</span>
 </aside>;
}
