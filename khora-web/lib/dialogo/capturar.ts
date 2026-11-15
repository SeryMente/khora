import type { FuenteDialogo } from "./contrato";
import { CapturaAudioDerivada } from "./live-audio-client";
import type { VentanaDialogo } from "./live-audio-client";
export type ParteDialogo = { parte:number; fuente:FuenteDialogo; blob:Blob; startMs:number; endMs:number; duracionMs:number };
export type CapturaDialogo = { detener:()=>Promise<void>; stream:MediaStream; chromeStream:MediaStream };
type Opciones = {
  onParte:(p:ParteDialogo)=>Promise<void>;
  onVentana?:(window:VentanaDialogo)=>void;
  onLiveUnavailable?:(source:FuenteDialogo)=>void;
  antesDeGrabar?:()=>Promise<void>;
  onInterrupcion:(motivo:string)=>void;
  mediaDevices?:Pick<MediaDevices,"getDisplayMedia"|"getUserMedia">;
  recorder?:(stream:MediaStream)=>MediaRecorder;
  now?:()=>number;
};
/** Original MediaRecorders remain authoritative for custody; AudioWorklet receives stream copies only. */
export async function capturarDialogo(o:Opciones):Promise<CapturaDialogo> {
  const media=o.mediaDevices??navigator.mediaDevices;
  if(!media?.getDisplayMedia||!media?.getUserMedia)throw Error("Este navegador no permite compartir audio de pestaña y micrófono.");
  const streams:MediaStream[]=[];const recorders:MediaRecorder[]=[];
  const totals={microphone:0,chrome_tab:0};
  const pending=new Set<Promise<void>>();const stopped:Promise<void>[]=[];
  const clock=o.now??(()=>performance.now());const now=()=>Math.round(clock());let origin=0,index=0,stopping:Promise<void>|undefined,closing=false;
  let live:CapturaAudioDerivada|undefined;
  const release=()=>streams.forEach(s=>s.getTracks().forEach(t=>t.stop()));
  const stop=():Promise<void>=>{
    if(stopping)return stopping;
    closing=true;
    stopping=(async()=>{
      try{
        recorders.forEach(r=>{if(r.state!=="inactive")r.stop();});
        await Promise.all(stopped);
        while(pending.size)await Promise.all([...pending]);
        await live?.flush();
      }finally{
        await live?.close();
        release();
      }
    })();
    return stopping;
  };
  const interrupted=(reason:string)=>{
    if(closing)return;
    o.onInterrupcion(reason);
    void stop().catch(()=>o.onInterrupcion("No se confirmó la finalización; conserva las partes recuperables."));
  };
  try{
    const tab=await media.getDisplayMedia({video:true,audio:true});streams.push(tab);
    const tabAudio=tab.getAudioTracks();
    const display=tab.getVideoTracks()[0]?.getSettings().displaySurface;
    if(display&&display!=="browser")throw Error("Selecciona una pestaña de Chrome, no toda la pantalla.");
    if(!tabAudio.length)throw Error("La pestaña no compartió audio. Selecciona la pestaña de la conversación y activa Compartir audio.");
    // Mic is implicit. Browser echo/noise/AGC capability flags are deliberately not prerequisites.
    const mic=await media.getUserMedia({audio:true,video:false});streams.push(mic);
    if(!mic.getAudioTracks().some(t=>t.readyState==="live"))throw Error("El micrófono no entregó una pista activa.");
    if(tabAudio.some(t=>t.readyState!=="live"))throw Error("La pista de Chrome terminó antes de iniciar.");
    await o.antesDeGrabar?.();
    if(streams.some(s=>s.getAudioTracks().some(t=>t.readyState!=="live")))throw Error("Una fuente terminó durante la preparación.");
    origin=now();
    live=await CapturaAudioDerivada.create([
      {source:"microphone",stream:new MediaStream(mic.getAudioTracks())},
      {source:"chrome_tab",stream:new MediaStream(tabAudio)},
    ],window=>o.onVentana?.(window),source=>o.onLiveUnavailable?.(source));
    for(const [source,stream] of [["chrome_tab",new MediaStream(tabAudio)],["microphone",new MediaStream(mic.getAudioTracks())]] as const){
      const r=o.recorder?o.recorder(stream):new MediaRecorder(stream,{mimeType:"audio/webm;codecs=opus",audioBitsPerSecond:64000});
      recorders.push(r);let previous=now()-origin;
      const done=new Promise<void>(resolve=>r.addEventListener("stop",()=>resolve(),{once:true}));
      r.addEventListener("dataavailable",ev=>{
        if(!ev.data.size)return;
        const end=now()-origin;const p={parte:++index,fuente:source,blob:ev.data,startMs:previous,endMs:end,duracionMs:Math.max(0,end-previous)};previous=end;
        let job:Promise<void>;
        job=Promise.resolve().then(()=>o.onParte(p)).catch(()=>interrupted("No se pudo conservar una parte local. Se detuvo la captura; exporta el audio disponible.")).finally(()=>pending.delete(job));
        pending.add(job);totals[source]+=ev.data.size;
        if(totals[source]>18_000_000)interrupted("Se alcanzó el límite preventivo de 18 MB por fuente; conserva y exporta este diálogo antes de iniciar otro.");
      });
      r.addEventListener("error",()=>interrupted("Falló una grabadora. La captura no se considera completa."));
      r.start(5000);stopped.push(done);
    }
    streams.forEach(s=>s.getTracks().forEach(t=>t.addEventListener("ended",()=>interrupted("Una fuente dejó de compartir audio; se detuvieron ambas."),{once:true})));
    return {detener:stop,stream:mic,chromeStream:new MediaStream(tabAudio)};
  }catch(e){
    closing=true;
    await stop().catch(()=>undefined);release();throw e;
  }
}
