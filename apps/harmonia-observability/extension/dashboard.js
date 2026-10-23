const $=selector=>document.querySelector(selector);
let busy=false,refreshTimer=null,catalog=null,buildInfo=null;
function call(kind,payload={}){
 return new Promise(resolve=>{
  if(!globalThis.chrome?.runtime?.sendMessage){resolve({ok:false,error:'Este panel debe abrirse desde la extensión de Chrome.'});return;}
  chrome.runtime.sendMessage({kind,...payload},response=>resolve(response||{ok:false,error:chrome.runtime.lastError?.message||'Sin respuesta del service worker'}));
 });
}
function put(el,value){if(el)el.textContent=value===null||value===undefined?'—':String(value);}
function addPair(dl,label,value){
 const dt=document.createElement('dt');dt.textContent=label;const dd=document.createElement('dd');dd.textContent=value===null||value===undefined||value===''?'—':String(value);dl.append(dt,dd);
}
function time(value){return globalThis.HarmoniaDashboardModel.timeLabel(value);}
function setStatus(summary){
 const dot=$('#statusDot');dot.className='dot'+(!summary.collector?' off':!summary.autoEnabled?' paused':summary.activeTabs?' live':'');
 const title=!summary.collector?'Colector no disponible':!summary.autoEnabled?'Observación pausada':summary.activeTabs?'Observación activa':'Colector activo · sin pestañas';
 put($('#headline'),title);put($('#updatedAt'),'Actualizado '+new Date(summary.updatedAt).toLocaleTimeString());put($('#versionLine'),'v'+summary.version+' · resumen compacto');
 put($('#toggle'),summary.autoEnabled?'Pausar':'Reanudar');$('#toggle').disabled=!summary.collector;
 put($('#summary'),'Objetivo: observabilidad de la interfaz primaria visible de ChatGPT. Datos utilizables por región solo al superar los criterios objetivos de cierre.');
}
function renderMetrics(summary){
 const m=summary.catalogMetrics;
 put($('#documentationValue'),m.documentation.percent===null?'N/D':m.documentation.percent+'%');
 put($('#documentationDetail'),m.documentation.covered+'/'+m.documentation.total+' capacidades respaldadas por fuentes verificadas');
 put($('#observationValue'),m.observation.percent===null?'N/D':m.observation.percent+'%');
 put($('#observationDetail'),m.scanCount===0?'Sin barridos naturales persistidos':m.observation.covered+'/'+m.observation.total+' capacidades · '+m.scanCount+' barridos');
 put($('#lastScanValue'),summary.lastScanAt?time(summary.lastScanAt):'Nunca');
 put($('#lastScanDetail'),summary.lastScanAt?'Última superficie real guardada en el índice local':'Aún no hay evidencia natural de superficies');
 put($('#repoPersistValue'),'Nunca');put($('#repoPersistDetail'),'No existe canal de escritura de observaciones a GitHub. Consultar main no guarda eventos.');
}
function renderRegions(summary){
 const tbody=$('#regionRows');tbody.replaceChildren();
 for(const row of summary.regionRows){
  const tr=document.createElement('tr');const tdName=document.createElement('td');const name=document.createElement('span');name.className='regionName';name.textContent=row.label;tdName.append(name);
  const key=document.createElement('small');key.className='regionKey';key.textContent=row.key;tdName.append(key);tr.append(tdName);
  const tdStatus=document.createElement('td');const state=document.createElement('span');state.className='state '+row.state;state.textContent=row.stateLabel;tdStatus.append(state);tr.append(tdStatus);
  const tdCompletion=document.createElement('td');tdCompletion.className='progressCell';
  if(row.percent===null){const no=document.createElement('span');no.className='noProgress';no.textContent='N/D · sin catálogo verificable';tdCompletion.append(no);}
  else{const wrap=document.createElement('div');wrap.className='progressText';const strong=document.createElement('strong');strong.textContent=row.percent+'%';const detail=document.createElement('small');detail.textContent=row.observed+'/'+row.required+' capacidades';wrap.append(strong,detail);const bar=document.createElement('progress');bar.className='bar';bar.max=100;bar.value=row.percent;bar.setAttribute('aria-label','Completitud de '+row.label+': '+row.percent+'%');tdCompletion.append(wrap,bar);}
  tr.append(tdCompletion);
  const tdEvidence=document.createElement('td');const signal=document.createElement('span');signal.className='signal';signal.textContent=row.evidence;
  const last=document.createElement('small');last.textContent=row.lastScanAt?'Último barrido: '+time(row.lastScanAt):row.kind==='transversal'?'':'Sin barrido persistido';signal.append(document.createElement('br'),last);
  const usage=document.createElement('span');usage.className='usage'+(row.usable?' ready':'');usage.textContent=row.usageLabel;usage.title=row.reason;signal.append(document.createElement('br'),usage);tdEvidence.append(signal);tr.append(tdEvidence);tbody.append(tr);
 }
 put($('#regionSummary'),summary.readyRegionCount+' listas · '+summary.exploredRegionCount+' con evidencia');
}
function renderTechnical(summary){
 const dl=$('#technicalInfo');dl.replaceChildren();
 addPair(dl,'Colector local',summary.collector?'Disponible':'No disponible');addPair(dl,'Observación automática',summary.autoEnabled?'Activada':'Pausada');
 addPair(dl,'Pestañas con sesión',summary.activeTabs);addPair(dl,'Eventos aceptados',summary.eventCount);addPair(dl,'Observadores estructurales líderes',summary.structuralObserverCount);
 addPair(dl,'Catálogo vigente',summary.catalogVersion);addPair(dl,'Política regional',summary.policyVersion);
 addPair(dl,'Última escritura del índice local',time(summary.lastLocalIndexWriteAt));addPair(dl,'Última exploración persistida',summary.lastScanAt?time(summary.lastScanAt):'Nunca');
 addPair(dl,'Última consulta de metadatos de GitHub',summary.lastRepositoryMetadataCheckAt?time(summary.lastRepositoryMetadataCheckAt):'Sin registro');
 addPair(dl,'Estado de sincronización remota',summary.repositorySyncStatus);addPair(dl,'Persistencia de eventos en GitHub','No implementada; no se atribuye fecha');
 const error=$('#lastErrorDetail');error.hidden=!summary.lastError;if(summary.lastError)error.textContent='Último error: '+summary.lastError;
}
async function loadLocalCatalog(){
 try{
  const responses=await Promise.all([fetch(chrome.runtime.getURL('coverage-catalog.json'),{cache:'no-store'}),fetch(chrome.runtime.getURL('build-info.json'),{cache:'no-store'})]);
  if(!responses[0].ok||!responses[1].ok)throw new Error('No se pudo leer el catálogo o build-info local.');
  catalog=await responses[0].json();buildInfo=await responses[1].json();
 }catch(error){catalog={schema:'harmonia.coverage-catalog.v1',version:null,features:[],sources:[]};buildInfo={regionPolicyVersion:'—'};$('#errorNotice').hidden=false;put($('#errorNotice'),String(error.message||error));}
}
async function refresh(){
 if(busy||document.hidden)return;busy=true;
 try{
  if(!catalog)await loadLocalCatalog();const response=await call('harmonia:get');if(!response.ok)throw new Error(response.error||'No se pudo leer el estado local.');
  const state=response.value||{};state.buildInfo=buildInfo;const summary=globalThis.HarmoniaDashboardModel.summarize(state,catalog,new Date().toISOString());
  setStatus(summary);renderMetrics(summary);renderRegions(summary);renderTechnical(summary);
  if(!summary.collector){$('#errorNotice').hidden=false;put($('#errorNotice'),summary.lastError||'El colector no responde. No se han inventado valores de exploración.');}
  else if(summary.lastError){$('#errorNotice').hidden=false;put($('#errorNotice'),summary.lastError);}
  else{$('#errorNotice').hidden=true;put($('#errorNotice'),'');}
 }catch(error){$('#statusDot').className='dot off';put($('#headline'),'Estado no disponible');put($('#summary'),String(error.message||error));$('#errorNotice').hidden=false;put($('#errorNotice'),String(error.message||error));}
 finally{busy=false;}
}
$('#toggle').addEventListener('click',async()=>{
 $('#toggle').disabled=true;const current=await call('harmonia:get');if(!current.ok){await refresh();return;}
 const result=await call('harmonia:set-auto',{enabled:!current.value?.autoEnabled});
 if(!result.ok){put($('#errorNotice'),result.error||'No se pudo cambiar la observación.');$('#errorNotice').hidden=false;}await refresh();
});
$('#refresh').addEventListener('click',()=>void refresh());
function schedule(){if(refreshTimer)clearInterval(refreshTimer);refreshTimer=null;if(!document.hidden)refreshTimer=setInterval(()=>void refresh(),5000);}
document.addEventListener('visibilitychange',()=>{schedule();if(!document.hidden)void refresh();});
void refresh();schedule();