/** Isolated database/blob adapters: tests authorization and assembly, NOT production persistence. */
const {test}=require("node:test"),assert=require("node:assert/strict"),esbuild=require("esbuild"),vm=require("node:vm"),path=require("node:path");
const source=path.resolve(__dirname,"../../../../khora-web/lib/server/audio-dialogo.ts");
async function setup(rows,session=true,manifest={version:1,estado:"detenido",partesEsperadas:rows.length,etiquetas:{microphone:"Operador",chrome_tab:"Chrome"},turnos:[]}){
 let queries=0,reads=0;
 const context={Buffer,console,db:{query:async(sql,params)=>{assert.equal(params[0],"session");queries++;if(queries===1){assert.equal(params[1],"owner");return {rows:session?[{snapshot:JSON.stringify({fuenteEntrada:"dialogo",dialogo:manifest})}]:[]};}return {rows};}},read:async url=>{reads++;return Buffer.from(url);}};
 const built=await esbuild.build({entryPoints:[source],bundle:true,write:false,format:"iife",globalName:"Audio",platform:"node",plugins:[{name:"adapters",setup(b){b.onResolve({filter:/\/(neon|cripto|audio-mp3)$/},a=>({path:a.path,namespace:"stub"}));b.onLoad({filter:/.*/,namespace:"stub"},a=>({contents:a.path.endsWith("neon")?'export const getDb=()=>globalThis.db;':a.path.endsWith("cripto")?'export const descifrarTexto=x=>x;':'export const leerBlobVerificado=(url)=>globalThis.read(url);',loader:"js"}));}}]});
 vm.createContext(context);vm.runInContext(built.outputFiles[0].text,context);
 return {run:()=>context.Audio.cargarAudioDialogo("session","owner"),reads:()=>reads};
}
const part=(i,source,body)=>({part_index:i,fuente_audio:source,blob_url:body,bytes:body.length,sha256:"verified-adapter",start_ms:i===1?12:i===2?30:5000,estado_verificacion:"verificado"});
test("owner no encontrado: ningún acceso a bytes",async()=>{const h=await setup([],false);await assert.rejects(h.run,/dialogo_no_disponible/);assert.equal(h.reads(),0);});
test("no transcribe mientras graba",async()=>{const h=await setup([],true,{version:1,estado:"grabando"});await assert.rejects(h.run,/deten_ambas_fuentes/);assert.equal(h.reads(),0);});
test("ensambla chunks de cada fuente sin alternarlos",async()=>{const h=await setup([part(1,"chrome_tab","TAB1"),part(2,"microphone","MIC1"),part(3,"chrome_tab","TAB2"),part(4,"microphone","MIC2")]);const r=await h.run();assert.equal(r.pistas.find(p=>p.fuente==="chrome_tab").bytes.toString(),"TAB1TAB2");assert.equal(r.pistas.find(p=>p.fuente==="microphone").bytes.toString(),"MIC1MIC2");assert.equal(r.pistas.find(p=>p.fuente==="microphone").offsetMs,30);});
test("hueco global bloquea procesamiento",async()=>{const h=await setup([part(1,"chrome_tab","a"),part(3,"microphone","b")]);await assert.rejects(h.run,/dialogo_parte_no_verificada/);});
test("cantidad incompleta no se considera lista",async()=>{const h=await setup([part(1,"chrome_tab","a")],true,{version:1,estado:"detenido",partesEsperadas:2});await assert.rejects(h.run,/dialogo_partes_pendientes/);assert.equal(h.reads(),0);});
test("parte sin verificar se rechaza antes de bytes",async()=>{const h=await setup([{...part(1,"chrome_tab","a"),estado_verificacion:"pendiente"}]);await assert.rejects(h.run,/dialogo_parte_no_verificada/);assert.equal(h.reads(),0);});
test("fuente desconocida no obtiene atribución inventada",async()=>{const h=await setup([part(1,"other","a")]);await assert.rejects(h.run,/dialogo_parte_no_verificada/);assert.equal(h.reads(),0);});
