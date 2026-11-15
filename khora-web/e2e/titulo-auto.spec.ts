import { test, expect } from "@playwright/test";

const owner = "synthetic-title-owner@example.invalid";
const confirmedText = Array.from({ length: 42 }, (_, index) =>
  `palabra${index} contenido confirmado para explicar por qué el sistema requiere una síntesis descriptiva y conservar el contexto completo`,
).join(" ");

async function openIngreso(page: any) {
  await page.route("**/api/dictado/checkpoint**", async (route: any) => {
    const request = route.request();
    if (request.method() === "GET") {
      const url = new URL(request.url());
      return route.fulfill({ json: url.searchParams.has("bootstrap") ? { owner } : { owner, items: [], recovery: null } });
    }
    const body = request.postDataJSON();
    return route.fulfill({ json: { ok: true, sessionId: body.sessionId, revisionId: body.revisionId, sha256: "a".repeat(64) } });
  });
  await page.goto("/sistema/ingreso?modo=dictado");
  await expect(page.getByRole("heading", { name: "Ingreso", exact: true })).toBeVisible();
}

async function fillAndConfirm(page: any, text: string) {
  await page.getByRole("textbox", { name: "Texto de la captura" }).fill(text);
  const confirm = page.locator('[data-ui-id="ingreso.btn-confirmar-edicion"]');
  if (await confirm.count()) await confirm.click();
}

test("Groq genera título después del umbral y el debounce, y expande el campo", async ({ page }) => {
  let requests = 0;
  await page.route("**/api/dictado-archivo/titulo", async (route: any) => {
    requests += 1;
    const body = route.request().postDataJSON();
    expect(body.texto).toBe(confirmedText);
    return route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ title: "La tesis central de la captura — evidencia y decisiones", nivel: "ia" }),
    });
  });
  await openIngreso(page);
  await expect(page.locator("#ingreso-title-wrapper")).toHaveAttribute("aria-hidden", "true");
  await fillAndConfirm(page, confirmedText);
  const title = page.locator("#ingreso-title");
  await expect(title).toHaveValue("La tesis central de la captura — evidencia y decisiones", { timeout: 12_000 });
  await expect(page.locator("#ingreso-title-wrapper")).toHaveAttribute("aria-hidden", "false");
  expect(requests).toBe(1);
});

test("un título editado manualmente no se sustituye mediante generación automática", async ({ page }) => {
  let requests = 0;
  await page.route("**/api/dictado-archivo/titulo", async (route: any) => {
    requests += 1;
    return route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ title: "Título automático no deseado", nivel: "ia" }),
    });
  });
  await openIngreso(page);
  await page.getByRole("button", { name: "Añadir título" }).click();
  const title = page.locator("#ingreso-title");
  await title.fill("Título manual preservado");
  await fillAndConfirm(page, confirmedText);
  await page.waitForTimeout(2_500);
  await expect(title).toHaveValue("Título manual preservado");
  expect(requests).toBe(0);
});
