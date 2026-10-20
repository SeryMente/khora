"use client";
import { Info } from "lucide-react";
import { type ClasificacionEntrada, TIPOS_ENTRADA } from "../../../lib/custodia/editorial";
import s from "./ingreso-studio.module.css";
const labels = {general:"Entrada general", conversacion_maya:"Conversación con Maya", interpretacion_simultanea:"Interpretación consecutiva", blog_personal:"Crónica personal"};
export function TipoEntradaControl({value,onChange,disabled=false}:{value:ClasificacionEntrada;onChange:(value:ClasificacionEntrada)=>void;disabled?:boolean}) {
 const cronica=value.tipoEntrada==="blog_personal";
 const privacidad=<label className={s.entryPrivacy}><input disabled={disabled} data-ui-id="ingreso.ofuscada" type="checkbox" checked={value.ofuscada} onChange={e=>onChange({...value,ofuscada:e.target.checked})}/> Entrada ofuscada</label>;
 return <fieldset className={`${s.entryClassification} ${cronica?s.entryCompact:""}`}>
  <legend className={cronica?s.srOnly:undefined}>Tipo de entrada</legend>
  <div className={s.entrySelectRow}>
   <select disabled={disabled} aria-label="Tipo de entrada" data-ui-id="ingreso.tipo-entrada" value={value.tipoEntrada} onChange={e=>onChange({...value,tipoEntrada:e.target.value as ClasificacionEntrada["tipoEntrada"]})}>
    {TIPOS_ENTRADA.map(tipo=><option key={tipo} value={tipo}>{labels[tipo]}</option>)}
   </select>
   {cronica&&<details className={s.cronicaHelp} data-ui-id="ingreso.cronica-ayuda" onKeyDown={e=>{if(e.key==="Escape"){e.preventDefault();e.currentTarget.open=false;e.currentTarget.querySelector("summary")?.focus();}}}>
    <summary aria-label="Ayuda sobre la crónica personal" title="Ayuda sobre la crónica personal"><Info size={19}/><span className={s.srOnly}>Ayuda sobre la crónica personal</span></summary>
    <div className={s.cronicaHelpBody} role="note" aria-label="Sobre la crónica personal">
     <strong>Tu día, en tus palabras</strong>
     <p>Empieza a dictar sin preparar nada. Las pistas de momento, lugar y actividad se apartan cuando encuentran una mención en tu relato. Son orientativas: no verifican lo ocurrido ni son requisitos.</p>
     <p>Puedes cambiar de tema, dejar cosas abiertas y contar todo lo que quieras. No se completan datos ausentes ni necesitas dar una dirección exacta.</p>
     <p>Si te sirven, también puedes contar el contexto, cómo lo viviste, qué significa para ti o qué queda pendiente. Ninguna guía obliga a responder todo.</p>
     <p>La detección es local, por expresiones del texto; puede pasar por alto una mención. «Archivar registro» conserva el original. Publicar en el blog y Facebook exige después revisar y autorizar el texto exacto; no se publica audio.</p>
     {privacidad}
     {value.ofuscada&&<p>La marca es privada y afecta a toda la entrada. No cifra ni anonimiza su texto.</p>}
    </div>
   </details>}
  </div>
  {cronica?value.ofuscada&&<span className={s.privateBadge}>Entrada ofuscada · marca privada</span>:<>
   {privacidad}
   <p>{value.tipoEntrada==="interpretacion_simultanea"?"Proyecto lateral: conservar no autoriza incorporar este contenido al grafo personal.":"Conservar y archivar no autoriza publicación ni ingesta automática."}</p>
   {value.ofuscada&&<p>La marca es privada y afecta a toda la entrada. No cifra ni anonimiza su texto.</p>}
  </>}
 </fieldset>;
}
