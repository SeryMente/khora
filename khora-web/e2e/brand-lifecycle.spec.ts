import { test, expect } from "@playwright/test";
const splash = '[data-testid="khora-splash"]';
for (const theme of ["dark", "light"]) for (const width of [390,1180]) {
 test(`access design ${theme} ${width}`, async ({ page }, info) => {
  await page.setViewportSize({width,height:844});
  await page.addInitScript(theme => localStorage.setItem("khora-theme",theme), theme);
  const errors: string[]=[]; page.on("pageerror",e=>errors.push(e.message));
  await page.goto("/auth/signin?callbackUrl=%2Fsistema%2Fingreso");
  await expect(page.getByRole("heading",{name:"Entra a tu espacio."})).toBeVisible();
  await expect(page.locator(splash)).toHaveCount(0);
  await expect(page.getByRole("button",{name:"Continuar con mi cuenta"})).toBeEnabled();
  await expect(page.locator(".khora-auth-brand svg rect")).toHaveCount(6);
  await expect(page.locator(".khora-auth-brand svg path")).toHaveCount(1);
  await expect(page.locator('[data-khora-system-navigation]')).toBeHidden();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.getByRole("button",{name:"Continuar con mi cuenta"}).focus();
  await expect(page.getByRole("button",{name:"Continuar con mi cuenta"})).toBeFocused();
  await info.attach(`access-${theme}-${width}`,{body:await page.screenshot(),contentType:"image/png"});
  await page.goto("/auth/signin?error=Configuration");
  await expect(page.locator(".khora-auth").getByRole("alert")).toHaveText("No se pudo completar el acceso. Inténtalo de nuevo con tu cuenta.");
  await expect(page.locator(".khora-auth")).not.toContainText("Configuration");
  await info.attach(`access-error-${theme}-${width}`,{body:await page.screenshot(),contentType:"image/png"});
  expect(errors).toEqual([]);
 });
}
test("reload and technical handoff do not replay the welcome", async ({page})=>{
 await page.goto("/sistema/custodia"); await expect(page.locator(splash)).toHaveCount(0);
 await page.reload(); await expect(page.locator("html")).toHaveAttribute("data-khora-boot","skip");
 await expect(page.locator(splash)).toHaveCount(0);
 await page.goto("/auth/signin"); await expect(page.locator(splash)).toHaveCount(0);
 await page.goto("/sistema/custodia"); await expect(page.locator("html")).toHaveAttribute("data-khora-boot","skip");
 await expect(page.locator(splash)).toHaveCount(0);
});
test("hidden or restored document never keeps a welcome overlay", async ({page})=>{
 await page.clock.install(); await page.clock.pauseAt(new Date());
 await page.goto("/sistema/custodia",{waitUntil:"domcontentloaded"});
 await expect(page.locator(splash)).toBeVisible();
 await page.evaluate(()=>window.dispatchEvent(new PageTransitionEvent("pageshow",{persisted:true})));
 await expect(page.locator(splash)).toHaveCount(0);
});
test("no hydration releases the SSR surface within the watchdog budget", async ({page})=>{
 await page.route(/\.js(?:\?|$)/,route=>route.abort());
 await page.goto("/sistema/custodia",{waitUntil:"domcontentloaded"});
 await expect(page.locator("html")).toHaveAttribute("data-khora-boot","skip",{timeout:4000});
 await expect(page.locator(splash)).toBeHidden();
});
test("authentication submit prevents duplicate activation while transport is pending",async({page})=>{
 await page.goto("/auth/signin");
 let release:()=>void=()=>{}; const pending=new Promise<void>(r=>release=r);
 await page.route("**/auth/signin",async route=>{
  if(route.request().method()!=="POST") return route.continue();
  await pending;
  await route.fulfill({status:303,headers:{location:"/auth/signin?error=Configuration"}});
 });
 await page.getByRole("button",{name:"Continuar con mi cuenta"}).click();
 await expect(page.getByRole("button",{name:"Abriendo el acceso…"})).toBeDisabled();
 await expect(page.getByRole("status")).toHaveText("Esperando al proveedor de identidad.");
 release();
});
test("favicons remain public and geometrically canonical",async({request})=>{
 for(const path of ["/icon.svg","/khora-mark.svg?v=intervalo-1"]){
  const res=await request.get(path); expect(res.status()).toBe(200);
  expect(res.headers()["content-type"]).toContain("image/svg+xml");
  const text=await res.text(); expect((text.match(/<rect /g)||[]).length).toBe(7);expect((text.match(/<path /g)||[]).length).toBe(1);
 }
});

test("secondary wait is delayed, local, stable and honest about prolonged work",async({page},info)=>{
 await page.goto('/ui-review/consulta?scenario=idle');
 await expect(page.locator('[data-ui-id="consulta.form-input"]')).toBeVisible();
 await page.clock.install(); await page.clock.pauseAt(new Date());
 await page.locator('select').selectOption('generating');
 const pending=page.getByTestId('khora-pending');
 await expect.poll(async()=>{ await page.clock.runFor(1); return pending.count(); }).toBe(1);
 await expect(pending).toBeVisible();
 await expect(page.locator('html')).toHaveAttribute('data-khora-variant',/\d+/);
 await expect(pending.getByRole('status')).toHaveCount(0);
 await page.clock.runFor(280);
 await expect(pending.getByRole('status')).toHaveCount(0);
 await page.clock.runFor(30);
 await expect(pending.getByRole('status')).toContainText('Generando respuesta.');
 const variant=await pending.locator('svg').getAttribute('data-variant');
 await expect(page.locator('[data-ui-id="consulta.form-input"]')).toBeVisible();
 expect(await pending.locator('svg').evaluate(n=>n.getAnimations({subtree:true}).length)).toBe(0);
 await info.attach('secondary-wait',{body:await page.screenshot(),contentType:'image/png'});
 await page.clock.runFor(7700);
 await expect(pending.getByRole('status')).toContainText('Está tardando más de lo habitual.');
 await expect(pending.locator('svg')).toHaveAttribute('data-variant',variant!);
 await page.goto('/ui-review/consulta?scenario=idle');
 await expect(page.getByTestId('khora-pending')).toHaveCount(0);
});

for (const route of ["/offline", "/capturar/compartir"]) test(`technical entry ${route} never blocks intent with a welcome`,async({page})=>{
 await page.goto(route,{waitUntil:"domcontentloaded"});
 await expect(page.locator("html")).toHaveAttribute("data-khora-boot","skip");
 await expect(page.locator('[data-testid="khora-splash"]')).not.toBeVisible();
});
