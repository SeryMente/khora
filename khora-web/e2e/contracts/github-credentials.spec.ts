import { test, expect } from '@playwright/test';
const records=[{purpose:'norm',configured:false,updatedAt:null},{purpose:'ep',configured:false,updatedAt:null}];
const synthetic='github_pat_'+'fixtureNotReal1234567890'.repeat(3);
async function setup(page:any,unlocked:boolean){
  await page.route('**/api/boveda', (r:any)=>r.fulfill({json:{configurado:true,abierta:unlocked,minutos:30}}));
  await page.route('**/api/security/vault-agent/token',(r:any)=>r.fulfill({json:{active:false}}));
  await page.route('**/api/security/vault-agent/history?*',(r:any)=>r.fulfill({json:{entries:[]}}));
  await page.route('**/api/security/github-credentials',(r:any)=>r.fulfill({json:{credentials:records}}));
  await page.goto('/sistema/seguridad?tab=boveda');
}
test('vault closed: no GitHub secret input is exposed',async({page})=>{
  await setup(page,false);await expect(page.getByText('Abre la bóveda con tu PIN para gestionar estos secretos.')).toBeVisible();await expect(page.getByLabel('Token de GitHub',{exact:true})).toHaveCount(0);
});
test('save then switch use clears secret; metadata does not echo it',async({page})=>{
  await setup(page,true);const input=page.getByLabel('Token de GitHub',{exact:true});await expect(input).toHaveAttribute('type','password');
  await input.fill(synthetic);
  await page.route('**/api/security/github-credentials',async route=>{
    if(route.request().method()==='POST'){expect(route.request().postDataJSON()).toEqual({purpose:'norm',token:synthetic});await route.fulfill({json:{ok:true,message:'Token cifrado y guardado.',credentials:[{purpose:'norm',configured:true,updatedAt:'2026-10-16T00:00:00Z'},records[1]]}});}else await route.fulfill({json:{credentials:records}});
  });
  await page.getByRole('button',{name:'Comprobar y guardar'}).click();await expect(input).toHaveValue('');await expect(page.getByText('Hay una credencial guardada para este uso.')).toBeVisible();
  await input.fill(synthetic);await page.getByLabel('Uso del token',{exact:true}).selectOption('ep');await expect(input).toHaveValue('');await expect(page.getByText('Falta guardar una credencial para este uso.')).toBeVisible();
  await expect(page.locator('body')).not.toContainText(synthetic);
  expect(await page.evaluate(()=>Object.keys(localStorage).some(k=>String(localStorage.getItem(k)).includes('github_pat_')))).toBe(false);
});
test('failure is readable and input secret is discarded',async({page})=>{
  await setup(page,true);await page.route('**/api/security/github-credentials',route=>route.fulfill({status:422,json:{code:'GITHUB_TOKEN_REJECTED',message:'GitHub rechazó el token. No se guardó.'}}));
  const input=page.getByLabel('Token de GitHub',{exact:true});await input.fill(synthetic);await page.getByRole('button',{name:'Comprobar y guardar'}).click();await expect(page.getByText('GitHub rechazó el token. No se guardó.')).toBeVisible();await expect(input).toHaveValue('');
});
