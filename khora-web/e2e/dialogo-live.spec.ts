import { test, expect } from "@playwright/test";

const owner="synthetic-dialogue-owner@example.invalid";
test("Escuchar a Chrome abre diálogo en vivo con micrófono implícito y organización bloqueada",async({page})=>{
  await page.route("**/api/dictado/checkpoint**",async(route)=>{
    const request=route.request();
    if(request.method()==="GET"){
      const url=new URL(request.url());
      return route.fulfill({json:url.searchParams.has("bootstrap")?{owner}:{owner,items:[],recovery:null}});
    }
    const body=request.postDataJSON();
    return route.fulfill({json:{ok:true,sessionId:body.sessionId,revisionId:body.revisionId,sha256:"a".repeat(64)}});
  });
  await page.goto("/sistema/ingreso?modo=dictado");
  await expect(page.getByRole("heading",{name:"Ingreso",exact:true})).toBeVisible();
  await expect(page.getByRole("button",{name:"Iniciar dictado",exact:true})).toBeVisible();
  await page.getByRole("button",{name:"Escuchar a Chrome",exact:true}).click();
  const organizer=page.getByRole("checkbox",{name:"Organizar como diálogo"});
  await expect(organizer).toBeChecked();
  await expect(organizer).toBeDisabled();
  await expect(page.getByRole("button",{name:"Iniciar dictado",exact:true})).toBeVisible();
  await expect(page.getByLabel("Texto de la captura")).toBeEditable();
  await expect(page.getByRole("checkbox")).toHaveCount(1);

  await page.locator('[data-ui-id="ingreso.modalidad-cronica"]').click();
  const cronicaTop = page.locator('[data-ui-id="ingreso.cronica-auto-publish"]');
  const cronicaBottom = page.locator('[data-ui-id="ingreso.cronica-auto-publish-bottom"]');
  await expect(cronicaTop).toBeChecked();
  await expect(cronicaTop).toBeDisabled();
  await expect(cronicaBottom).toBeChecked();
  await expect(cronicaBottom).toBeDisabled();

  await page.locator('[data-ui-id="ingreso.modalidad-dictado"]').click();
  await expect(cronicaTop).toHaveCount(0);
  await expect(cronicaBottom).toHaveCount(0);
});
