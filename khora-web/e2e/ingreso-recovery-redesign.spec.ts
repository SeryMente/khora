import {test,expect} from '@playwright/test';
const owner='recovery@example.invalid',session='30000000-0000-4000-8000-000000000001',revision='40000000-0000-4000-8000-000000000001';
const parts=[1,2].map(parte=>({parte,url:'https://synthetic.invalid/part-'+parte,bytes:2048,sha256:'a'.repeat(64),verificado:true,fuenteAudio:'microphone',start_ms:(parte-1)*5000,end_ms:parte*5000,duracion_ms:5000}));
const item={sessionId:session,revisionId:revision,savedAt:'2026-10-17T18:00:00Z',title:'Una idea que merece continuar',preview:'Texto conservado con su audio.',chars:32,duration:10,audioParts:2,paired:true,throughPart:2};
const snapshot={sessionId:session,revisionId:revision,clientAt:1792260000000,texto:'Texto conservado con su audio.',parcial:'',titulo:item.title,fuenteEntrada:'microfono',duracionSeg:10,audioPartes:parts,corteAudio:{hastaParte:2,finMs:10000}};
test.use({permissions:['microphone'],launchOptions:{args:['--use-fake-device-for-media-stream','--use-fake-ui-for-media-stream']}});
test.beforeEach(async({page})=>{
 await page.addInitScript(()=>{const w=window as any;class R{onstart?:()=>void;onend?:()=>void;start(){setTimeout(()=>this.onstart?.(),0);}stop(){setTimeout(()=>this.onend?.(),0);}abort(){this.stop();}}w.SpeechRecognition=w.webkitSpeechRecognition=R;});
 await page.route('**/api/dictado/checkpoint**',async route=>{const request=route.request(),u=new URL(request.url());
  if(request.method()==='POST'){
   const body=request.postDataJSON();if(u.searchParams.get('recover')==='1')return route.fulfill({json:{owner,recovery:{...snapshot,sessionId:body.sessionId,revisionId:'40000000-0000-4000-8000-000000000002',recuperadaDe:{sessionId:session,revisionId:body.revisionId}}}});
   return route.fulfill({json:{ok:true,sessionId:body.sessionId,revisionId:body.revisionId}});
  }
  if(u.searchParams.get('catalog')==='1'||u.searchParams.get('revisions')==='1')return route.fulfill({json:{owner,items:[item],nextCursor:null}});
  return route.fulfill({json:{owner,recovery:snapshot,sealed:false}});
 });
 await page.route('**/api/audio',route=>route.fulfill({status:400,json:{error:'synthetic_unavailable_audio_server'}}));
 await page.route('**/api/dictado-experience',route=>route.fulfill({json:{records:[],profileKey:owner,summary:{},truncated:false,retentionDays:90}}));
 await page.route('**/api/dictado/reconciliar',route=>route.fulfill({json:{ok:true}}));
 await page.route('**/api/dictado',route=>{const p=route.request().postDataJSON();return route.fulfill({json:{id:'50000000-0000-4000-8000-000000000001',sha256:'b'.repeat(64),chars:p.texto.length,estado:'archivado',sessionId:p.sessionId}});});
 await page.goto('/sistema/ingreso?modo=dictado');await expect(page.locator('[data-testid="khora-splash"]')).toHaveCount(0);await expect(page.locator('[data-ui-id="ingreso.custodia-status"]')).toContainText('Salvaguarda preparada');
});
const field=(page:any)=>page.locator('[data-ui-id="ingreso.textarea"]');
test('entrada limpia; nada restaura ni inicia micrófono por abrir',async({page})=>{
 expect(await page.evaluate(()=>{const nav=document.querySelector('nav[aria-label="Barra de sistema"]')!;const shell=nav.parentElement!;return shell.getBoundingClientRect().height>=nav.getBoundingClientRect().height&&getComputedStyle(shell).backgroundColor!=='rgba(0, 0, 0, 0)';})).toBe(true);await expect(field(page)).toHaveValue('');await expect(page.getByRole('img',{name:'Micrófono en espera'})).toBeVisible();await expect(page.getByRole('button',{name:'Recuperar capturas',exact:false})).toBeVisible();
 await expect(page.locator('[data-ui-id="ingreso.stats"]')).not.toBeVisible();await expect(page.locator('[data-ui-id="ingreso.btn-chrome"]')).toHaveCount(0);
 expect(await page.evaluate(()=>{const a=document.querySelector('[data-ui-id="ingreso.btn-archivar"]')!.getBoundingClientRect(),n=document.querySelector('nav[aria-label="Barra de sistema"]')!.getBoundingClientRect();return a.bottom<n.top;})).toBe(true);
 await page.screenshot({path:'test-results/ingreso-desktop-empty.png',fullPage:true});
});
test('elige corte con audio y archiva sin depender del heap anterior',async({page})=>{
 await page.getByRole('button',{name:'Recuperar capturas',exact:false}).click();await expect(page.getByRole('dialog')).toBeVisible();
 await page.screenshot({path:'test-results/ingreso-desktop-recovery.png',fullPage:true});
 const clone=page.waitForRequest(r=>r.url().includes('recover=1')&&r.method()==='POST');await page.getByRole('button',{name:'Recuperar esta captura'}).click();
 const request=(await clone).postDataJSON();expect(request.sourceSessionId).toBe(session);expect(request.sessionId).not.toBe(session);
 await expect(field(page)).toHaveValue(snapshot.texto);await expect(page.getByRole('dialog')).toHaveCount(0);
 const archived=page.waitForRequest(r=>new URL(r.url()).pathname==='/api/dictado'&&r.method()==='POST');await page.locator('[data-ui-id="ingreso.btn-archivar"]').click();
 const payload=(await archived).postDataJSON();expect(payload.audioPartes).toHaveLength(2);expect(payload.sessionId).toBe(request.sessionId);
 await expect(page.locator('[data-ui-id="ingreso.msg-error"]')).toHaveCount(0);
});
test('consulta puntos, cambia selección y devuelve el foco al cerrar',async({page})=>{
 const trigger=page.getByRole('button',{name:'Recuperar capturas',exact:false});await trigger.click();await page.getByRole('button',{name:'Ver puntos guardados'}).click();await expect(page.getByLabel('Punto de recuperación')).toBeVisible();await page.getByLabel('Punto de recuperación').selectOption(revision);await page.keyboard.press('Escape');await expect(trigger).toBeFocused();await expect(field(page)).toHaveValue('');
});
test('fallo de recuperación no borra lo escrito ni finge éxito',async({page})=>{
 await field(page).fill('Mi trabajo actual no debe desaparecer.');await page.locator('[data-ui-id="ingreso.btn-confirmar-edicion"]').click();
 await page.route('**/api/dictado/checkpoint?recover=1',route=>route.fulfill({status:503,json:{error:'recuperacion_no_confirmada'}}));
 await page.getByRole('button',{name:'Recuperar capturas',exact:false}).click();await page.getByRole('article').filter({has:page.getByRole('heading',{name:item.title})}).getByRole('button',{name:'Recuperar esta captura'}).click();await expect(page.getByRole('dialog').getByRole('alert')).toContainText('No se confirmó');await page.getByRole('button',{name:'Cerrar recuperaciones'}).click();await expect(field(page)).toHaveValue('Mi trabajo actual no debe desaparecer.');
});
test('móvil: sin desbordamientos, panel usable y captura intacta',async({page})=>{
 await page.setViewportSize({width:390,height:844});await page.screenshot({path:'test-results/ingreso-mobile-empty.png',fullPage:true});
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 const opinion=page.getByRole('button',{name:'Dar opinión',exact:true});await opinion.evaluate(el=>el.scrollIntoView({block:'center'}));await expect.poll(()=>opinion.evaluate(el=>el.getBoundingClientRect().bottom<document.querySelector('nav[aria-label="Barra de sistema"]')!.getBoundingClientRect().top)).toBe(true);
 await page.getByRole('button',{name:'Recuperar capturas',exact:false}).click();await page.screenshot({path:'test-results/ingreso-mobile-recovery.png',fullPage:true});expect(await page.getByRole('dialog').evaluate(el=>el.scrollWidth<=el.clientWidth)).toBe(true);await page.getByRole('button',{name:'Cerrar recuperaciones'}).click();await expect(field(page)).toHaveValue('');
});
test('actividad de audio conectada al flujo real del grabador',async({page})=>{
 await page.locator('[data-ui-id="ingreso.btn-iniciar"]').click();await expect(page.getByRole('img',{name:'Actividad real del micrófono'})).toBeVisible();await expect(page.locator('[data-ui-id="ingreso.status-listening"]')).toContainText('Micrófono activo');await expect.poll(()=>page.getByRole('img',{name:'Actividad real del micrófono'}).evaluate((c:any)=>{const pixels=c.getContext('2d').getImageData(0,0,240,30).data;return pixels.some((x:number,i:number)=>i%4===3&&x>0);})).toBe(true);await expect(page.locator('[data-ui-id="ingreso.aviso-degradado"]')).toContainText('pendiente');expect(await page.locator('[data-ui-id="ingreso.aviso-degradado"]').evaluate(el=>el.getBoundingClientRect().bottom<document.querySelector('nav[aria-label="Barra de sistema"]')!.getBoundingClientRect().top)).toBe(true);await page.screenshot({path:'test-results/ingreso-desktop-recording.png',fullPage:true});await page.locator('[data-ui-id="ingreso.btn-detener"]').click();await expect(page.getByRole('img',{name:'Micrófono en espera'})).toBeVisible();
});
test('opciones secundarias y tema claro conservan orden visual',async({page})=>{
 await page.evaluate(()=>document.documentElement.dataset.theme='light');await page.getByRole('button',{name:'Más opciones de captura'}).click();await expect(page.locator('[data-ui-id="ingreso.btn-chrome"]')).toBeVisible();await page.screenshot({path:'test-results/ingreso-desktop-light.png',fullPage:true});
});

test('historial indisponible no bloquea una nueva grabación autenticada',async({page})=>{
 await page.route('**/api/dictado/checkpoint**',route=>{const u=new URL(route.request().url());if(route.request().method()==='GET'&&u.searchParams.get('catalog')==='1')return route.fulfill({status:503,json:{error:'catalogo_no_disponible'}});return route.fallback();});
 await page.reload();const start=page.locator('[data-ui-id="ingreso.btn-iniciar"]');await expect(start).toBeEnabled();await start.click();await expect(page.locator('[data-ui-id="ingreso.status-listening"]')).toHaveText('Micrófono activo');await expect(page.getByRole('img',{name:'Actividad real del micrófono'})).toBeVisible();await page.locator('[data-ui-id="ingreso.btn-detener"]').click();await expect(page.locator('[data-ui-id="ingreso.btn-detener"]')).toHaveCount(0);
});
test('preparación fallida explica bloqueo y permite reintentar sin perder texto',async({page})=>{
 let available=false;
 await page.route('**/api/dictado/checkpoint**',route=>{const u=new URL(route.request().url());if(route.request().method()==='GET'&&u.searchParams.get('bootstrap')==='1')return route.fulfill({status:available?200:503,json:available?{owner}:{error:'recovery_fallido'}});return route.fallback();});
 await page.reload();const start=page.locator('[data-ui-id="ingreso.btn-iniciar"]');await expect(start).toBeDisabled();await expect(page.locator('[data-ui-id="ingreso.status-listening"]')).toHaveText('Captura no preparada');await expect(page.locator('[data-ui-id="ingreso.custodia-status"]')).toContainText('reintenta');await field(page).fill('Este texto no se pierde al reintentar.');await page.locator('[data-ui-id="ingreso.btn-confirmar-edicion"]').click();available=true;await page.getByRole('button',{name:'Reintentar preparación'}).click();await expect(start).toBeEnabled();await expect(field(page)).toHaveValue('Este texto no se pierde al reintentar.');await start.click();await expect(page.locator('[data-ui-id="ingreso.status-listening"]')).toHaveText('Micrófono activo');await page.locator('[data-ui-id="ingreso.btn-detener"]').click();
});
test('sin sesión no se habilita el micrófono ni se presenta como listo',async({page})=>{
 await page.route('**/api/dictado/checkpoint**',route=>{const u=new URL(route.request().url());if(u.searchParams.get('bootstrap')==='1')return route.fulfill({status:401,json:{error:'no_autenticado'}});return route.fallback();});await page.reload();await expect(page.locator('[data-ui-id="ingreso.btn-iniciar"]')).toBeDisabled();await expect(page.locator('[data-ui-id="ingreso.custodia-status"]')).toContainText('Inicia sesión');await expect(page.locator('[data-ui-id="ingreso.status-listening"]')).toHaveText('Captura no preparada');await expect(page.locator('[data-ui-id="ingreso.btn-detener"]')).toHaveCount(0);
});
