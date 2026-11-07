import { transcribeStoredSession } from "./authoritative-transcription";
export const MAX_IMPORT_AUDIO_BYTES = 24 * 1024 * 1024;
const ALLOWED_EXTENSIONS = new Set(["mp3", "m4a", "mp4", "wav", "webm", "ogg", "flac"]);
function bytesToBase64(bytes:Uint8Array):string{let binary="";for(const byte of bytes)binary+=String.fromCharCode(byte);return btoa(binary);}
function toHex(bytes:ArrayBuffer):string{return Array.from(new Uint8Array(bytes),b=>b.toString(16).padStart(2,"0")).join("");}
async function readJson(response:Response):Promise<Record<string,any>>{const raw=await response.text();try{return raw?JSON.parse(raw):{};}catch{return{detail:raw.trim().slice(0,200)||`Respuesta HTTP ${response.status} sin JSON`};}}
export function validateImportedAudio(file:File):void{if(file.size<=0)throw new Error("El archivo de audio está vacío");if(file.size>MAX_IMPORT_AUDIO_BYTES)throw new Error("El archivo supera el límite de 24 MB para transcripción");const extension=file.name.split(".").pop()?.toLowerCase()||"";if(!ALLOWED_EXTENSIONS.has(extension))throw new Error("Formato no admitido. Usa MP3, M4A, MP4, WAV, WebM, OGG o FLAC");}
export async function importAndTranscribeAudio(args:{file:File;sessionId:string;previewText:string}):Promise<{ok:boolean;data:Record<string,any>}>{
 validateImportedAudio(args.file);
 const key=await crypto.subtle.generateKey({name:"AES-GCM",length:256},true,["encrypt"]);const iv=crypto.getRandomValues(new Uint8Array(12));
 const rawKey=new Uint8Array(await crypto.subtle.exportKey("raw",key));const encrypted=await crypto.subtle.encrypt({name:"AES-GCM",iv},key,await args.file.arrayBuffer());
 const stagingFile=new File([encrypted],"audio-importado.khstaging",{type:"application/octet-stream"});
 const policyResponse=await fetch("/api/audio/importar/token",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({kind:"storage-policy",sessionId:args.sessionId,bytes:stagingFile.size})});
 const policy=await readJson(policyResponse);if(!policyResponse.ok)throw new Error(policy.detail||"No se pudo preparar el almacenamiento cifrado");
 if(policy.provider!=="b2"||typeof policy.uploadId!=="string"||!Number.isSafeInteger(policy.chunkSize)||policy.chunkSize<=0||policy.chunkSize>4*1024*1024)throw new Error("Backblaze B2 no está habilitado; no se guardará el nuevo registro en otro proveedor");
 const chunkCount=Math.ceil(stagingFile.size/policy.chunkSize);
 // Vercel Functions cap request bodies at 4.5 MB; each 4 MiB part is sent to KHORA, and only the server talks to B2.
 for(let index=0;index<chunkCount;index++){
  const start=index*policy.chunkSize,end=Math.min(start+policy.chunkSize,stagingFile.size);const form=new FormData();
  form.append("sessionId",args.sessionId);form.append("uploadId",policy.uploadId);form.append("index",String(index));form.append("totalBytes",String(stagingFile.size));form.append("chunkCount",String(chunkCount));
  form.append("chunk",stagingFile.slice(start,end),`chunk-${index}.part`);
  const chunkResponse=await fetch("/api/audio/importar/parte",{method:"POST",body:form});const chunkResult=await readJson(chunkResponse);
  if(!chunkResponse.ok)throw new Error(chunkResult.detail||`No se pudo transferir la parte ${index+1} a custodia`);
 }
 const stageSha256=toHex(await crypto.subtle.digest("SHA-256",encrypted));
 const finalizeResponse=await fetch("/api/audio/importar/finalizar",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({sessionId:args.sessionId,uploadId:policy.uploadId,bytes:stagingFile.size,chunkCount,sha256:stageSha256})});
 const finalized=await readJson(finalizeResponse);if(!finalizeResponse.ok||typeof finalized.url!=="string"||finalized.verificado!==true)throw new Error(finalized.detail||"No se pudo verificar la carga temporal cifrada en Backblaze B2");
 const stagingBlob={url:finalized.url};
 const storedResponse=await fetch("/api/audio/importar/procesar",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({sessionId:args.sessionId,stagingUrl:stagingBlob.url,keyBase64:bytesToBase64(rawKey),ivBase64:bytesToBase64(iv),originalName:args.file.name})});
 const stored=await readJson(storedResponse);
 if(!storedResponse.ok)return{ok:false,data:{...stored,sessionId:args.sessionId,stagingUrl:typeof stored.stagingUrl==="string"?stored.stagingUrl:stagingBlob.url,audioBytes:typeof stored.audioBytes==="number"?stored.audioBytes:args.file.size,sha256:typeof stored.sha256==="string"?stored.sha256:undefined,verificado:false,recuperable:stored.recuperable===true||typeof stored.audioUrl==="string"||typeof stored.stagingUrl==="string",detail:stored.detail||"No se pudo verificar el audio importado. El archivo local original se conserva; no archives esta captura hasta completar la verificación."}};
 let transcription:{ok:boolean;data:Record<string,any>};
 try{transcription=await transcribeStoredSession(args.sessionId,args.previewText);}catch(cause){return{ok:false,data:{sessionId:args.sessionId,audioUrl:stored.audioUrl,audioBytes:stored.audioBytes,mimeType:stored.mimeType,originalName:stored.originalName,sha256:stored.sha256,verificado:stored.verificado===true,estadoTranscripcion:"fallido",detail:`El audio original quedó almacenado y verificado, pero falló la solicitud de transcripción: ${cause instanceof Error?cause.message:String(cause)}. Puedes custodiarlo y exportarlo sin transcripción.`}};}
 return{ok:transcription.ok&&transcription.data?.exito===true,data:{...transcription.data,sessionId:args.sessionId,audioUrl:stored.audioUrl,audioBytes:stored.audioBytes,mimeType:stored.mimeType,originalName:stored.originalName,sha256:stored.sha256,verificado:stored.verificado===true,estadoTranscripcion:transcription.data?.estadoTranscripcion||"fallido"}};
}