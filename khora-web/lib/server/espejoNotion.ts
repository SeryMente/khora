import { createHash } from "node:crypto";
// @l0 L0-002-R · @req FIX-DICTADO/ESPEJO-NOTION · @acr ACR-1.2 · @req FIX-DICTADO/D15 · @req SISTEMA-MENU/E4
import { registrarEvento } from "./eventos";
import { emitirEventoServicio } from "./service-observability";

function formatFechaLocal(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  const hh = String(date.getHours()).padStart(2, "0");
  const mm = String(date.getMinutes()).padStart(2, "0");
  return `${y}-${m}-${d} ${hh}:${mm}`;
}

/** Lossless UTF-16 bounded chunks: no trim, newline loss or broken surrogate pairs. */
export function chunkTextExacto(text:string):string[]{
  if(!text.length)return [""];
  const chunks:string[]=[];
  for(let at=0;at<text.length;){let end=Math.min(text.length,at+1900);if(end<text.length&&/[\uD800-\uDBFF]/.test(text[end-1]))end--;chunks.push(text.slice(at,end));at=end;}
  return chunks;
}
export interface DatosEspejo {
  texto: string;
  titulo?: string | null;
  volcado_id: string;
  version: number;
  sha256: string;
  fecha?: string | null;
  caracteres: number;
  audio?: string | null;
  partesAudio?: number | null;
  pulidoAplicado?: boolean | null;
  reconexiones?: number | null;
}

export async function espejarVolcado(datos: DatosEspejo): Promise<{pageId:string;sha256:string;verificado:true}|undefined> {
  const token = process.env.NOTION_TOKEN;
  const dbId = process.env.NOTION_DB_VOLCADOS;

  if (!token || !dbId) {
    emitirEventoServicio({ service: "notion", operation: "config.check", provider: "notion", dependency: "api.notion.com", outcome: "SKIPPED", severity: "WARN", reasonCode: "NOTION_NOT_CONFIGURED" });
    await registrarEvento({
      fase: "dictado",
      eventId: "DIC-004",
      estado: "SKIP",
      mensaje: "Espejo Notion omitido por falta de NOTION_TOKEN o NOTION_DB_VOLCADOS",
      detalle: { volcado_id: datos.volcado_id, version: datos.version },
      volcadoId: datos.volcado_id,
      version: datos.version,
      sha256: datos.sha256,
      correlacionId: datos.volcado_id,
    });
    return;
  }

  let fechaDictadoStr = datos.fecha || null;
  let sufijoFechaArchivado = false;
  if (!fechaDictadoStr) {
    fechaDictadoStr = new Date().toISOString();
    sufijoFechaArchivado = true;
  }

  let tituloFinal = datos.titulo?.trim() || "";
  if (!tituloFinal) {
    const dObj = new Date(fechaDictadoStr);
    const validDate = isNaN(dObj.getTime()) ? new Date() : dObj;
    tituloFinal = "Volcado " + formatFechaLocal(validDate);
  }

  if (sufijoFechaArchivado) {
    tituloFinal += " (fecha de archivado)";
  }

  const properties: any = {
    "Título": {
      title: [
        {
          text: {
            content: tituloFinal
          }
        }
      ]
    },
    "volcado_id": {
      rich_text: [
        {
          text: {
            content: datos.volcado_id
          }
        }
      ]
    },
    "version": {
      number: datos.version
    },
    "sha256": {
      rich_text: [
        {
          text: {
            content: datos.sha256
          }
        }
      ]
    },
    "Fecha del dictado": {
      date: {
        start: fechaDictadoStr
      }
    },
    "Caracteres": {
      number: datos.caracteres
    },
    "Estado de ingesta": {
      select: {
        name: "Archivado"
      }
    }
  };

  if (datos.audio) {
    properties["Audio"] = {
      url: datos.audio
    };
  }

  if (datos.partesAudio !== undefined && datos.partesAudio !== null) {
    properties["Partes de audio"] = {
      number: datos.partesAudio
    };
  }

  if (datos.pulidoAplicado !== undefined && datos.pulidoAplicado !== null) {
    properties["Pulido aplicado"] = {
      checkbox: datos.pulidoAplicado
    };
  }

  if (datos.reconexiones !== undefined && datos.reconexiones !== null) {
    properties["Reconexiones"] = {
      number: datos.reconexiones
    };
  }

  if(createHash("sha256").update(datos.texto,"utf8").digest("hex")!==datos.sha256)throw new Error("espejo_huella_fuente_invalida");
  const chunks=chunkTextExacto(datos.texto);
  const block=(text:string)=>({object:"block",type:"paragraph",paragraph:{rich_text:text?[{type:"text",text:{content:text}}]:[]}});
  let calls=0;const started=Date.now();
  async function api(method:string,path:string,body?:unknown):Promise<any>{
    if(++calls>100||Date.now()-started>240000)throw new Error("espejo_presupuesto_agotado_reanudar");
    if(calls>1)await new Promise(resolve=>setTimeout(resolve,350));
    const response=await fetch("https://api.notion.com/v1/"+path,{
      method,headers:{Authorization:`Bearer ${token}`,"Notion-Version":"2022-06-28","Content-Type":"application/json"},
      ...(body===undefined?{}:{body:JSON.stringify(body)}),signal:AbortSignal.timeout(8000),
    });
    if(!response.ok)throw new Error("espejo_http_"+response.status);
    return response.json();
  }
  async function readBlocks(pageId:string):Promise<string[]>{
    const out:string[]=[];let cursor:string|undefined;
    do{
      const result=await api("GET",`blocks/${encodeURIComponent(pageId)}/children?page_size=100`+(cursor?"&start_cursor="+encodeURIComponent(cursor):""));
      if(!Array.isArray(result.results))throw new Error("espejo_lectura_invalida");
      for(const item of result.results){
        if(item.type!=="paragraph"||item.has_children)throw new Error("espejo_contenido_ajeno_no_modificar");
        out.push((item.paragraph.rich_text||[]).map((t:any)=>t.text?.content??t.plain_text??"").join(""));
      }
      cursor=result.has_more?result.next_cursor:undefined;
      if(result.has_more&&!cursor)throw new Error("espejo_cursor_invalido");
    }while(cursor);
    return out;
  }
  try{
    // The queue serializes this key. Query recovers a successful create whose response was lost.
    const existing=await api("POST",`databases/${encodeURIComponent(dbId)}/query`,{filter:{and:[
      {property:"volcado_id",rich_text:{equals:datos.volcado_id}},
      {property:"version",number:{equals:datos.version}},
      {property:"sha256",rich_text:{equals:datos.sha256}},
    ]},page_size:100});
    if(!Array.isArray(existing.results)||existing.has_more||existing.results.length>1)throw new Error("espejo_identidad_ambigua_no_duplicar");
    let pageId:string;
    if(existing.results.length)pageId=existing.results[0].id;
    else{
      const created=await api("POST","pages",{parent:{database_id:dbId},properties,children:chunks.slice(0,100).map(block)});
      if(typeof created.id!=="string")throw new Error("espejo_recibo_sin_id");pageId=created.id;
    }
    let saved=await readBlocks(pageId);
    if(saved.length>chunks.length||saved.some((text,i)=>text!==chunks[i]))throw new Error("espejo_prefijo_distinto_no_sobrescribir");
    for(let at=saved.length;at<chunks.length;at+=100){
      await api("PATCH",`blocks/${encodeURIComponent(pageId)}/children`,{children:chunks.slice(at,at+100).map(block)});
    }
    saved=await readBlocks(pageId);
    if(saved.length!==chunks.length||createHash("sha256").update(saved.join(""),"utf8").digest("hex")!==datos.sha256)throw new Error("espejo_integridad_no_confirmada");
    emitirEventoServicio({service:"notion",operation:"mirror.verify",provider:"notion",dependency:"api.notion.com",outcome:"SUCCESS"});
    await registrarEvento({fase:"dictado",eventId:"DIC-004",estado:"OK",mensaje:"Espejo textual releído y verificado",detalle:{pageId,version:datos.version},volcadoId:datos.volcado_id,version:datos.version,sha256:datos.sha256}).catch(()=>undefined);
    return {pageId,sha256:datos.sha256,verificado:true};
  }catch(e){
    emitirEventoServicio({service:"notion",operation:"mirror.verify",provider:"notion",dependency:"api.notion.com",outcome:"FAILURE",severity:"ERROR",reasonCode:"MIRROR_UNCONFIRMED"});
    // Preserve queue and remote prefix. Retry reads it before appending; never erase evidence.
    throw e;
  }
}
