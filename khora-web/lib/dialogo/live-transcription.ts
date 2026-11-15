import type { FuenteDialogo } from "./contrato";
import type { VentanaDialogo } from "./live-audio-client";
export type SegmentoCrudoDialogo = Readonly<{fuente:FuenteDialogo;sequence:number;start_ms:number;end_ms:number;texto:string}>;
type RespuestaLive={fuente:FuenteDialogo;sequence:number;segmentos:Array<{start_ms:number;end_ms:number;texto:string}>};
type EnviadorVentana=(window:VentanaDialogo)=>Promise<RespuestaLive>;
type OpcionesCola={send?:EnviadorVentana;onSegments:(segments:SegmentoCrudoDialogo[])=>void;maxQueuedPerSource?:number;maxRetries?:number;sleep?:(ms:number)=>Promise<void>};
const DEFAULT_MAX_QUEUED=3,DEFAULT_RETRIES=2;
const defaultSleep=(ms:number)=>new Promise<void>(resolve=>setTimeout(resolve,ms));
export function retryAfterMs(value:string|null|undefined,now=Date.now()):number{
  if(!value)return 500;const seconds=Number(value);const wait=Number.isFinite(seconds)&&seconds>=0?seconds*1000:Math.max(0,Date.parse(value)-now);
  if(!Number.isFinite(wait))return 500;return Math.max(100,Math.min(5000,wait));
}
async function enviarVentana(window:VentanaDialogo & {sessionId?:string}):Promise<RespuestaLive>{
  const form=new FormData();form.set("sessionId",window.sessionId||"");form.set("fuente",window.fuente);form.set("sequence",String(window.sequence));form.set("startMs",String(window.startMs));form.set("endMs",String(window.endMs));form.set("audio",window.wav,"window-"+window.sequence+".wav");
  const response=await fetch("/api/transcribir/dialogo/segmento",{method:"POST",body:form,cache:"no-store",signal:AbortSignal.timeout(25000)});
  const data=await response.json().catch(()=>({}));
  if(!response.ok){const error=new Error(typeof data.detail==="string"?data.detail:"dialogo_live_http_"+response.status);Object.assign(error,{status:response.status,retryAfter:response.headers.get("Retry-After")});throw error;}
  if(data.fuente!==window.fuente||Number(data.sequence)!==window.sequence||!Array.isArray(data.segmentos))throw new Error("dialogo_live_respuesta_invalida");
  return {fuente:window.fuente,sequence:window.sequence,segmentos:data.segmentos.filter((segment:any)=>Number.isFinite(segment.start_ms)&&Number.isFinite(segment.end_ms)&&segment.end_ms>=segment.start_ms&&typeof segment.texto==="string"&&segment.texto.trim()).map((segment:any)=>({start_ms:Math.round(segment.start_ms),end_ms:Math.round(segment.end_ms),texto:segment.texto.trim()}))};
}
function normalizarTokens(text:string):string[]{return text.trim().split(/\s+/).map(word=>word.toLocaleLowerCase("es").replace(/[^\p{L}\p{N}]/gu,"")).filter(Boolean);}

/** Stores immutable raw source/sequence/time records. Overlap reconciliation is a display-only projection. */
export function reconciliarSegmentosCrudos(segments:readonly SegmentoCrudoDialogo[]):SegmentoCrudoDialogo[]{
  const sorted=[...segments].filter(s=>s.texto.trim()&&Number.isFinite(s.start_ms)&&Number.isFinite(s.end_ms)&&s.start_ms>=0&&s.end_ms>=s.start_ms)
    .sort((a,b)=>a.start_ms-b.start_ms||a.end_ms-b.end_ms||a.fuente.localeCompare(b.fuente)||a.sequence-b.sequence);
  const seen=new Set<string>(),output:SegmentoCrudoDialogo[]=[];
  for(const segment of sorted){const key=[segment.fuente,segment.sequence,segment.start_ms,segment.end_ms,segment.texto].join("|");if(seen.has(key))continue;seen.add(key);output.push(Object.freeze({...segment}));}
  return output;
}

function resolverSolapamientosParaPantalla(segments:readonly SegmentoCrudoDialogo[]):SegmentoCrudoDialogo[]{
  const raw=reconciliarSegmentosCrudos(segments),output:SegmentoCrudoDialogo[]=[];
  for(const segment of raw){
    const previous=[...output].reverse().find(item=>item.fuente===segment.fuente&&item.end_ms>=segment.start_ms);
    if(!previous){output.push(segment);continue;}
    const left=normalizarTokens(previous.texto),right=normalizarTokens(segment.texto);let overlap=0;
    for(let n=1;n<=Math.min(left.length,right.length);n++)if(left.slice(-n).join(" ")===right.slice(0,n).join(" "))overlap=n;
    if(overlap===right.length)continue;
    const suffix=segment.texto.trim().split(/\s+/).slice(overlap).join(" ");
    if(suffix)output.push({...segment,texto:suffix});
  }
  return output.sort((a,b)=>a.start_ms-b.start_ms||a.fuente.localeCompare(b.fuente)||a.sequence-b.sequence);
}

export function formatearSegmentosCrudos(segments:readonly SegmentoCrudoDialogo[],labels:Record<FuenteDialogo,string>):string{
  const time=(ms:number)=>{const total=Math.max(0,Math.floor(ms/1000));return String(Math.floor(total/60)).padStart(2,"0")+":"+String(total%60).padStart(2,"0");};
  return resolverSolapamientosParaPantalla(segments).map(segment=>"["+time(segment.start_ms)+"–"+time(segment.end_ms)+"] "+labels[segment.fuente]+": "+segment.texto).join("\n\n");
}

export function protegerEdicionHumana(
  displayText:string,
  currentRaw:readonly SegmentoCrudoDialogo[],
  incoming:readonly SegmentoCrudoDialogo[],
  manualEdit:boolean,
  labels:Record<FuenteDialogo,string>,
):{displayText:string;rawSegments:SegmentoCrudoDialogo[]}{
  const rawSegments=reconciliarSegmentosCrudos([...currentRaw,...incoming]);
  return {displayText:manualEdit?displayText:formatearSegmentosCrudos(rawSegments,labels),rawSegments};
}

export function agregarSegmentosAlFinal(displayText:string,pending:readonly SegmentoCrudoDialogo[],labels:Record<FuenteDialogo,string>):string{
  const addition=formatearSegmentosCrudos(pending,labels);if(!addition)return displayText;return displayText.trim()?displayText.trimEnd()+"\n\n"+addition:addition;
}

type ColaFuente={items:VentanaDialogo[];running:boolean;failures:Set<number>;dropped:Set<number>};
/** Two independent bounded FIFO queues. One source cannot block the other. */
export class ColasDialogoVivo{
  private readonly queues:Record<FuenteDialogo,ColaFuente>={microphone:{items:[],running:false,failures:new Set(),dropped:new Set()},chrome_tab:{items:[],running:false,failures:new Set(),dropped:new Set()}};
  private readonly idleWaiters:Array<()=>void>=[];
  private readonly maxQueued:number;private readonly maxRetries:number;private readonly sleep:(ms:number)=>Promise<void>;private readonly send:EnviadorVentana;
  constructor(private readonly options:OpcionesCola){this.maxQueued=Math.max(1,options.maxQueuedPerSource??DEFAULT_MAX_QUEUED);this.maxRetries=Math.max(0,options.maxRetries??DEFAULT_RETRIES);this.sleep=options.sleep??defaultSleep;this.send=options.send??(enviarVentana as EnviadorVentana);}
  enqueue(window:VentanaDialogo & {sessionId?:string}):boolean{
    const queue=this.queues[window.fuente];if(queue.items.length>=this.maxQueued){queue.dropped.add(window.sequence);queue.failures.add(window.sequence);return false;}
    queue.items.push(window);void this.pump(window.fuente);return true;
  }
  private async pump(source:FuenteDialogo):Promise<void>{
    const queue=this.queues[source];if(queue.running)return;queue.running=true;
    try{
      while(queue.items.length){const window=queue.items.shift()!;let completed=false;
        for(let attempt=0;attempt<=this.maxRetries;attempt++){
          try{const result=await this.send(window);const raw:SegmentoCrudoDialogo[]=result.segmentos.map(segment=>Object.freeze({fuente:source,sequence:window.sequence,start_ms:segment.start_ms,end_ms:segment.end_ms,texto:segment.texto}));if(raw.length)this.options.onSegments(raw);completed=true;break;}
          catch(error){const status=Number((error as any)?.status||0),retryAfter=(error as any)?.retryAfter as string|undefined;if(attempt>=this.maxRetries||(status>=400&&status<500&&status!==408&&status!==429))break;await this.sleep(status===429?retryAfterMs(retryAfter):Math.min(1500,200*(2**attempt)));}
        }
        if(!completed)queue.failures.add(window.sequence);
      }
    }finally{
      queue.running=false;
      if(this.queues.microphone.running||this.queues.chrome_tab.running||this.queues.microphone.items.length||this.queues.chrome_tab.items.length){this.pumpIfNeeded("microphone");this.pumpIfNeeded("chrome_tab");}
      else this.idleWaiters.splice(0).forEach(resolve=>resolve());
    }
  }
  private pumpIfNeeded(source:FuenteDialogo):void{if(!this.queues[source].running&&this.queues[source].items.length)void this.pump(source);}
  private isBusy():boolean{return (["microphone","chrome_tab"] as const).some(source=>this.queues[source].running||this.queues[source].items.length>0);}
  async waitForIdle(timeoutMs=30000):Promise<{failedSources:FuenteDialogo[];failed:Record<FuenteDialogo,number[]>;timedOut:boolean;pendingSources:FuenteDialogo[]}>{
    const settle=new Promise<void>(resolve=>{if(!this.isBusy())resolve();else this.idleWaiters.push(resolve);});
    await Promise.race([settle,new Promise<void>(resolve=>setTimeout(resolve,timeoutMs))]);
    const timedOut=this.isBusy(),failed={microphone:[...this.queues.microphone.failures].sort((a,b)=>a-b),chrome_tab:[...this.queues.chrome_tab.failures].sort((a,b)=>a-b)};
    const pendingSources=(["microphone","chrome_tab"] as const).filter(source=>this.queues[source].running||this.queues[source].items.length>0);
    return {failed,timedOut,pendingSources,failedSources:(["microphone","chrome_tab"] as const).filter(source=>failed[source].length>0||pendingSources.includes(source))};
  }
}
