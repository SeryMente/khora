import {chromium} from 'playwright';
import {createServer} from 'node:http';
import fs from 'node:fs';import assert from 'node:assert/strict';import * as esbuild from 'esbuild';
const dir=process.cwd(),d=dir+'/preview';
const css=fs.readFileSync(d+'/tailwind.css','utf8')+'\n'+fs.readFileSync(d+'/app.css','utf8');const js=fs.readFileSync(d+'/app.js','utf8').replaceAll('</script','<\\/script');
const html='<!doctype html><html lang="es"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Khora — Bóveda portable · revisión</title><style>'+css+'</style><body><aside class="preview-banner">VISTA PREVIA · sin credenciales ni archivos reales · no autoriza aperturas</aside><div id="root"></div><script>'+js+'</script></body></html>';
fs.writeFileSync(d+'/index.html',html);
for(const [n,q] of [['light','?tab=boveda-portable&theme=light'],['unavailable','?scenario=unavailable'],['overview','?overview=1']])fs.writeFileSync(d+'/'+n+'.html',html.replace('<div id="root">',`<script>history.replaceState({},'',location.pathname+${JSON.stringify(q)});</script><div id="root">`));
await esbuild.build({entryPoints:['repo/khora-web/tests/unit/portable_vault_ui.test.ts'],outfile:'preview/unit.cjs',bundle:true,platform:'node',format:'cjs'});
const server=createServer((req,res)=>{if(req.url==='/favicon.ico'){res.writeHead(204);return res.end();}res.setHeader('Content-Type','text/html; charset=utf-8');res.end(html);});await new Promise(r=>server.listen(0,'127.0.0.1',r));
const base='http://127.0.0.1:'+server.address().port;
const browser=await chromium.launch({executablePath:'/usr/local/bin/chromium',headless:true,args:['--no-sandbox']});
const checks=[],errors=[],network=[];
try{
 for(const width of [1440,390]) for(const theme of ['dark','light']){
  const page=await browser.newPage({viewport:{width,height:900},reducedMotion:'reduce'});page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>{if(!r.url().startsWith(base))network.push(r.url());});
  await page.goto(base+'/sistema/seguridad?tab=boveda-portable&theme='+theme);
  await page.locator('[data-ui-id="portable-vault.container"]').waitFor();
  assert.equal(await page.getByRole('heading',{level:1}).innerText(),'Bóveda portable');
  assert.equal(await page.getByRole('button',{name:'Registrar Ente Auth',exact:true}).isDisabled(),true);
  assert.equal(await page.getByRole('button',{name:'Descargar bóveda',exact:true}).isDisabled(),true);
  assert.equal(await page.locator('input').count(),0);
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  const tab=page.getByRole('tab',{name:'Bóveda portable',exact:true});assert.equal(await tab.getAttribute('aria-selected'),'true');
  if(width===390){const box=await tab.boundingBox();assert.ok(box.x>=0&&box.x+box.width<=390);}
  const summary=page.locator('summary');await summary.focus();await page.keyboard.press('Enter');assert.equal(await page.locator('details').getAttribute('open'),'');
  await page.keyboard.press('Enter');assert.equal(await page.locator('details').getAttribute('open'),null);
  await tab.focus();await page.keyboard.press('Home');await page.getByRole('heading',{name:'Seguridad',exact:true}).waitFor();
  await page.getByRole('button',{name:/Preparación pendiente Bóveda portable/}).click();await page.locator('[data-ui-id="portable-vault.container"]').waitFor();
  await tab.focus();await page.keyboard.press('ArrowRight');assert.equal(await page.getByRole('tab',{name:'Control MCP',exact:true}).getAttribute('aria-selected'),'true');
  await page.waitForFunction(()=>document.activeElement?.id==='security-tab-mcp');await page.keyboard.press('ArrowLeft');await page.locator('[data-ui-id="portable-vault.container"]').waitFor();
  await page.evaluate(()=>{history.replaceState({},'','?tab=no-existe');window.dispatchEvent(new PopStateEvent('popstate'));});await page.getByRole('heading',{name:'Seguridad',exact:true}).waitFor();
  checks.push({width,theme,checks:['deep-link','disabled-actions','no-inputs','no-page-overflow','active-tab-discoverable','keyboard-details','home','overview-card','arrows','invalid-tab-fallback'],result:'passed'});
  await page.close();
 }
 for(const width of [1440,390]){
  const p=await browser.newPage({viewport:{width,height:900}});p.on('pageerror',e=>errors.push(e.message));await p.goto(base+'/?scenario=unavailable');await p.getByRole('alert').waitFor();assert.equal(await p.locator('button:enabled').count(),0);assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);checks.push({width,state:'unavailable',result:'passed'});await p.close();
 }
 assert.deepEqual(errors,[]);assert.deepEqual(network,[]);
 fs.writeFileSync(dir+'/preview/browser-evidence.json',JSON.stringify({scope:'isolated real changed UI source; Next navigation and unchanged modules mocked only in preview; not production acceptance',checks,errors,externalRequests:network,backendVerified:false},null,2));console.log('BROWSER_QA='+JSON.stringify({configurations:checks.length,errors:errors.length,externalRequests:network.length,result:'passed'}));
}finally{await browser.close();server.close();}
