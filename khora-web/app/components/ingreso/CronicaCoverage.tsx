"use client";
import { useMemo } from "react";
import { Check, Clock3, MapPin, Feather } from "lucide-react";
import { analyzeCronicaCoverage } from "../../../lib/ingreso/cronica-coverage";
import s from "./ingreso-studio.module.css";
const labels={when:"Momento",where:"Lugar",what:"Qué haces"};
const icons={when:Clock3,where:MapPin,what:Feather};
/** Narrative sufficiency only; never blocks free capture, archive or consent review. */
export function CronicaCoverage({text,provisional=""}:{text:string;provisional?:string}) {
 const result=useMemo(()=>analyzeCronicaCoverage([text,provisional].filter(Boolean).join("\n")),[text,provisional]);
 const count=result.items.filter(item=>item.covered).length;
 return <aside className={s.cronicaCoverage} aria-label="Requisitos de crónica personal" data-ui-id="ingreso.cronica-pistas">
  <div className={s.cronicaCueRow}>
   <span className={s.cronicaCueLabel}>Requisitos de crónica personal</span>
   <ul className={s.cronicaCueList} aria-label="Checklist de contenido suficiente">
    {result.items.map(item=>{const Icon=item.covered?Check:icons[item.id];return <li key={item.id+String(item.covered)} data-cue={item.id} data-complete={String(item.covered)} className={item.covered?s.cronicaCueCompleted:undefined} title={item.evidence||"Todavía no detectado en el relato"}><Icon size={14} aria-hidden="true"/>{labels[item.id]}<span className={s.srOnly}>{item.covered?": detectado en el relato":": pendiente"}</span></li>;})}
   </ul>
   <span className={s.cronicaMentioned} aria-hidden="true">{count}/3</span>
   {count===3&&<span className={s.cronicaAllMentioned}><Check size={16} aria-hidden="true"/>Contenido suficiente. Puedes entregar o seguir contando.</span>}
  </div>
  <span className={s.srOnly} role="status" aria-live="polite" aria-atomic="true">{count} de 3 requisitos detectados. {count===3?"Contenido suficiente para esta crónica; puedes continuar.":"Puedes dictar libremente y archivar aunque falten requisitos."} Comprobación textual orientativa; no certifica hechos ni ratifica datos autobiográficos.</span>
 </aside>;
}
