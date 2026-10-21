const $=selector=>document.querySelector(selector);
const toggle=$('#toggle');
let catalog=null;
async function call(kind,payload={}) {
  if(!globalThis.chrome?.runtime?.sendMessage) return {ok:false,error:'La vista previa no está conectada a Chrome.'};
  return new Promise(resolve=>chrome.runtime.sendMessage({kind,...payload},response=>resolve(response||{ok:false,error:chrome.runtime.lastError?.message||'Sin respuesta del service worker'})));
}
async function loadCatalog(){
  const url=chrome.runtime.getURL('coverage-catalog.json');
  const response=await fetch(url,{cache:'no-store'});
  if(!response.ok)throw new Error('No se pudo cargar el catálogo local ('+response.status+'). Recarga la extensión en chrome://extensions.');
  catalog=await response.json();
  if(!Array.isArray(catalog.features)||!Array.isArray(catalog.sources))throw new Error('El catálogo local tiene un formato no válido.');
}
const weight=feature=>feature.priority==='core'?2:1;
const percent=(n,d)=>d?Math.round(100*n/d):0;
const pctText=(n,d)=>percent(n,d)+'%';
function setBar(id,value){$(id).style.width=Math.max(0,Math.min(100,value))+'%';}
function isDocumented(feature){
 const verified=new Set((catalog?.sources||[]).filter(s=>s.verificationStatus==='content-read').map(s=>s.id));
 return Array.isArray(feature.docs)&&feature.docs.some(id=>verified.has(id));
}
function sourceList(){
 const box=$('#sourcesList');box.replaceChildren();
 for(const source of catalog.sources||[]){
  const row=document.createElement('div');row.className='source-row';
  const id=document.createElement('span');id.textContent=source.id;
  const link=document.createElement('a');link.href=source.url;link.target='_blank';link.rel='noopener noreferrer';
  link.textContent=source.title+(source.verificationStatus==='content-read'?' · leído '+(source.checkedAt||''):' · pendiente de leer');
  row.append(id,link);box.append(row);
 }
}
function pendingList(observed){
 const box=$('#pendingList');box.replaceChildren();
 const pending=(catalog.features||[]).filter(f=>!isDocumented(f)||!observed.has(f.id));
 for(const feature of pending.slice(0,16)){
  const row=document.createElement('div');row.className='pending-item';
  const statuses=[];
  if(!isDocumented(feature))statuses.push('sin fuente oficial leída');
  if(!observed.has(feature.id))statuses.push('no observada naturalmente');
  row.textContent=feature.label+' — '+statuses.join('; ');box.append(row);
 }
 if(!pending.length){const p=document.createElement('p');p.textContent='Todas las capacidades del catálogo tienen documentación verificada y al menos una observación natural.';box.append(p);}
}
function formatDate(value){
 if(!value)return 'Esperando el primer barrido natural.';
 const d=new Date(value);return Number.isNaN(d.getTime())?'Último barrido sin fecha válida.':'Último barrido: '+d.toLocaleString();
}
async function paint(){
 try{
  if(!catalog)await loadCatalog();
  const response=await call('harmonia:get');
  if(!response.ok)throw new Error(response.error||'No se pudo consultar el service worker.');
  const state=response.value||{},coverage=state.coverage||{};
  const features=(catalog.features||[]).filter(f=>f.scope!=='out');
  const totalWeight=features.reduce((n,f)=>n+weight(f),0);
  const docWeight=features.filter(isDocumented).reduce((n,f)=>n+weight(f),0);
  const observed=new Set(coverage.observedFeatureIds||[]);
  const observedFeatures=features.filter(f=>observed.has(f.id));
  const observedWeight=observedFeatures.reduce((n,f)=>n+weight(f),0);
  const docPct=percent(docWeight,totalWeight),naturalPct=percent(observedWeight,totalWeight);
  const totalPct=percent(docWeight+observedWeight,2*totalWeight);
  $('#indexValue').textContent=totalPct+'%';
  $('#docsValue').textContent=pctText(docWeight,totalWeight)+' · '+features.filter(isDocumented).length+'/'+features.length+' capacidades';
  $('#observedValue').textContent=pctText(observedWeight,totalWeight)+' · '+observedFeatures.length+'/'+features.length+' capacidades';
  $('#totalValue').textContent=features.length+' · '+totalWeight+' puntos ponderados';
  $('#unknownValue').textContent=(coverage.unknownControls||[]).length;
  setBar('#overallBar',totalPct);setBar('#docsBar',docPct);setBar('#observedBar',naturalPct);
  $('#lastScan').textContent=formatDate(coverage.lastScanAt);
  $('#events').textContent=(state.events||0)+' eventos aceptados · '+(coverage.scanCount||0)+' barridos · '+(state.activeTabs||0)+' pestañas';
  $('#dot').className=state.autoEnabled?(state.collector?'dot live':'dot off'):'dot';
  $('#headline').textContent=!state.collector?'Colector no disponible':state.autoEnabled?'Captura automática '+(state.activeTabs?'activa':'habilitada'):'Captura automática pausada';
  $('#detail').textContent=!state.collector?(state.lastError||'Ejecuta INICIAR-HARMONIA.cmd.'):state.autoEnabled
   ?'Todas las pestañas de chatgpt.com · '+state.activeTabs+' con captura detectada · solo estructura y controles.'
   :'La captura está pausada. Puedes reanudarla desde aquí.';
  toggle.textContent=state.autoEnabled?'Pausar captura automática':'Reanudar captura automática';
  toggle.className=state.autoEnabled?'stop':'';
  toggle.disabled=!state.collector;
  sourceList();pendingList(observed);
 }catch(error){
  $('#dot').className='dot off';$('#headline').textContent='No se pudo calcular el índice';
  $('#detail').textContent=String(error.message||error);
  $('#sourcesList').replaceChildren();$('#pendingList').replaceChildren();
  toggle.disabled=true;toggle.textContent='Colector o catálogo requerido';
 }
}
toggle.addEventListener('click',async()=>{
 toggle.disabled=true;
 const status=await call('harmonia:get');
 if(!status.ok){alert(status.error||'No se pudo leer el estado.');await paint();return;}
 const response=await call('harmonia:set-auto',{enabled:!status.value?.autoEnabled});
 if(!response.ok)alert(response.error||'No se pudo cambiar el modo automático.');
 await paint();
});
$('#refresh').addEventListener('click',()=>void paint());
void paint();