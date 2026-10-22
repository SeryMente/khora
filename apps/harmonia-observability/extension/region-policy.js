/* Harmonia region policy. CommonJS for tests and global for the MV3 service worker. */
(function(root,factory){
  const api=factory();
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
  root.HarmoniaRegionPolicy=api;
})(globalThis,function(){
  'use strict';
  const POLICY_VERSION='1.0.0';
  const REGIONS={
    conversation:{label:'Conversación',catalogKey:'main-chat',completionSupported:true,minDistinctSurfaces:5,minSessions:2},
    home:{label:'Inicio',catalogKey:null,completionSupported:false,minDistinctSurfaces:0,minSessions:0},
    project:{label:'Proyectos',catalogKey:null,completionSupported:false,minDistinctSurfaces:0,minSessions:0},
    gpt:{label:'GPTs',catalogKey:null,completionSupported:false,minDistinctSurfaces:0,minSessions:0},
    search:{label:'Búsqueda',catalogKey:null,completionSupported:false,minDistinctSurfaces:0,minSessions:0},
    share:{label:'Compartido',catalogKey:null,completionSupported:false,minDistinctSurfaces:0,minSessions:0},
    other:{label:'Otra ruta',catalogKey:null,completionSupported:false,minDistinctSurfaces:0,minSessions:0}
  };
  function classifyRegion(rawUrl){
    let url;
    try{url=new URL(String(rawUrl||''));}catch{return 'other';}
    if(url.protocol!=='https:'||url.hostname!=='chatgpt.com')return 'other';
    let path=url.pathname||'/';
    while(path.length>1&&path.endsWith('/'))path=path.slice(0,-1);
    const seg=path.split('/').filter(Boolean);
    if(seg[0]==='c'&&seg.length>=2)return 'conversation';
    if(seg[0]==='g'&&seg.length>=2)return 'gpt';
    if((seg[0]==='project'||seg[0]==='projects'))return 'project';
    if(seg[0]==='search'||url.searchParams.has('q'))return 'search';
    if(seg[0]==='share'||(seg[0]==='s'&&seg.length>=2))return 'share';
    if(path==='/')return 'home';
    return 'other';
  }
  function getRegionDescriptor(key){
    const safeKey=Object.prototype.hasOwnProperty.call(REGIONS,String(key||''))?String(key):'other';
    const r=REGIONS[safeKey];
    return {key:safeKey,label:r.label,catalogKey:r.catalogKey,completionSupported:r.completionSupported,
      minDistinctSurfaces:r.minDistinctSurfaces,minSessions:r.minSessions,policyVersion:POLICY_VERSION};
  }
  function evaluateExploration(regionState,requiredFeatureIds,options){
    options=options||{};
    const required=Array.from(new Set((requiredFeatureIds||[]).filter(x=>typeof x==='string'&&x))).sort();
    const key=options.regionKey||regionState&&regionState.regionKey;
    const descriptor=getRegionDescriptor(key);
    if(!descriptor.completionSupported||required.length===0){
      return {status:'unmapped',complete:false,policyVersion:POLICY_VERSION,requiredCount:required.length,
        observedCount:0,missingFeatureIds:required,distinctSurfaceCount:0,sessionCount:0,
        reason:'Esta región todavía no tiene un catálogo de exploración con criterios verificables.'};
    }
    const observed=new Set((regionState&&regionState.observedFeatureIds||[]).filter(x=>typeof x==='string'));
    const missing=required.filter(x=>!observed.has(x));
    const surfaces=new Set((regionState&&regionState.surfaceFingerprints||[]).filter(x=>typeof x==='string'));
    const sessions=new Set((regionState&&regionState.sessionIds||[]).filter(x=>typeof x==='string'));
    const enoughSurfaces=surfaces.size>=descriptor.minDistinctSurfaces;
    const enoughSessions=sessions.size>=descriptor.minSessions;
    const complete=missing.length===0&&enoughSurfaces&&enoughSessions;
    const reasons=[];
    if(missing.length)reasons.push('faltan '+missing.length+' capacidades por observar');
    if(!enoughSurfaces)reasons.push('faltan '+(descriptor.minDistinctSurfaces-surfaces.size)+' variantes estructurales');
    if(!enoughSessions)reasons.push('faltan '+(descriptor.minSessions-sessions.size)+' sesiones distintas');
    return {status:complete?'complete':'exploring',complete:complete,policyVersion:POLICY_VERSION,
      requiredCount:required.length,observedCount:required.length-missing.length,missingFeatureIds:missing,
      distinctSurfaceCount:surfaces.size,sessionCount:sessions.size,
      reason:complete?'Todas las capacidades del catálogo del ámbito fueron observadas en varias superficies y sesiones.':reasons.join('; ')};
  }
  function chooseLeader(tabs,currentLeaderId,preferredTabId){
    const candidates=(tabs||[]).filter(t=>Number.isInteger(t&&t.id));
    if(!candidates.length)return null;
    const existing=candidates.find(t=>t.id===currentLeaderId);
    if(existing)return existing.id;
    const active=candidates.find(t=>t.active===true);
    if(active)return active.id;
    const preferred=candidates.find(t=>t.id===preferredTabId);
    if(preferred)return preferred.id;
    return candidates.slice().sort((a,b)=>a.id-b.id)[0].id;
  }
  function canObserve(regionStatus,isLeader){return regionStatus!=='complete'||!!isLeader;}
  function canObserveEvent(regionStatus,isLeader,eventType){
    if(['ui.surface.scan','ui.surface.reused'].includes(String(eventType||'')))return canObserve(regionStatus,isLeader);
    return ['conversation.visible.delta','console.observed','capture.started','capture.stopped'].includes(String(eventType||''));
  }
  return {POLICY_VERSION,REGIONS,classifyRegion,getRegionDescriptor,evaluateExploration,chooseLeader,canObserve,canObserveEvent};
});
