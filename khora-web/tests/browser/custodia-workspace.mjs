/** Actual IngresoWorkspace in a local Next server, synthetic APIs, real Chromium/IndexedDB.
 * KHORA_TEST_URL=http://127.0.0.1:3147 node tests/browser/custodia-workspace.mjs
 * Never point this test at a public/production host.
 */
import assert from 'node:assert/strict';
import { chromium } from 'playwright';
const origin=new URL(process.env.KHORA_TEST_URL||'http://127.0.0.1:3147');
if(!['127.0.0.1','localhost'].includes(origin.hostname))throw Error('Local test hosts only');
const browser=await chromium.launch({headless:true});let checks=0;let page;
try{
 const ctx=await browser.newContext();page=await ctx.newPage();let latest=null,posts=0,offline=false;const errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 await ctx.route('**/api/**',async route=>{const req=route.request(),u=new URL(req.url());
  if(u.pathname==='/api/dictado/checkpoint'){
   if(req.method()==='POST'){posts++;if(offline)return route.abort('internetdisconnected');latest=req.postDataJSON();return route.fulfill({json:{ok:true,sessionId:latest.sessionId,revisionId:latest.revisionId}});}
   return route.fulfill({json:{owner:'synthetic@example.com',recovery:latest,sealed:false}});
  }
  if(u.pathname==='/api/dictado-experience')return route.fulfill({json:{records:[],summary:{},profileKey:'synthetic',truncated:false,retentionDays:30}});
  if(u.pathname==='/api/auth/session')return route.fulfill({json:{user:{email:'synthetic@example.com'},expires:'2099-01-01'}});
  return route.fulfill({json:{ok:true,items:[],servicios:[],events:[]}});
 });
 await page.goto(new URL('/sistema/ingreso',origin).href,{waitUntil:'networkidle'});
 const field=page.locator('[data-ui-id="ingreso.textarea"]');await field.waitFor({timeout:90000});
 await page.getByText('Salvaguarda preparada',{exact:false}).waitFor({timeout:15000});
 const text='Texto manual íntegro — áéíóú 😀\n  Segunda línea.';await field.fill(text);
 await page.waitForFunction(()=>document.body.innerText.includes('Checkpoint confirmado en el servidor'),null,{timeout:15000});
 assert.equal(latest.texto,text);assert.ok(posts>0);checks++;
 await page.reload({waitUntil:'networkidle'});await field.waitFor();await page.waitForFunction(t=>document.querySelector('[data-ui-id="ingreso.textarea"]')?.value===t,text,{timeout:20000});checks++;
 offline=true;const pending=text+'\nSin red, no archivar.';await field.fill(pending);
 await page.waitForFunction(()=>document.body.innerText.includes('Sin confirmación remota'),null,{timeout:20000});
 const plaintext=await page.evaluate(async()=>{const db=await new Promise((ok,no)=>{const q=indexedDB.open('khora-custodia-v1');q.onsuccess=()=>ok(q.result);q.onerror=()=>no(q.error);});try{return await new Promise((ok,no)=>{const q=db.transaction('records').objectStore('records').getAll();q.onsuccess=()=>ok(JSON.stringify(q.result));q.onerror=()=>no(q.error);});}finally{db.close();}});
 assert.ok(!plaintext.includes(pending));checks++;
 await page.reload({waitUntil:'networkidle'});await field.waitFor();await page.waitForFunction(t=>document.querySelector('[data-ui-id="ingreso.textarea"]')?.value===t,pending,{timeout:20000});checks++;
 offline=false;await page.evaluate(()=>window.dispatchEvent(new Event('online')));await page.waitForFunction(()=>document.body.innerText.includes('Checkpoint confirmado en el servidor'),null,{timeout:20000});assert.equal(latest.texto,pending);checks++;
 assert.equal(errors.length,0,errors.join('\n'));checks++;
 console.log(JSON.stringify({status:'PASS',checks,actualIngresoWorkspace:true,realIndexedDB:true,syntheticAPIs:true,productionServices:false}));await ctx.close();
}catch(error){if(page)console.error('PAGE_DIAGNOSTIC='+JSON.stringify({url:page.url(),body:(await page.locator('body').innerText()).slice(-4000)}));throw error;}finally{await browser.close();}
