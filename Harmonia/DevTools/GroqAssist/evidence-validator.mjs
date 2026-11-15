const SIGNAL_IDS=Object.freeze(['aria-busy','data-is-streaming','stop-control','agent-progress']);
const TOP_LEVEL_KEYS=Object.freeze(['schema','contractVersion','extension','observation','queue','activity','coverage','observer']);
const SECTION_KEYS=Object.freeze({
 extension:['version','frameworkRevision'],
 observation:['enabled','active','activeTabCount','collectorAvailable'],
 queue:['persistedEventCount','pendingEventCount','pendingBytes'],
 activity:['totalCount','activeStates','inactiveStates','transitions','lastState','lastTransition'],
 coverage:['scanCount','uniqueSurfaceCount','observedFeatureCount','featureCount','observedPercent'],
 observer:[
  'queriedTabCount','reportingTabCount','snapshotCount','mainFoundCount','rootPresentInstances',
  'userMessageNodesLastSnapshot','assistantMessageNodesLastSnapshot','activityInstances',
  'reconcileCount','activitySnapshots','activityTransitions','activeTransitions','inactiveTransitions',
  'eventSinkAttempts','eventSinkAccepted','eventSinkRejected','eventSinkErrors',
  'visibleSignalCount','matchingSignalCount','observedSignalIds','signalPresenceTotals'
 ]
});
const TRANSITIONS=Object.freeze(['INITIALIZED','ACTIVATED','DEACTIVATED']);
const SIGNAL_COUNT_KEYS=Object.freeze(['matchingCount','excludedCount','visibleCount']);
const MAX_COUNT=1_000_000;
function fail(code){throw new TypeError(code);}
function isPlainObject(value){if(!value||typeof value!=='object'||Array.isArray(value))return false;const p=Object.getPrototypeOf(value);return p===Object.prototype||p===null;}
function exactKeys(value,expected){
 if(!isPlainObject(value))fail('evidence_object_invalid');
 const actual=Object.keys(value).sort(),wanted=[...expected].sort();
 if(actual.length!==wanted.length||actual.some((key,index)=>key!==wanted[index]))fail('evidence_fields_invalid');
}
function count(value){if(!Number.isSafeInteger(value)||value<0||value>MAX_COUNT)fail('evidence_count_invalid');}
function boolean(value){if(typeof value!=='boolean')fail('evidence_boolean_invalid');}
function version(value,maxLength,code){if(typeof value!=='string'||value.length<1||value.length>maxLength||!/^[0-9A-Za-z.+_-]+$/.test(value))fail(code);}
function validTimestamp(value){
 if(value===null)return;
 if(typeof value!=='string'||!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?Z$/.test(value))fail('evidence_timestamp_invalid');
 const parsed=Date.parse(value);
 if(!Number.isFinite(parsed)||new Date(parsed).toISOString()!==value)fail('evidence_timestamp_invalid');
}
function countFields(section,keys){for(const key of keys)count(section[key]);}

export function validateEvidenceEnvelope(envelope){
 exactKeys(envelope,TOP_LEVEL_KEYS);
 if(envelope.schema!=='harmonia.dev-triage-input.v2'||envelope.contractVersion!=='2.0')fail('evidence_schema_invalid');
 for(const [name,keys] of Object.entries(SECTION_KEYS))exactKeys(envelope[name],keys);
 version(envelope.extension.version,64,'evidence_version_invalid');
 version(envelope.extension.frameworkRevision,96,'evidence_version_invalid');
 boolean(envelope.observation.enabled);boolean(envelope.observation.active);boolean(envelope.observation.collectorAvailable);
 countFields(envelope.observation,['activeTabCount']);
 countFields(envelope.queue,['persistedEventCount','pendingEventCount','pendingBytes']);

 const activity=envelope.activity;
 countFields(activity,['totalCount','activeStates','inactiveStates']);
 if(!isPlainObject(activity.transitions))fail('evidence_activity_transitions_invalid');
 exactKeys(activity.transitions,TRANSITIONS);
 countFields(activity.transitions,TRANSITIONS);
 if(activity.activeStates+activity.inactiveStates!==activity.totalCount)fail('evidence_activity_state_totals_invalid');
 if(TRANSITIONS.reduce((sum,key)=>sum+activity.transitions[key],0)!==activity.totalCount)fail('evidence_activity_transition_totals_invalid');
 if(activity.lastState!==null&&!['ACTIVE','INACTIVE'].includes(activity.lastState))fail('evidence_activity_last_state_invalid');
 if(activity.lastTransition!==null&&!TRANSITIONS.includes(activity.lastTransition))fail('evidence_activity_last_transition_invalid');

 const coverage=envelope.coverage;
 countFields(coverage,['scanCount','uniqueSurfaceCount','observedFeatureCount','featureCount']);
 if(typeof coverage.observedPercent!=='number'||!Number.isFinite(coverage.observedPercent)||coverage.observedPercent<0||coverage.observedPercent>100)fail('evidence_percentage_invalid');

 const observer=envelope.observer;
 const observerCountKeys=SECTION_KEYS.observer.filter(key=>!['observedSignalIds','signalPresenceTotals'].includes(key));
 countFields(observer,observerCountKeys);
 if(!Array.isArray(observer.observedSignalIds)||observer.observedSignalIds.length>SIGNAL_IDS.length||
  new Set(observer.observedSignalIds).size!==observer.observedSignalIds.length||
  observer.observedSignalIds.some(id=>!SIGNAL_IDS.includes(id)))fail('evidence_signal_ids_invalid');
 exactKeys(observer.signalPresenceTotals,SIGNAL_IDS);
 let matchingTotal=0,visibleTotal=0;
 for(const signalId of SIGNAL_IDS){
  const signal=observer.signalPresenceTotals[signalId];
  exactKeys(signal,SIGNAL_COUNT_KEYS);
  count(signal.matchingCount);count(signal.excludedCount);count(signal.visibleCount);
  if(signal.visibleCount>signal.matchingCount||signal.excludedCount>signal.matchingCount)fail('evidence_signal_counts_invalid');
  matchingTotal+=signal.matchingCount;visibleTotal+=signal.visibleCount;
 }
 if(matchingTotal!==observer.matchingSignalCount||visibleTotal!==observer.visibleSignalCount)fail('evidence_signal_aggregate_invalid');

 if(observer.reportingTabCount>observer.queriedTabCount||
  observer.rootPresentInstances>observer.reportingTabCount||
  observer.activityInstances>observer.reportingTabCount||
  observer.mainFoundCount>observer.snapshotCount||
  observer.activityTransitions!==observer.activeTransitions+observer.inactiveTransitions||
  observer.eventSinkAccepted+observer.eventSinkRejected+observer.eventSinkErrors>observer.eventSinkAttempts||
  coverage.observedFeatureCount>coverage.featureCount)fail('evidence_relationship_invalid');
 return structuredClone(envelope);
}
export function isEvidenceSufficient(envelope){
 const valid=validateEvidenceEnvelope(envelope);
 return valid.observer.reportingTabCount>0&&valid.observer.snapshotCount>0;
}
