/* Harmonia region policy. CommonJS for node:test; global for MV3 importScripts. */
(function(root,factory){
  const api=factory();
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
  root.HarmoniaRegionPolicy=api;
})(globalThis,function(){
  'use strict';
  const POLICY_VERSION='1.0.0';
  const KNOWN_REGIONS=Object.freeze({
    conversation:{label:'Conversación',catalogKey:'main-chat',completionSupported:true,minDistinctSurfaces:5,minSessions:2},
    home:{label:'Inicio',catalogKey:null,completionSupported:false,minDistinctSurfaces:0,minSessions:0},
    project:{label:'Proyectos',catalogKey:null,completionSupported:false,minDistinctSurfaces:0,minSessions:0},
    gpt:{label:'GPTs',catalogKey:null,completionSupported:false,minDistinctSurfaces:0,minSessions:0},
    search:{label:'Búsqueda',catalogKey:null,completionSupported:false,minDistinctSurfaces:0,minSessions:0},
    share:{label:'Compartido',catalogKey:null,completionSupported:false,minDistinctSurfaces:0,minSessions:0},
    other:{label:'Otra ruta',catalogKey:null,completionSupported:false,minDistinctSurfaces:0,minSessions:0}
  });
  function classifyRegion(rawUrl){
    let url;
    try{url=new URL(String(rawUrl||''));}catch{return 'other';}
    if(url.protocol!=='https:'||url.hostname!=='chatgpt.com')return 'other';
    const path=url.pathname.replace(/\\/+$/,'')||'/';
    if(/^\\/c\\/[^/]+(?:\\/|$)/i.test(path))return 'conversation';
    if(/^\\/g\\/[^/]+(?:\\/|$)/i.test(path))return 'gpt';
    if(/^\\/projects?(?:\\/|$)/i.test(path))return 'project';
    if(/^\\/search(?:\\/|$)/i.test(path)||url.searchParams.has('q'))return 'search';
    if(/^\\/share(?:\\/|$)/i.test(path)||/^\\/s\\//i.test(path))return 'share';
    if(path==='/')return 'home';
    return 'other';
  }
  function getRegionDescriptor(key){
    const item=KNOWN_REGIONS[String(key||'')]||KNOWN_REGIONS.other;
    return {key:KNOWN_REGIONS[String(key||'')]?String(key):'other',label:item.label,catalogKey:item.catalogKey,
      completionSupported:item.completionSupported,minDistinctSurfaces:item.minDistinctSurfaces,minSessions:item.minSessions,
      policyVersion:POLICY_VERSION};
  }
  function evaluateExploration(regionState,requiredFeatureIds,options={}){
    const required=[...new Set((requiredFeatureIds||[]).filter(x=>typeof x==='string'&&x))].sort();
    const descriptor=getRegionDescriptor(options.regionKey||regionState?.regionKey);
    if(!descriptor.completionSupported||required.length===0){
      return {status:'unmapped',complete:false,policyVersion:POLICY_VERSION,requiredCount:required.length,
        observedCount:0,missingFeatureIds:required,distinctSurfaceCount:0,sessionCount:0,
        reason:'Esta región todavía no tiene un catálogo de exploración con criterios verificables.'};
    }
    const observed=new Set((regionState?.observedFeatureIds||[]).filter(x=>typeof x==='string'));
    const missing=required.filter(x=>!observed.has(x));
    const surfaces=new Set((regionState?.surfaceFingerprints||[]).filter(x=>typeof x==='string'));
    const sessions=new Set((regionState?.sessionIds||[]).filter(x=>typeof x==='string'));
    const enoughSurfaces=surfaces.size>=descriptor.minDistinctSurfaces;
    const enoughSessions=sessions.size>=descriptor.minSessions;
    const complete=missing.length===0&&enoughSurfaces&&enoughSessions;
    const reasons=[];
    if(missing.length)reasons.push('faltan '+missing.length+' capacidades por observar');
    if(!enoughSurfaces)reasons.push('faltan '+(descriptor.minDistinctSurfaces-surfaces.size)+' variantes estructurales');
    if(!enoughSessions)reasons.push('faltan '+(descriptor.minSessions-sessions.size)+' sesiones distintas');
    return {status:complete?'complete':'exploring',complete,policyVersion:POLICY_VERSION,requiredCount:required.length,
      observedCount:required.length-missing.length,missingFeatureIds:missing,distinctSurfaceCount:surfaces.size,
      sessionCount:sessions.size,reason:complete?'Todas las capacidades del catálogo del ámbito fueron observadas en varias superficies y sesiones.':reasons.join('; ')};
  }
  function chooseLeader(tabs,currentLeaderId,preferredTabId){
    const candidates=(tabs||[]).filter(t=>Number.isInteger(t?.id));
    if(!candidates.length)return null;
    const existing=candidates.find(t=>t.id===currentLeaderId);
    if(existing)return existing.id;
    const active=candidates.find(t=>t.active===true);
    if(active)return active.id;
    const preferred=candidates.find(t=>t.id===preferredTabId);
    if(preferred)return preferred.id;
    return candidates.slice().sort((a,b)=>a.id-b.id)[0].id;
  }
  function canObserve(regionStatus,isLeader){
    return regionStatus!=='complete'||!!isLeader;
  }
  return {POLICY_VERSION,KNOWN_REGIONS,classifyRegion,getRegionDescriptor,evaluateExploration,chooseLeader,canObserve};
});
