// @l0 L0-003 · Shared immutable proposals, independently calculated projections.
"use client";
import React,{useEffect,useState} from "react";
import dynamic from "next/dynamic";
import type { GrafoViewState } from "../components/shared/GrafoView";
import type { Proposal, HumanDecision } from "../../lib/graph-twins";
const View=dynamic(()=>import("../components/shared/GrafoView").then(m=>m.GrafoView),{ssr:false,loading:()=> <p className="p-4">Cargando visualización…</p>});
type Graph={nodes:GrafoViewState["nodes"];edges:GrafoViewState["edges"];communities:number;truncated?:boolean;totals?:{nodes:number;edges:number}};
type Pair={custody?:{total:number;eligible:number;excluded:number;policy:string};revision?:string;empty?:boolean;stale?:boolean;source_count:number;pending:number;pending_sources?:number;pending_identity_pairs?:number;completed?:number;automatic?:Graph;curated?:Graph;proposals?:Proposal[];judgments?:HumanDecision[];limitations?:string[];finished?:boolean};
export default function GrafoPage(){
 const [pair,setPair]=useState<Pair|null>(null),[mode,setMode]=useState<"automatic"|"curated">("automatic"),[busy,setBusy]=useState(false),[error,setError]=useState<string|null>(null),[vault,setVault]=useState(false);
 const [viewMode,setViewMode]=useState<"list"|"graph">("graph"),[layer2,setLayer2]=useState(true),[selection,setSelection]=useState<GrafoViewState["selectedElement"]>(null);
 async function request(body?:unknown):Promise<Pair>{const r=await fetch("/api/grafos"+(typeof window!=="undefined"?window.location.search:""),body?{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(body)}:{cache:"no-store"});const data=await r.json();if(!r.ok){setVault(r.status===423);throw new Error(data.detail||data.error||"No se pudieron consultar los grafos");}setVault(false);setPair(data);return data;}
 useEffect(()=>{request().catch(e=>setError(e.message));},[]);
 async function generate(){setBusy(true);setError(null);try{let p:Pair;do{p=await request({action:"next"});}while(!p.finished);}catch(e){setError(e instanceof Error?e.message:"No se completó la generación");}finally{setBusy(false);}}
 async function review(proposal_id:string,item_id:string,decision:"accept"|"reject"){setBusy(true);setError(null);try{await request({action:"judge",proposal_id,item_id,decision,request_id:crypto.randomUUID()});}catch(e){setError(e instanceof Error?e.message:"No se guardó el juicio");}finally{setBusy(false);}}
 const graph=pair?.[mode];const entries=(pair?.proposals||[]).flatMap(p=>p.chunks.flatMap(c=>c.relations.map(r=>({p,r}))));
 const decisions=new Map<string,HumanDecision>();for(const j of pair?.judgments||[])decisions.set(j.proposal_id+":"+j.item_id,j);
 function audit(){if(!pair)return;const url=URL.createObjectURL(new Blob([JSON.stringify(pair,null,2)],{type:"application/json"}));const a=document.createElement("a");a.href=url;a.download="khora-grafos-"+pair.revision+".json";a.click();URL.revokeObjectURL(url);}
 return <main style={{background:"var(--khora-bg)",color:"var(--khora-ink)",minHeight:"100vh"}}>
  <section className="border-b p-4 space-y-3" aria-label="Dos proyecciones del mismo inventario">
   <h1 className="text-xl font-semibold">Dos grafos · un mismo inventario</h1>
   <p>Las comunidades se calculan por separado con Leiden. El automático no representa tu ratificación.</p>
   <div className="flex flex-wrap gap-3" role="group" aria-label="Elegir grafo">
    <button type="button" aria-pressed={mode==="automatic"} onClick={()=>{setMode("automatic");setSelection(null);}} className="border rounded px-4 py-2">Automático · sin revisión humana ({pair?.automatic?.nodes.length??"—"})</button>
    <button type="button" aria-pressed={mode==="curated"} onClick={()=>{setMode("curated");setSelection(null);}} className="border rounded px-4 py-2">Curado · ratificación explícita ({pair?.curated?.nodes.length??"—"})</button>
   </div>
   <p role="status">{pair?`${pair.completed||0} de ${pair.source_count} fuentes aprobadas procesadas · ${pair.pending_sources??pair.pending} fuentes pendientes · ${pair.pending_identity_pairs??0} pares de identidad pendientes` : "Consultando versiones aprobadas…"}{busy?" · Procesando; puedes conservar esta pantalla abierta.":""}</p>
   {pair?.custody&&<p role="status">Custodia: {pair.custody.eligible} fuentes aptas de {pair.custody.total}. {pair.custody.excluded} quedan fuera de esta corrida hasta superar Custodia. No se aprueban ni se cambian sus estados desde aquí.</p>}
   <p className="text-sm">Las identidades entre textos requieren propuestas con sustento adicional: una coincidencia de nombre no basta. En el curado también requieren tu ratificación. Los intervalos sin extracción quedan pendientes de revisión.</p>
   <div className="flex flex-wrap gap-3"><button type="button" disabled={busy||vault} onClick={generate} className="border rounded px-4 py-2 disabled:opacity-50">{busy?"Procesando ambos…":"Generar / actualizar ambos grafos"}</button><button type="button" disabled={!pair?.revision||busy} onClick={audit} className="border rounded px-4 py-2">Descargar evidencia de la corrida</button></div>
   {vault&&<a href="/sistema/boveda" className="underline">Abrir bóveda para consultar los grafos</a>}
   {error&&<p role="alert">{error}</p>}
   {!pair?.source_count&&pair&&<p>No hay versiones aprobadas disponibles para esta cuenta. No se ingieren borradores ni se inventan datos para llenar la vista.</p>}
   {mode==="curated"&&graph&&!graph.nodes.length&&<p>El grafo curado está vacío hasta que ratifiques relaciones concretas del inventario. No se copian aceptaciones automáticas.</p>}
   {graph?.truncated&&<p role="status">Vista limitada: {graph.nodes.length} de {graph.totals?.nodes} nodos; {graph.edges.length} de {graph.totals?.edges} relaciones. La pertenencia a comunidades conserva el cálculo completo.</p>}
   {pair?.revision&&<p className="text-xs break-all">Misma revisión de publicación para ambos: {pair.revision}</p>}
  </section>
  <View state={{nodes:graph?.nodes||[],edges:graph?.edges||[],loading:!pair&&!error,error:null,viewMode,layer2Active:layer2,selectedElement:selection}} actions={{onSetViewMode:setViewMode,onSetLayer2Active:setLayer2,onSelectElement:setSelection}}/>
  <section className="p-4 space-y-4" aria-label="Inventario revisable">
   <h2 className="text-lg font-semibold">Inventario y sustento literal</h2>
   <p>Ratificar incorpora esta relación y sus expresiones de origen/destino al grafo curado. Rechazar la retira solo del curado. Ningún botón modifica el original ni asigna comunidades.</p>
   {entries.map(({p,r})=><article key={r.id} className="border rounded p-4 space-y-2">
    <h3 className="font-semibold">{r.subject} → {r.predicate} → {r.object}</h3>
    <blockquote className="border-l pl-3 whitespace-pre-wrap">{r.quote}</blockquote>
    <p>{r.attribution} · {r.modality} · Tiempo del hecho: {r.event_time}</p>
    <p className="text-xs break-all">Fuente {r.source.volcado_id} · versión {r.source.version} · posiciones {r.start}–{r.end} (UTF-16) · hash {r.source.sha256}</p>
    <p>Juicio: {decisions.get(p.id+":"+r.id)?.decision==="accept"?"ratificado":decisions.get(p.id+":"+r.id)?.decision==="reject"?"rechazado":"pendiente"}</p>
    <div className="flex gap-3"><button disabled={busy} type="button" className="border rounded px-3 py-2" onClick={()=>review(p.id,r.id,"accept")}>Ratificar relación y extremos</button><button disabled={busy} type="button" className="border rounded px-3 py-2" onClick={()=>review(p.id,r.id,"reject")}>Rechazar del curado</button></div>
   </article>)}
   {(pair?.proposals||[]).flatMap(p=>(p.identities||[]).map(i=><article key={i.id} className="border rounded p-4 space-y-2">
    <h3 className="font-semibold">Identidad propuesta: {i.left.label} ↔ {i.right.label}</h3><p>{i.reason}</p>
    <blockquote className="border-l pl-3 whitespace-pre-wrap">{i.left.relation.quote}</blockquote><blockquote className="border-l pl-3 whitespace-pre-wrap">{i.right.relation.quote}</blockquote>
    <p className="text-xs break-all">Fuentes: {i.left.relation.source.volcado_id} / {i.right.relation.source.volcado_id}. Las versiones, hashes y posiciones están en la evidencia descargable.</p>
    <p>Juicio de identidad: {decisions.get(p.id+":"+i.id)?.decision==="accept"?"ratificado":decisions.get(p.id+":"+i.id)?.decision==="reject"?"rechazado":"pendiente"}</p>
    <div className="flex gap-3"><button disabled={busy} type="button" className="border rounded px-3 py-2" onClick={()=>review(p.id,i.id,"accept")}>Ratificar identidad</button><button disabled={busy} type="button" className="border rounded px-3 py-2" onClick={()=>review(p.id,i.id,"reject")}>Rechazar identidad</button></div>
   </article>))}
   {pair?.limitations?.map(l=><p className="text-sm" key={l}>{l}</p>)}
  </section>
 </main>;
}
