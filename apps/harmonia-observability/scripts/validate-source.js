'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const read=rel=>fs.readFileSync(path.join(root,rel),'utf8');
const json=rel=>JSON.parse(read(rel));
const manifest=json('extension/manifest.json');
const build=json('extension/build-info.json');
const catalog=json('coverage-catalog.json');
const mirror=json('extension/coverage-catalog.json');
const content=read('extension/content.js');
const worker=read('extension/service-worker.js');
const collector=read('collector/server.js');
const popup=read('extension/popup.html');
const popupJs=read('extension/popup.js');
const dashboard=read('extension/dashboard.html');
const dashboardJs=read('extension/dashboard.js');
const startScript=read('INICIAR-HARMONIA-HEADLESS.ps1');
const stopScript=read('DETENER-HARMONIA-HEADLESS.ps1');
const finalizeScript=read('FINALIZAR-PAQUETE.ps1');
const queryScript=read('collector/query.ps1');
assert.equal(manifest.manifest_version,3);
assert.equal(manifest.version,'0.4.1');
assert.deepEqual(manifest.icons,{'16':'icons/icon16.png','48':'icons/icon48.png','128':'icons/icon128.png'});
assert.deepEqual(manifest.action.default_icon,manifest.icons);
for(const icon of Object.values(manifest.icons))assert.ok(fs.statSync(path.join(root,'extension',icon)).isFile(),'missing Khora icon: '+icon);
assert.ok(!manifest.permissions.includes('debugger'),'debugger permission must remain absent');
assert.ok(manifest.host_permissions.includes('https://chatgpt.com/*'));
assert.ok(manifest.content_scripts.some(x=>x.matches.includes('https://chatgpt.com/*')&&x.run_at==='document_idle'&&x.js.includes('region-policy.js')&&x.js.includes('content.js')));
assert.deepEqual(catalog,mirror,'the root and extension catalogs must be byte-equivalent JSON objects');
assert.equal(build.schema,'harmonia.repository-build.v1');
assert.equal(build.version,manifest.version);
assert.equal(build.catalogVersion,catalog.version);
assert.equal(build.regionPolicyVersion,'1.0.0');
assert.match(build.sourceRevision,/^[0-9a-f]{40}$/);
for(const rel of ['extension/dashboard.html','extension/dashboard.css','extension/dashboard.js','extension/dashboard-model.js','extension/region-policy.js','extension/build-info.json','tests/region-policy.test.js','tests/collector.integration.test.js','tests/dashboard-model.test.js']){
 assert.ok(fs.statSync(path.join(root,rel)).isFile(),'missing required source file: '+rel);
}
assert.match(content,/\$\$\('\[data-message-author-role="user"\],\[data-message-author-role="assistant"\]'/);
assert.match(content,/\.innerText\b/,'visible message text is captured only from rendered message nodes');
assert.match(content,/conversation\.visible\.delta/);
assert.match(content,/characterData:\s*true/);
assert.match(content,/MAX_MESSAGE_CHARS=2000000/);
assert.match(content,/MESSAGE_CHUNK_CHARS=80000/);
assert.doesNotMatch(content,/\b(?:outerHTML|innerHTML)\b/);
assert.doesNotMatch(content,/\.textContent\b/);
assert.doesNotMatch(content,/(?:el|comp|composer|input|textarea|select)\.value\b/,'draft and form values must not be read');
assert.match(content,/hiddenReasoningCaptured:false/);
assert.match(worker,/importScripts\('region-policy\.js'\)/);
assert.match(worker,/harmonia:open-dashboard/);
assert.match(worker,/consoleValuesRedacted:true/);
assert.match(worker,/await canObserveTab\(tab\)\)\)return false/);
assert.match(worker,/canObserveEvent\(regionStatus\(regionKey\),isStructuralObserver,type\)/);
assert.match(worker,/harmonia:standby-structure/);
assert.match(content,/structureStandby/);
assert.match(content,/harmonia:standby-structure/);
assert.match(content,/if\(!H\.structureStandby\)scheduleScan\(\)/);
assert.match(collector,/sanitizeVisibleDelta/);
assert.match(collector,/sanitizeConsoleEvent/);
assert.match(collector,/previous\.regions\[regionKey\]=region/);
assert.match(collector,/regionExploration:index\.coverage/);
assert.match(collector,/hiddenReasoningCaptured:false/);
assert.match(popup,/id="openDashboard"/);
assert.match(popupJs,/harmonia:open-dashboard/);
assert.match(dashboard,/id="regionRows"/);
assert.match(dashboard,/id="documentationValue"/);
assert.match(dashboard,/id="observationValue"/);
assert.match(dashboard,/id="lastScanValue"/);
assert.match(dashboard,/id="repoPersistValue"/);
assert.match(dashboard,/dashboard-model\.js/);
assert.match(dashboard,/La escritura remota de eventos no está implementada/i);
assert.match(dashboard,/no tienen todavía medición regional independiente/i);
assert.doesNotMatch(dashboard,/id="syncNow"|metrics-guide|metricsGuideTitle/);
assert.match(dashboardJs,/HarmoniaDashboardModel\.summarize/);
assert.match(worker,/collectorHealth:collectorHealth/);
assert.match(worker,/chrome\.action\.setBadgeText/);
assert.match(worker,/chrome\.action\.setBadgeBackgroundColor/);
assert.match(worker,/harmonia:area-health/);
assert.match(worker,/DEV_RELOAD_ALARM/);
assert.match(worker,/HEALTH_ALARM/);
assert.match(worker,/chrome\.alarms\.create\(HEALTH_ALARM/);
assert.match(worker,/if\(alarm\.name===HEALTH_ALARM\)void checkHealth\(\)/);
assert.match(worker,/chrome\.runtime\.reload\(\)/);
assert.match(worker,/harmonia:tab-indicator/);
assert.match(worker,/harmonia:stop/);
assert.ok(worker.includes("version:'0.4.1'"));
assert.match(content,/harmonia-observation-indicator/);
assert.match(content,/setTabIndicator\('observing'\)/);
assert.match(content,/harmonia:configure/);
assert.match(collector,/fs\.watch\(extensionRoot,\{recursive:true\}/);
assert.match(collector,/req\.url==='\/dev-version'/);
assert.match(startScript,/HARMONIA_DEV_RELOAD/);
assert.match(finalizeScript,/DEV_RELOAD=WATCHING/);
const dashboardModel=read('extension/dashboard-model.js');
assert.match(dashboardModel,/Nunca · escritura remota no implementada/);
assert.match(dashboardModel,/No existe un catálogo regional verificable/);
assert.match(dashboardJs,/setInterval\(\(\)=>void refresh\(\),5000\)/);
assert.match(dashboardJs,/document\.hidden/);

assert.match(collector,/HARMONIA_DATA is required/,'collector must fail closed when the data root is absent');
assert.ok(!collector.toLowerCase().includes('fila4'),'collector must not hardcode a Windows profile');
for(const [name,script] of [['start',startScript],['stop',stopScript],['finalize',finalizeScript]]){
 assert.match(script,/Win32_UserProfile/,'lifecycle '+name+' must resolve the Windows profile by SID');
 assert.match(script,/WindowsIdentity/,'lifecycle '+name+' must use the active Windows SID');
 assert.ok(!script.toLowerCase().includes('fila4'),'lifecycle '+name+' must not hardcode a user profile');
 assert.match(script,/Join-Path \$root 'logs'/,'lifecycle '+name+' must keep logs inside the package');
}
assert.match(queryScript,/\[string\]\$DataRoot/);
assert.match(queryScript,/Win32_UserProfile/);
assert.ok(queryScript.includes('Join-Path $windowsProfile.LocalPath'),'query must resolve data root from the current Windows profile');
assert.ok(queryScript.includes('surface-index-v0.4.0'),'query must use the v0.4.0 data store');
assert.ok(!queryScript.toLowerCase().includes('fila4'),'query must not hardcode a user profile');
assert.match(startScript,/PREPARAR-RUNTIME\.ps1/,'startup must provision the pinned portable runtime');
assert.match(startScript,/v22\.23\.4/);
assert.match(finalizeScript,/PREPARAR-RUNTIME\.ps1/);
assert.match(finalizeScript,/LOGS_ROOT/);

console.log('HARMONIA_SOURCE_CONTRACT_OK');
console.log(JSON.stringify({
 version:manifest.version,
 catalogVersion:catalog.version,
 requiredFeatures:catalog.features.filter(x=>x.scope!=='out').length,
 regionPolicyVersion:build.regionPolicyVersion,
 sourceRevision:build.sourceRevision,
 automaticTabs:build.captureContract.automaticOnChatGptTabOpen&&build.captureContract.multipleTabs,
 visibleMessages:build.captureContract.visibleUserAndAssistantMessages,
 partialUpdates:build.captureContract.partialAndFinalMessageUpdates,
 consoleRedaction:build.captureContract.pageConsoleWithHeuristicRedaction,
 popupEssential:build.ui.compactPopup,
 dashboardTab:build.ui.dedicatedDashboardTab
},null,2));
