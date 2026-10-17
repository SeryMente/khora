"use client";
import {useEffect,useRef,useState} from "react";
import s from "./ingreso-studio.module.css";
/** Reads the SAME stream as the recorder. No second microphone, telemetry or fabricated motion. */
export function AudioActivity({stream,active}:{stream:MediaStream|null;active:boolean}){
 const canvas=useRef<HTMLCanvasElement>(null);const [unavailable,setUnavailable]=useState(false);
 useEffect(()=>{
  const el=canvas.current;if(!el)return;const ctx=el.getContext('2d');if(!ctx)return;
  let cancelled=false,frame=0,last=0;let audio:AudioContext|undefined,source:MediaStreamAudioSourceNode|undefined,analyser:AnalyserNode|undefined;
  const flat=()=>{ctx.clearRect(0,0,240,72);ctx.fillStyle=getComputedStyle(el).color;for(let i=0;i<32;i++)ctx.fillRect(i*7.5+2,34,3,4);};flat();setUnavailable(false);
  if(!active||!stream?.active)return;
  const reduced=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const draw=(time:number)=>{if(cancelled)return;frame=requestAnimationFrame(draw);if(document.hidden||time-last<(reduced?250:40))return;last=time;
   if(!stream.active||audio?.state!=='running'||!analyser){flat();return;}
   const bytes=new Uint8Array(analyser.fftSize);analyser.getByteTimeDomainData(bytes);ctx.clearRect(0,0,240,72);ctx.fillStyle=getComputedStyle(el).color;
   for(let i=0;i<32;i++){let energy=0;for(let n=0;n<32;n++){const v=(bytes[i*32+n]-128)/128;energy+=v*v;}const height=Math.max(4,Math.min(64,Math.sqrt(energy/32)*170));ctx.fillRect(i*7.5+2,(72-height)/2,3,height);}
  };
  try{audio=new AudioContext();source=audio.createMediaStreamSource(stream);analyser=audio.createAnalyser();analyser.fftSize=1024;source.connect(analyser);void audio.resume().then(()=>{if(!cancelled)frame=requestAnimationFrame(draw);}).catch(()=>setUnavailable(true));}
  catch{setUnavailable(true);flat();}
  return()=>{cancelled=true;cancelAnimationFrame(frame);source?.disconnect();analyser?.disconnect();void audio?.close().catch(()=>undefined);};
 },[stream,active]);
 return <canvas ref={canvas} width={240} height={72} className={s.wave} role="img" aria-label={unavailable?"Actividad de audio no disponible":active&&stream?"Actividad real del micrófono":"Micrófono en espera"}/>;
}
