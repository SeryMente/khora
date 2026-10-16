import { verificarCierreCaptura } from "../../lib/audio/custodia";
import test from "node:test";
import assert from "node:assert/strict";
import { createHash, randomUUID } from "node:crypto";
import { setDbForTesting, resetDbForTesting } from "../../lib/server/neon";
import { encolarTrabajosCaptura, esperaReintento, procesarTrabajoCustodia } from "../../lib/server/custodia-trabajos";
import { firmaManifiestoAudio } from "../../lib/server/audio-mp3";
import { cifrarTexto, descifrarTexto } from "../../lib/server/cripto";
import { chunkTextExacto, espejarVolcado } from "../../lib/server/espejoNotion";
import { poseeVolcado, poseeSesion } from "../../lib/server/custodia-acceso";
import { toolKhoraLeerAudio } from "../../lib/server/mcp-audios";
const sha=(s:string)=>createHash("sha256").update(s).digest("hex");
const source={texto:"Texto íntegro.\n  Con espacios.\n",volcado_id:randomUUID(),version:1,sha256:"",caracteres:0,titulo:"Provisional",sessionId:randomUUID(),usuario:"test@example.com",tituloAutomatico:true};source.sha256=sha(source.texto);source.caracteres=source.texto.length;
test("la espera de reintento es acotada y crece",()=>{assert.equal(esperaReintento(1),30);assert.equal(esperaReintento(2),60);assert.equal(esperaReintento(100),21600);});
test("encolar conserva payload cifrado e identidades independientes",async()=>{const calls:any[]=[];await encolarTrabajosCaptura({query:async(s,p)=>{calls.push(p);return {rows:[]};}},source);assert.equal(calls.length,2);assert.match(calls[0][0],/^titulo:/);assert.match(calls[1][0],/^espejo:/);for(const p of calls){assert.ok(!p[4].includes(source.texto));assert.deepEqual(JSON.parse(descifrarTexto(p[4])),source);}});
test("título manual no solicita título IA",async()=>{const calls:any[]=[];await encolarTrabajosCaptura({query:async(s,p)=>{calls.push(p);return {rows:[]};}},{...source,tituloAutomatico:false});assert.equal(calls.length,1);assert.match(calls[0][0],/^espejo:/);});
test("un trabajador sin lease no ejecuta servicios",async()=>{let calls=0;setDbForTesting({query:async()=>{calls++;return {rows:[]};}});try{assert.equal(await procesarTrabajoCustodia(source.usuario),false);assert.equal(calls,1);}finally{resetDbForTesting();}});
test("un fallo secundario conserva un trabajo reintentable y oculta errores sensibles",async()=>{
 const previous=process.env.NOTION_TOKEN;delete process.env.NOTION_TOKEN;const calls:any[]=[];
 setDbForTesting({query:async(s:string,p:any[])=>{calls.push({s,p});if(s.startsWith("UPDATE dictado_custodia_trabajo SET estado='procesando'"))return {rows:[{clave:"espejo:test",tipo:"espejo",payload:cifrarTexto(JSON.stringify(source)),intentos:2}]};return {rows:[]};}});
 try{assert.equal(await procesarTrabajoCustodia(source.usuario),true);const fail=calls.find(c=>c.s.includes("estado='fallido'"));assert.ok(fail);assert.equal(fail.p[2],"espejo_no_configurado");assert.equal(fail.p[3],60);assert.doesNotMatch(fail.s,/DELETE/);}finally{if(previous===undefined)delete process.env.NOTION_TOKEN;else process.env.NOTION_TOKEN=previous;resetDbForTesting();}
});
test("huella de MP3 fija prefijo y estado de cierre",()=>{const p={part_index:1,bytes:12,sha256:'a'.repeat(64)};const first=firmaManifiestoAudio(source.sessionId,[p],false);assert.notEqual(first,firmaManifiestoAudio(source.sessionId,[p],true));assert.notEqual(first,firmaManifiestoAudio(source.sessionId,[p,{...p,part_index:2}],false));assert.equal(first,firmaManifiestoAudio(source.sessionId,[p],false));});
for(const text of ["",source.texto,"x".repeat(1899)+"😀"+"  \n"+"z".repeat(6000)])test("espejo conserva exactamente "+text.length+" unidades UTF-16",()=>{const chunks=chunkTextExacto(text);assert.equal(chunks.join(""),text);assert.ok(chunks.every(c=>c.length<=1900));assert.ok(chunks.every(c=>!/[\uD800-\uDBFF]$/.test(c)));});
test("propietario ausente nunca consulta ni reclama registros",async()=>{setDbForTesting({query:async()=>{throw Error("No consultar");}});try{assert.equal(await poseeVolcado("",source.volcado_id),false);assert.equal(await poseeSesion("",source.sessionId),false);}finally{resetDbForTesting();}});
test("consulta de propietario usa parámetro y no acepta resultado vacío",async()=>{const q:any[]=[];setDbForTesting({query:async(s:string,p:any[])=>{q.push([s,p]);return {rows:[]};}});try{assert.equal(await poseeVolcado(source.usuario,source.volcado_id),false);assert.equal(await poseeSesion(source.usuario,source.sessionId),false);assert.ok(q.every(([s,p])=>s.includes("=$2")&&p[1]===source.usuario));}finally{resetDbForTesting();}});
// Real transport logic + synthetic Notion storage. Lost append response is retried from the stored prefix.
test("espejo largo se reanuda sin duplicar y verifica texto exacto",async()=>{
 const originalFetch=global.fetch,token=process.env.NOTION_TOKEN,db=process.env.NOTION_DB_VOLCADOS;
 process.env.NOTION_TOKEN="synthetic-token";process.env.NOTION_DB_VOLCADOS="synthetic-database";
 const text="Inicio\n  "+"á 😀 espacios  \n".repeat(15000);const input={...source,texto:text,sha256:sha(text),caracteres:text.length};
 const blocks:any[]=[];let created=0,lost=false;const batches:number[]=[];
 global.fetch=async(url:any,options:any={})=>{
  const u=new URL(String(url)),body=options.body?JSON.parse(options.body):{};
  if(u.pathname.endsWith('/query'))return Response.json({results:created?[{id:"page-1"}]:[],has_more:false});
  if(u.pathname.endsWith('/pages')){created++;blocks.push(...body.children);return Response.json({id:"page-1"});}
  if(options.method==='PATCH'){batches.push(body.children.length);blocks.push(...body.children);if(!lost){lost=true;throw Error("response_lost_after_append");}return Response.json({results:[]});}
  const at=Number(u.searchParams.get('start_cursor')||0);return Response.json({results:blocks.slice(at,at+100),has_more:at+100<blocks.length,next_cursor:at+100<blocks.length?String(at+100):null});
 };
 setDbForTesting({query:async()=>({rows:[],rowCount:0})});
 try{await assert.rejects(espejarVolcado(input),/response_lost/);const result=await espejarVolcado(input);assert.equal(created,1);assert.equal(result?.verificado,true);assert.equal(blocks.map(b=>b.paragraph.rich_text.map((t:any)=>t.text.content).join('')).join(''),text);assert.ok(batches.every(n=>n<=100));}
 finally{global.fetch=originalFetch;if(token===undefined)delete process.env.NOTION_TOKEN;else process.env.NOTION_TOKEN=token;if(db===undefined)delete process.env.NOTION_DB_VOLCADOS;else process.env.NOTION_DB_VOLCADOS=db;resetDbForTesting();}
});

test("Chrome exige identidad, cuenta final y todas las partes verificadas",()=>{const id=source.sessionId,p=[{parte:1,verificado:true}],e={status:"stopped",sessionId:id,finalPartCount:1};assert.equal(verificarCierreCaptura(e,id,p),true);for(const bad of [{...e,finalPartCount:undefined},{...e,sessionId:"otra"},{...e,status:"error"},{...e,finalPartCount:2}])assert.equal(verificarCierreCaptura(bad,id,p),false);assert.equal(verificarCierreCaptura(e,id,[{parte:1,verificado:false}]),false);});
