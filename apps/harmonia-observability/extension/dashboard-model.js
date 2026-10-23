(function(root,factory){
  const api=factory();
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
  root.HarmoniaDashboardModel=api;
})(globalThis,function(){
  'use strict';
  const POLICY_VERSION='1.0.0';
  const ROUTES=[
    {key:'home',label:'Inicio',supportsCompletion:false},
    {key:'conversation',label:'Conversación',supportsCompletion:true},
    {key:'project',label:'Proyectos',supportsCompletion:false},
    {key:'gpt',label:'GPTs',supportsCompletion:false},
    {key:'search',label:'Búsqueda',supportsCompletion:false},
    {key:'share',label:'Vistas compartidas',supportsCompletion:false},
    {key:'other',label:'Otras rutas',supportsCompletion:false}
  ];
  const TRANSVERSAL=[
    {key:'navigation',label:'Navegación y panel lateral',reason:'No instrumentado por separado en esta versión.'},
    {key:'menus',label:'Menús, popovers y diálogos',reason:'No instrumentado por separado; solo cuenta evidencia natural clasificada.'}
  ];
  function weight(feature){return feature&&feature.priority==='core'?2:1;}
  function score(ids,features){
    const set=new Set(Array.isArray(ids)?ids:[]);
    const total=features.reduce((n,f)=>n+weight(f),0);
    const covered=features.filter(f=>set.has(f.id));
    const points=covered.reduce((n,f)=>n+weight(f),0);
    return {percent:total?Math.round(100*points/total):null,covered:covered.length,total:features.length,points,totalPoints:total};
  }
  function catalogMetrics(catalog,coverage){
    const features=Array.isArray(catalog&&catalog.features)?catalog.features.filter(f=>f.scope!=='out'):[];
    const docSourceIds=new Set((Array.isArray(catalog&&catalog.sources)?catalog.sources:[]).filter(s=>s.verificationStatus==='content-read').map(s=>s.id));
    const documentedIds=features.filter(f=>Array.isArray(f.docs)&&f.docs.some(id=>docSourceIds.has(id))).map(f=>f.id);
    const documentation=score(documentedIds,features);
    const scanCount=Math.max(0,Number(coverage&&coverage.scanCount)||0);
    const versionMatches=!coverage||(scanCount===0&&!coverage.catalogVersion)||coverage.catalogVersion===catalog.version;
    const observedIds=Array.isArray(coverage&&coverage.observedFeatureIds)?coverage.observedFeatureIds:[];
    const observation=versionMatches?score(observedIds,features):{percent:null,covered:0,total:features.length,points:0,totalPoints:features.reduce((n,f)=>n+weight(f),0)};
    return {featureCount:features.length,catalogVersion:catalog&&catalog.version||null,documentation,observation,scanCount,versionMatches};
  }
  function regionRows(input){
    input=input||{};const catalog=input.catalog||{};const coverage=input.coverage||{};const regionCoverage=input.regionCoverage||coverage.regions||{};
    const features=Array.isArray(catalog.features)?catalog.features.filter(f=>f.scope!=='out'):[];
    const rows=[];
    for(const def of ROUTES){
      const r=regionCoverage[def.key]||null;const scanCount=Math.max(0,Number(r&&r.scanCount)||0);
      const surfaceSet=new Set((r&&Array.isArray(r.surfaceFingerprints)?r.surfaceFingerprints:[]));
      const surfaceCount=Math.max(surfaceSet.size,Number(r&&r.distinctSurfaceCount)||0);
      const sessionSet=new Set((r&&Array.isArray(r.sessionIds)?r.sessionIds:[]));
      const sessionCount=Math.max(sessionSet.size,Number(r&&r.sessionCount)||0);
      const lastScanAt=r&&(r.lastScanAt||r.updatedAt)||null;
      if(!def.supportsCompletion){
        rows.push({key:def.key,label:def.label,kind:'route',percent:null,observed:null,required:null,state:scanCount>0?'unmapped':'none',stateLabel:scanCount>0?'Explorada · sin catálogo':'Pendiente · sin catálogo',evidence:scanCount>0?(scanCount+' barridos · '+surfaceCount+' huellas · '+sessionCount+' sesiones'):'No hay evidencia natural persistida',lastScanAt,usable:false,usageLabel:'NO USAR',reason:'No existe un catálogo regional verificable; no se calcula un porcentaje.'});continue;
      }
      const policyMatches=!r||r.policyVersion===POLICY_VERSION;
      const catalogMatches=!r||(r.catalogVersion===catalog.version&&(!r.requiredCatalogVersion||r.requiredCatalogVersion===catalog.version));
      if(!features.length||!policyMatches||!catalogMatches){
        rows.push({key:def.key,label:def.label,kind:'route',percent:null,observed:null,required:features.length,state:'stale',stateLabel:'Versión incompatible',evidence:'La evidencia no coincide con el catálogo/política vigente',lastScanAt,usable:false,usageLabel:'NO USAR',reason:'La completitud debe invalidarse al cambiar el catálogo o la política.'});continue;
      }
      const ids=new Set(r&&Array.isArray(r.observedFeatureIds)?r.observedFeatureIds:[]);
      const observed=features.filter(f=>ids.has(f.id)).length;const required=features.length;const percent=required?Math.round(100*observed/required):null;
      const enoughSurfaces=surfaceCount>=5,enoughSessions=sessionCount>=2;const scanEvidence=scanCount>0&&surfaceCount>0&&sessionCount>0;
      const complete=!!(r&&r.status==='complete'&&r.complete===true&&observed===required&&enoughSurfaces&&enoughSessions);
      let state='exploring',stateLabel='En exploración',reason='Faltan capacidades o evidencia mínima para aceptar la región.';
      if(!scanEvidence){state='none';stateLabel='Sin observación real';reason='Todavía no hay un barrido de interfaz persistido para esta región.';}
      else if(complete){state='complete';stateLabel='Completa';reason='Catálogo, diversidad estructural, sesiones y versiones coinciden.';}
      else if(percent===100&&(!enoughSurfaces||!enoughSessions)){state='exploring';stateLabel='Faltan pruebas de diversidad';reason='Faltan '+Math.max(0,5-surfaceCount)+' superficies y '+Math.max(0,2-sessionCount)+' sesiones mínimas.';}
      else if(r&&r.status==='unmapped'){state='stale';stateLabel='Sin criterio verificable';reason=r.reason||reason;}
      rows.push({key:def.key,label:def.label,kind:'route',percent,observed,required,state,stateLabel,evidence:observed+'/'+required+' capacidades · '+scanCount+' barridos · '+surfaceCount+'/5 superficies · '+sessionCount+'/2 sesiones',lastScanAt,usable:complete,usageLabel:complete?'LISTO PARA USO':'NO USAR',reason});
    }
    for(const def of TRANSVERSAL){rows.push({key:def.key,label:def.label,kind:'transversal',percent:null,observed:null,required:null,state:'unmapped',stateLabel:'No instrumentado',evidence:def.reason,lastScanAt:null,usable:false,usageLabel:'NO USAR',reason:def.reason});}
    return rows;
  }
  function timeLabel(value){if(!value)return 'Nunca';const date=new Date(value);return Number.isNaN(date.getTime())?'Fecha no válida':date.toLocaleString();}
  function summarize(state,catalog,now){
    state=state||{};const coverage=state.coverage||{};const metrics=catalogMetrics(catalog,coverage);const rows=regionRows({catalog,coverage,regionCoverage:state.regionCoverage});
    const lastScanAt=coverage.lastScanAt||rows.map(r=>r.lastScanAt).filter(Boolean).sort().slice(-1)[0]||null;
    return {version:state.version||'—',collector:!!state.collector,autoEnabled:state.autoEnabled!==false,activeTabs:Number(state.activeTabs)||0,eventCount:Number(state.events)||0,structuralObserverCount:Object.keys(state.regionLeaders||{}).length,catalogMetrics:metrics,regionRows:rows,readyRegionCount:rows.filter(r=>r.kind==='route'&&r.usable).length,exploredRegionCount:rows.filter(r=>r.kind==='route'&&r.state!=='none').length,lastScanAt,lastLocalIndexWriteAt:state.collectorHealth&&state.collectorHealth.updatedAt||null,remoteObservationPersistedAt:null,remoteObservationPersistenceLabel:'Nunca · escritura remota no implementada',lastRepositoryMetadataCheckAt:state.repositorySync&&state.repositorySync.checkedAt||null,repositorySyncStatus:state.repositorySync&&state.repositorySync.status||'Sin consulta de metadatos',catalogVersion:catalog&&catalog.version||coverage.catalogVersion||'—',policyVersion:(state.buildInfo&&state.buildInfo.regionPolicyVersion)||POLICY_VERSION,lastError:state.lastError||null,updatedAt:now||new Date().toISOString()};
  }
  return {POLICY_VERSION,ROUTES,TRANSVERSAL,score,catalogMetrics,regionRows,summarize,timeLabel};
});