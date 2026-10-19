"use client";
import { type ClasificacionEntrada, TIPOS_ENTRADA } from "../../../lib/custodia/editorial";
import s from "./ingreso-studio.module.css";
const labels = {general:"Entrada general", conversacion_maya:"Conversación con Maya", interpretacion_simultanea:"Interpretación simultánea", blog_personal:"Nota autobiográfica · blog personal"};
export function TipoEntradaControl({value,onChange,disabled=false}:{value:ClasificacionEntrada;onChange:(value:ClasificacionEntrada)=>void;disabled?:boolean}) {
 return <fieldset disabled={disabled} className={s.entryClassification}>
  <legend>Tipo de entrada</legend>
  <select aria-label="Tipo de entrada" data-ui-id="ingreso.tipo-entrada" value={value.tipoEntrada} onChange={e=>onChange({...value,tipoEntrada:e.target.value as ClasificacionEntrada["tipoEntrada"]})}>
   {TIPOS_ENTRADA.map(tipo=><option key={tipo} value={tipo}>{labels[tipo]}</option>)}
  </select>
  <label><input data-ui-id="ingreso.ofuscada" type="checkbox" checked={value.ofuscada} onChange={e=>onChange({...value,ofuscada:e.target.checked})}/> Entrada ofuscada</label>
  <p style={{margin:0}}>{value.tipoEntrada==="blog_personal"?"Archivar será manual. Después podrás revisar y autorizar la publicación conjunta en el blog y en la Página de Facebook.":value.tipoEntrada==="interpretacion_simultanea"?"Proyecto lateral: conservar no autoriza incorporar este contenido al grafo personal.":"Conservar y archivar no autoriza publicación ni ingesta automática."}</p>
  {value.ofuscada&&<p style={{margin:0}}>La marca es privada y afecta a toda la entrada. No cifra ni anonimiza su texto.</p>}
 </fieldset>;
}
