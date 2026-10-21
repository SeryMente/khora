const $=selector=>document.querySelector(selector);
function call(kind,payload={}){
 return new Promise(resolve=>{
  if(!globalThis.chrome?.runtime?.sendMessage){resolve({ok:false,error:'No conectado a Chrome.'});return;}
  chrome.runtime.sendMessage({kind,...payload},response=>resolve(response||{ok:false,error:chrome.runtime.lastError?.message||'Sin respuesta del service worker'}));
 });
}
async function paint(){
 const response=await call('harmonia:get');
 if(!response.ok){$('#dot').className='dot off';$('#headline').textContent='Estado no disponible';$('#detail').textContent=response.error||'No se pudo leer el estado.';$('#toggle').disabled=true;return;}
 const state=response.value||{};
 $('#dot').className='dot'+(state.collector&&state.autoEnabled?' live':state.collector?'':' off');
 $('#headline').textContent=!state.collector?'Colector local no disponible':state.autoEnabled?'Observación automática activa':'Observación pausada';
 $('#detail').textContent=!state.collector?(state.lastError||'Inicia el colector local.'):(state.activeTabs||0)+' pestañas observadas · '+(state.events||0)+' eventos aceptados';
 $('#toggle').textContent=state.autoEnabled?'Pausar observación':'Reanudar observación';$('#toggle').disabled=!state.collector;
}
$('#toggle').addEventListener('click',async()=>{
 $('#toggle').disabled=true;
 const state=await call('harmonia:get');
 if(!state.ok){await paint();return;}
 const result=await call('harmonia:set-auto',{enabled:!state.value?.autoEnabled});
 if(!result.ok)$('#detail').textContent=result.error||'No se pudo cambiar el estado.';
 await paint();
});
$('#openDashboard').addEventListener('click',async()=>{
 $('#openDashboard').disabled=true;
 const result=await call('harmonia:open-dashboard');
 if(!result.ok)$('#detail').textContent=result.error||'No se pudo abrir el panel completo.';
 $('#openDashboard').disabled=false;
});
void paint();
