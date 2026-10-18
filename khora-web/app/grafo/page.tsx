// @l0 L0-003 · Shared immutable proposals, independently calculated projections.
"use client";
import React,{useEffect,useState} from "react";
import "./graph.css";
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
 return <main className="graph-workspace" style={{background:"var(--khora-bg)",color:"var(--khora-ink)",minHeight:"100vh"}}>
  <header className="graph-topbar" aria-label="Dos proyecciones del mismo inventario">
   <div className="graph-heading"><h1>Grafo</h1><p>{mode==="automatic"?"Propuestas del sistema · sin ratificación humana":"Relaciones ratificadas por ti"}</p></div>
   <div className="graph-modes" role="group" aria-label="Elegir grafo">
    <button type="button" aria-pressed={mode==="automatic"} onClick={()=>{setMode("automatic");setSelection(null);}}>Automático <span>{pair?.automatic?.nodes.length??"—"}</span></button>
    <button type="button" aria-pressed={mode==="curated"} onClick={()=>{setMode("curated");setSelection(null);}}>Curado <span>{pair?.curated?.nodes.length??"—"}</span></button>
   </div>
   <div className="graph-actions"><button type="button" disabled={busy||vault||!pair?.source_count} onClick={generate}>{busy?"Actualizando…":"Actualizar ambos"}</button><button type="button" disabled={!pair?.revision||busy} onClick={audit} aria-label="Descargar evidencia de ambos grafos">Evidencia ↓</button></div>
  </header>
  <div className="graph-status" role="status"><span>{pair?`${graph?.nodes.length||0} entidades · ${graph?.edges.length||0} relaciones · ${graph?.communities||0} comunidades`:"Consultando grafo…"}</span><span>{pair?.custody?`${pair.custody.eligible} de ${pair.custody.total} fuentes aptas`:""}{busy?" · Procesando…":""}</span></div>
  {error&&<div className="graph-notice" role="alert">{vault?<><span>La consulta está disponible sin PIN. Para generar o ratificar, abre tu bóveda existente.</span> <a href="/sistema/boveda">Abrir bóveda</a></>:error}</div>}
  {graph?.truncated&&<p className="graph-notice">Vista limitada a {graph.nodes.length} de {graph.totals?.nodes} entidades. Las comunidades conservan el cálculo completo.</p>}
  <View compact emptyMessage={pair?.custody&&!pair.custody.eligible?`${pair.custody.excluded} fuentes permanecen fuera por falta de integridad verificable. No se han modificado ni aprobado desde aquí.`:mode==="curated"?"Las relaciones aparecerán cuando las ratifiques en el inventario. No se copian aprobaciones automáticas.":"Actualiza ambos grafos cuando haya fuentes aptas. No se añaden datos de ejemplo."} state={{nodes:graph?.nodes||[],edges:graph?.edges||[],loading:!pair&&!error,error:!pair?error:null,viewMode,layer2Active:layer2,selectedElement:selection}} actions={{onSetViewMode:setViewMode,onSetLayer2Active:setLayer2,onSelectElement:setSelection}}/>
  <details className="graph-method"><summary>Fuentes y método <span>{pair?.pending??0} pendientes</span></summary><div>
   <p>Un inventario, dos proyecciones. Las comunidades se calculan por separado con Leiden; no se configuran a mano.</p>
   <p>{pair?.completed||0} de {pair?.source_count||0} fuentes de entrada procesadas · {pair?.pending_sources??pair?.pending??0} fuentes pendientes · {pair?.pending_identity_pairs??0} pares de identidad pendientes.</p>
   <p>Una coincidencia de nombre no basta para unir identidades. En el curado, cada unión exige además tu ratificación. Los intervalos sin extracción quedan pendientes de revisión.</p>
   {pair?.revision&&<p className="graph-revision">Revisión compartida: {pair.revision}</p>}
  </div></details>
  <details className="graph-inventory"><summary>Inventario y sustento literal <span>{entries.length} relaciones</span></summary><section className="p-4 space-y-4" aria-label="Inventario revisable">
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
  </section></details>
 </main>;
}
