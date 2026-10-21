const $=selector=>document.querySelector(selector);
let busy=false;
let refreshTimer=null;
function call(kind,payload={}){
 return new Promise(resolve=>{
  if(!globalThis.chrome?.runtime?.sendMessage){resolve({ok:false,error:'El panel debe abrirse desde la extensión de Chrome.'});return;}
  chrome.runtime.sendMessage({kind,...payload},response=>resolve(response||{ok:false,error:chrome.runtime.lastError?.message||'Sin respuesta del service worker'}));
 });
}
function addPair(dl,label,value){
 const dt=document.createElement('dt');dt.textContent=label;
 const dd=document.createElement('dd');dd.textContent=value===null||value===undefined||value===''?'—':String(value);
 dl.append(dt,dd);
}
function when(value){
 if(!value)return 'Sin datos';const date=new Date(value);return Number.isNaN(date.getTime())?'Fecha no válida':date.toLocaleString();
}
function setStatus(state){
 const dot=$('#statusDot');dot.className='dot'+(state.collector&&state.autoEnabled?' live':state.collector?'':' off');
 $('#headline').textContent=!state.collector?'Colector local no disponible':state.autoEnabled?(state.activeTabs?'Observación automática activa':'Observación automática habilitada'):'Observación automática pausada';
 $('#summary').textContent=state.collector?(state.lastError||'Las pestañas nuevas de ChatGPT se detectan automáticamente. El registro de texto cubre mensajes visibles, no borradores ni razonamiento oculto.'):(state.lastError||'Inicia el colector local y recarga la extensión.');
 $('#toggle').disabled=!state.collector;$('#toggle').textContent=state.autoEnabled?'Pausar observación':'Reanudar observación';
}
function renderOperational(state){
 const dl=$('#operational');dl.replaceChildren();
 addPair(dl,'Versión',state.version);addPair(dl,'Colector',state.collector?'Disponible':'No disponible');
 addPair(dl,'Observación automática',state.autoEnabled?'Activada':'Pausada');addPair(dl,'Pestañas observadas',state.activeTabs||0);
 addPair(dl,'Eventos aceptados',state.events||0);addPair(dl,'Último error',state.lastError||'Ninguno reportado');
}
function renderRepository(sync){
 const dl=$('#repository');dl.replaceChildren();
 if(!sync){addPair(dl,'Estado','Sin comprobación');$('#syncPolicy').textContent='Comprueba la sincronización de metadatos. El código remoto no se ejecuta automáticamente.';return;}
 addPair(dl,'Estado',sync.status);addPair(dl,'Repositorio',sync.repository+' / '+sync.branch);
 addPair(dl,'Versión local / remota',(sync.localVersion||'—')+' / '+(sync.remoteVersion||'—'));
 addPair(dl,'Revisión base local',sync.localRevision||'—');addPair(dl,'Revisión remota',sync.remoteRevision||'—');
 addPair(dl,'Última consulta',when(sync.checkedAt));$('#syncPolicy').textContent=sync.error||sync.policy||'';
}
function renderCoverage(coverage){
 const dl=$('#coverage');dl.replaceChildren();
 if(!coverage){addPair(dl,'Estado','Sin datos');$('#coverageNote').textContent='El colector no devolvió índice de cobertura.';return;}
 const docs=coverage.documentation||{},natural=coverage.naturalObservation||{};
 addPair(dl,'Catálogo',coverage.catalogVersion);addPair(dl,'Capacidades observadas',String((natural.covered||0)+' / '+(natural.total||0)));
 addPair(dl,'Cobertura documental',String((docs.percent??'—')+'%'));
 addPair(dl,'Índice combinado',String((coverage.combinedPercent??'—')+'%'));
 addPair(dl,'Superficies únicas',coverage.uniqueSurfaceCount??0);addPair(dl,'Barridos',coverage.scanCount??0);
 $('#coverageNote').textContent='El índice pondera documentación y observación natural. No equivale a una medición de precisión ni de completitud universal.';
}
function renderRegions(regions,leaders){
 const box=$('#regions');box.replaceChildren();
 const entries=Object.entries(regions||{});
 if(!entries.length){const p=document.createElement('p');p.className='muted';p.textContent='Sin regiones clasificadas: la exploración real todavía debe realizarse.';box.append(p);return;}
 for(const [key,r] of entries){
  const card=document.createElement('article');card.className='region';
  const h=document.createElement('h3');h.textContent=(globalThis.HarmoniaRegionPolicy?.getRegionDescriptor(key).label||key);card.append(h);
  const status=document.createElement('span');status.className='state '+(r.status||'exploring');status.textContent=r.status==='complete'?'Exploración completa':r.status==='unmapped'?'Sin catálogo de completitud':'En exploración';card.append(status);
  const p=document.createElement('p');
  p.textContent='Capacidades: '+(r.observedCount||0)+' / '+(r.requiredCount||0)+' · Superficies: '+(r.distinctSurfaceCount||0)+' · Sesiones: '+(r.sessionCount||0);
  card.append(p);
  const reason=document.createElement('p');reason.textContent=r.reason||'Sin dictamen';card.append(reason);
  const leader=leaders&&leaders[key];
  if(leader!==undefined){const p2=document.createElement('p');p2.textContent='Pestaña observadora asignada: '+leader;card.append(p2);}
  box.append(card);
 }
}
function renderSessions(sessions){
 const box=$('#sessions');box.replaceChildren();
 if(!sessions?.length){const p=document.createElement('p');p.className='muted';p.textContent='No hay pestañas observadas en este momento.';box.append(p);return;}
 for(const s of sessions){
  const item=document.createElement('div');item.className='session';
  const strong=document.createElement('strong');strong.textContent='Pestaña '+s.tabId+' · '+(s.regionKey||'región desconocida');
  const p=document.createElement('p');p.textContent='Inicio: '+when(s.startedAt)+' · Último evento: '+when(s.lastAt)+' · Eventos: '+(s.events||0);
  item.append(strong,p);box.append(item);
 }
}
async function refresh(){
 if(busy||document.hidden)return;busy=true;
 try{
  const response=await call('harmonia:get');
  if(!response.ok)throw new Error(response.error||'No se pudo leer el estado.');
  const state=response.value||{};
  setStatus(state);renderOperational(state);renderRepository(state.repositorySync);renderCoverage(state.coverage);
  renderRegions(state.regionCoverage,state.regionLeaders);renderSessions(state.sessions);
  $('#updatedAt').textContent='Actualizado '+new Date().toLocaleTimeString();
 }catch(error){
  $('#statusDot').className='dot off';$('#headline').textContent='Estado no disponible';$('#summary').textContent=String(error.message||error);
 }finally{busy=false;}
}
$('#toggle').addEventListener('click',async()=>{
 $('#toggle').disabled=true;
 const state=await call('harmonia:get');
 if(!state.ok){await refresh();return;}
 const result=await call('harmonia:set-auto',{enabled:!state.value?.autoEnabled});
 if(!result.ok)$('#summary').textContent=result.error||'No se pudo cambiar el estado.';
 await refresh();
});
$('#refresh').addEventListener('click',()=>void refresh());
$('#syncNow').addEventListener('click',async()=>{
 $('#syncNow').disabled=true;
 const result=await call('harmonia:sync-repository');
 if(!result.ok)$('#syncPolicy').textContent=result.error||'No se pudo consultar main.';
 await refresh();$('#syncNow').disabled=false;
});
function schedule(){
 if(refreshTimer)clearInterval(refreshTimer);
 refreshTimer=null;
 if(!document.hidden)refreshTimer=setInterval(()=>void refresh(),5000);
}
document.addEventListener('visibilitychange',()=>{schedule();if(!document.hidden)void refresh();});
void refresh();schedule();
