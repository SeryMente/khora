const $=selector=>document.querySelector(selector);
const toggle=$('#toggle');
let catalog=null;
async function call(kind){
  if(!globalThis.chrome?.runtime?.sendMessage)return {ok:true,value:{active:false,collector:false,events:0,lastError:'La vista previa no está conectada a Chrome.'}};
  return new Promise(resolve=>chrome.runtime.sendMessage({kind},response=>resolve(response||{ok:false,error:chrome.runtime.lastError?.message||'Sin respuesta del service worker'})));
}
async function loadCatalog(){
  const response=await fetch(chrome.runtime.getURL('coverage-catalog.json'),{cache:'no-store'});
  if(!response.ok)throw new Error('No se pudo cargar coverage-catalog.json');
  catalog=await response.json();
  return catalog;
}
const weights=feature=>feature.priority==='core'?2:1;
const percent=(n,d)=>d?Math.round(100*n/d):0;
const pctText=(n,d)=>percent(n,d)+'%';
function setBar(id,value){$(id).style.width=Math.max(0,Math.min(100,value))+'%';}
function formatDate(value){if(!value)return 'Aún no hay observaciones naturales.';const date=new Date(value);return Number.isNaN(date.getTime())?'Último barrido sin fecha válida.':'Último barrido: '+date.toLocaleString();}
function sourceList(){
  const box=$('#sourcesList');box.replaceChildren();
  for(const source of catalog.sources||[]){
    const row=document.createElement('div');row.className='source-row';
    const id=document.createElement('span');id.textContent=source.id;
    const link=document.createElement('a');link.href=source.url;link.target='_blank';link.rel='noopener noreferrer';link.textContent=source.title+(source.verificationStatus==='content-read'?' · leído '+(source.checkedAt||''):' · pendiente de leer');
    row.append(id,link);box.append(row);
  }
}
function pendingList(observed){
  const box=$('#pendingList');box.replaceChildren();
  const pending=(catalog.features||[]).filter(f=>!f.docs?.length||!observed.has(f.id));
  for(const f of pending.slice(0,12)){
    const row=document.createElement('div');row.className='pending-item';
    const state=[];
    if(!isDocumented(f))state.push('sin fuente oficial leída');
    if(!observed.has(f.id))state.push('no observada naturalmente');
    row.textContent=f.label+' — '+state.join('; ');box.append(row);
  }
  if(!pending.length){const p=document.createElement('p');p.textContent='Todos los elementos del catálogo tienen fuente y al menos una observación natural.';box.append(p);}
}
async function paint(){
  let result;
  try{
    if(!catalog)await loadCatalog();
    result=await call('harmonia:get');
    if(!result?.ok)throw new Error(result?.error||'No se pudo consultar el estado local.');
    const state=result.value||{},coverage=state.coverage||{};
    const features=(catalog.features||[]).filter(f=>f.scope!=='out');
    const totalWeight=features.reduce((n,f)=>n+weights(f),0);
    const verifiedSources=new Set((catalog.sources||[]).filter(source=>source.verificationStatus==='content-read').map(source=>source.id));
    const isDocumented=feature=>Array.isArray(feature.docs)&&feature.docs.some(id=>verifiedSources.has(id));
    const documentedWeight=features.filter(isDocumented).reduce((n,f)=>n+weights(f),0);
    const observed=new Set(coverage.observedFeatureIds||[]);
    const observedFeatures=features.filter(f=>observed.has(f.id));
    const observedWeight=observedFeatures.reduce((n,f)=>n+weights(f),0);
    const docPct=percent(documentedWeight,totalWeight);
    const obsPct=percent(observedWeight,totalWeight);
    const combinedPct=percent(documentedWeight+observedWeight,2*totalWeight);
    $('#indexValue').textContent=combinedPct+'%';
    $('#docsValue').textContent=pctText(documentedWeight,totalWeight)+' · '+features.filter(f=>f.docs?.length).length+'/'+features.length+' elementos';
    $('#observedValue').textContent=pctText(observedWeight,totalWeight)+' · '+observedFeatures.length+'/'+features.length+' elementos';
    $('#totalValue').textContent=features.length+' · '+totalWeight+' puntos ponderados';
    $('#unknownValue').textContent=(coverage.unknownControls||[]).length;
    setBar('#overallBar',combinedPct);setBar('#docsBar',docPct);setBar('#observedBar',obsPct);
    $('#lastScan').textContent=formatDate(coverage.lastScanAt);
    $('#events').textContent=(state.events||0)+' eventos aceptados · '+(coverage.scanCount||0)+' barridos';
    if(state.active){
      $('#dot').className='dot live';$('#headline').textContent='Captura de arquitectura activa';
      $('#detail').textContent=state.collector?'Pestaña elegida · estructura/controles sin texto de conversación.':'Captura local con error de colector: '+(state.lastError||'sin detalle');
      toggle.textContent='Detener captura';toggle.className='stop';toggle.disabled=false;
    }else if(state.collector){
      $('#dot').className='dot';$('#headline').textContent='Lista para iniciar';
      $('#detail').textContent='Abre la pestaña ChatGPT que quieras mapear y activa la captura de forma explícita.';
      toggle.textContent='Iniciar mapeo en esta pestaña';toggle.className='';toggle.disabled=false;
    }else{
      $('#dot').className='dot off';$('#headline').textContent='Colector desconectado o sin credencial';
      $('#detail').textContent=state.lastError||'Ejecuta INICIAR-HARMONIA-HEADLESS.ps1.';
      toggle.textContent='Colector requerido';toggle.className='';toggle.disabled=true;
    }
    sourceList();pendingList(observed);
  }catch(error){
    $('#dot').className='dot off';$('#headline').textContent='No se pudo calcular el índice';
    $('#detail').textContent=String(error.message||error);
    toggle.disabled=true;
  }
}
toggle.addEventListener('click',async()=>{
  toggle.disabled=true;
  const prior=await call('harmonia:get');
  if(!prior?.ok){alert(prior?.error||'No se pudo leer el estado de Harmonia.');await paint();return;}
  const response=await call(prior.value?.active?'harmonia:stop':'harmonia:start');
  if(!response?.ok)alert(response?.error||'La acción no se pudo completar.');
  await paint();
});
$('#refresh').addEventListener('click',()=>void paint());
void paint();