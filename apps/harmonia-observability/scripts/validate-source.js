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
assert.equal(manifest.manifest_version,3);
assert.equal(manifest.version,'0.4.0');
assert.ok(!manifest.permissions.includes('debugger'),'debugger permission must remain absent');
assert.ok(manifest.host_permissions.includes('https://chatgpt.com/*'));
assert.ok(manifest.content_scripts.some(x=>x.matches.includes('https://chatgpt.com/*')&&x.run_at==='document_idle'&&x.js.includes('region-policy.js')&&x.js.includes('content.js')));
assert.deepEqual(catalog,mirror,'the root and extension catalogs must be byte-equivalent JSON objects');
assert.equal(build.schema,'harmonia.repository-build.v1');
assert.equal(build.version,manifest.version);
assert.equal(build.catalogVersion,catalog.version);
assert.equal(build.regionPolicyVersion,'1.0.0');
assert.match(build.sourceRevision,/^[0-9a-f]{40}$/);
for(const rel of ['extension/dashboard.html','extension/dashboard.css','extension/dashboard.js','extension/region-policy.js','extension/build-info.json','tests/region-policy.test.js','tests/collector.integration.test.js']){
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
assert.match(dashboard,/id="regions"/);
assert.match(dashboard,/id="metricsGuideTitle"/);
assert.match(dashboard,/<details>/);
assert.match(dashboard,/índice combinado[\s\S]*mapeo, no una precisión de captura/);
assert.match(dashboardJs,/setInterval\(\(\)=>void refresh\(\),5000\)/);
assert.match(dashboardJs,/document\.hidden/);
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
