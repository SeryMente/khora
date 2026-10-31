export async function subirAudioCustodiado(sessionId: string, part: number, blob: Blob, meta: Record<string, unknown>) {
  const expectedHash=Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256",await blob.arrayBuffer())),x=>x.toString(16).padStart(2,"0")).join("");
  const expectedSource=meta.fuenteAudio==="chrome_tab"?"chrome_tab":"microphone";
  let last: unknown;
  for (let attempt=0; attempt<3; attempt++) {
    try {
      const form=new FormData(); form.append("audio",blob,`parte-${part}.webm`);form.append("sesionId",sessionId);form.append("parte",String(part));
      for(const [k,v] of Object.entries(meta)) if(v!==undefined&&v!==null) form.append(k,String(v));
      const r=await fetch("/api/audio",{method:"POST",body:form,signal:AbortSignal.timeout(30000)});
      const d=await r.json().catch(()=>({}));
      if(!r.ok||d.verificado!==true||!/^[a-f0-9]{64}$/i.test(d.sha256||"")||Number(d.bytes)!==blob.size||String(d.sha256).toLowerCase()!==expectedHash||d.sessionId!==sessionId||d.partIndex!==part||d.fuenteAudio!==expectedSource||typeof d.url!=="string"||!d.url.startsWith("https://")) {
        const e=Object.assign(new Error(d.detail||`audio_http_${r.status}`),{httpStatus:r.status,reasonCode:typeof d.error==="string"&&/^[a-z0-9_]{1,80}$/.test(d.error)?d.error:"audio_no_confirmado"});
        if(r.ok||r.status>=400&&r.status<500&&r.status!==408&&r.status!==429) throw Object.assign(e,{permanent:true});
        throw e;
      }
      return {parte:part,url:String(d.url),bytes:Number(d.bytes),sha256:String(d.sha256),verificado:true,fuenteAudio:expectedSource as "microphone"|"chrome_tab",start_ms:Number(meta.startMs)||0,end_ms:Number(meta.endMs)||0,duracion_ms:Number(meta.duracionMs)||0};
    } catch(e) {last=e;if((e as any)?.permanent)break;if(attempt<2)await new Promise(r=>setTimeout(r,1000*2**attempt));}
  }
  throw last;
}
