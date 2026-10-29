const fs=require('fs'),path=require('path');
module.exports=root=>({name:'normal-fixture-adapters',setup(b){
 const stubs={
 'next/navigation':`export const useSearchParams=()=>new URLSearchParams(location.search);`,
 'RecoveryDrawer':`export const RecoveryDrawer=()=>null;`,
 'DictadoExperiencePanel':`export const DictadoExperiencePanel=()=>null;`,
 'IngresoIngestaPanel':`export const IngresoIngestaPanel=()=>null;`,
 'AutoLockProvider':`export const registerKhoraLockCheckpoint=()=>()=>{};export const reportKhoraActivity=()=>{};`,
 '/custodia/recuperacion':`export const evaluarAudioRecuperado=(p)=>({ok:p.every(x=>x.verificado)});export const maximoIndiceConocido=()=>0;`,
 '/audio/custodia':`export const verificarCierreCaptura=()=>({ok:true});`,
 '/transcripcion/ensamblar':`export const ensamblarParrafos=f=>f.map(x=>x.texto).join(' ');`,
 '/transcripcion/reconciliar':`export const reconciliarSegmentos=(old,text)=>({segmentos:[{id:'fixture',texto:text,estado:'provisional_asr'}],motivo:'fixture'});`,
 '/client/authoritative-transcription':`export const transcribeStoredSession=async(sessionId,preview)=>{const r=await fetch('/api/transcribir',{method:'POST',body:JSON.stringify({sessionId,preview})});return {ok:r.ok,data:await r.json()};};`,
 '/client/import-audio-file':`export const importAndTranscribeAudio=()=>{throw Error('fixture path not under test')};`,

 };
 b.onResolve({filter:/.*/},args=>{const k=Object.keys(stubs).find(k=>args.path===k||args.path.endsWith(k));if(k)return{path:k,namespace:'normal-stub'};if(args.path.startsWith('@/'))return{path:path.resolve(root,'repo/khora-web',args.path.slice(2)+'.ts')};});
 b.onLoad({filter:/.*/,namespace:'normal-stub'},args=>({contents:stubs[args.path]}));
}});
