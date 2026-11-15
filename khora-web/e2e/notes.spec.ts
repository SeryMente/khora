import { test, expect, type Page, type Route } from "@playwright/test";

type FixtureNote = {
  id: string;
  user_id: string;
  mode: "text" | "checklist";
  content: string;
  checklist_items: Array<{ id: string; text: string; is_completed: boolean; position: number }>;
  tags: string[];
  color: "default" | "red" | "orange" | "yellow" | "green" | "blue" | "purple";
  is_pinned: boolean;
  status: "active" | "archived" | "trashed";
  context_type: string | null;
  context_id: string | null;
  context_url: string | null;
  trashed_at: string | null;
  created_at: string;
  updated_at: string;
};

const now = "2026-11-14T18:00:00.000Z";

function fixture(overrides: Partial<FixtureNote> = {}): FixtureNote {
  return {
    id: "note-1",
    user_id: "test@example.com",
    mode: "text",
    content: "Idea estratégica para el equipo",
    checklist_items: [],
    tags: ["proyecto/khora/notas"],
    color: "default",
    is_pinned: true,
    status: "active",
    context_type: null,
    context_id: null,
    context_url: null,
    trashed_at: null,
    created_at: now,
    updated_at: now,
    ...overrides,
  };
}

async function mockNotesApi(page: Page, initial: FixtureNote[] = []) {
  const notes = [...initial];
  const creates: Array<Record<string, unknown>> = [];
  const patches: Array<Record<string, unknown>> = [];
  const requests: string[] = [];

  await page.route("**/api/notes**", async (route: Route) => {
    const request = route.request();
    const url = new URL(request.url());
    const pathname = url.pathname;
    const method = request.method();
    requests.push(method + " " + pathname + url.search);

    const reply = (body: unknown, status = 200) => route.fulfill({
      status,
      contentType: "application/json",
      body: JSON.stringify(body),
    });

    if (pathname === "/api/notes" && method === "GET") {
      const status = url.searchParams.get("status") || "active";
      const q = (url.searchParams.get("q") || "").toLocaleLowerCase("es-MX");
      const tag = url.searchParams.get("tag");
      const pageSize = Number(url.searchParams.get("pageSize") || 40);
      const pageNumber = Number(url.searchParams.get("page") || 1);
      const filtered = notes.filter((note) => {
        const statusMatch = status === "all" || note.status === status;
        const searchMatch = !q || (note.content + " " + note.checklist_items.map((item) => item.text).join(" ") + " " + note.tags.join(" ")).toLocaleLowerCase("es-MX").includes(q);
        const tagMatch = !tag || note.tags.some((entry) => entry === tag || entry.startsWith(tag + "/"));
        return statusMatch && searchMatch && tagMatch;
      });
      const start = (pageNumber - 1) * pageSize;
      const items = filtered.slice(start, start + pageSize);
      const tags = [...new Set(notes.filter((note) => status === "all" || note.status === status).flatMap((note) => note.tags))].sort();
      return reply({ items, tags, page: pageNumber, pageSize, total: filtered.length, hasMore: start + items.length < filtered.length });
    }

    if (pathname === "/api/notes" && method === "POST") {
      const body = request.postDataJSON() as Record<string, any>;
      creates.push(body);
      const checklistItems = Array.isArray(body.checklist_items) ? body.checklist_items : [];
      const created = fixture({
        id: "created-" + (creates.length),
        mode: body.mode,
        content: body.content || "",
        checklist_items: checklistItems,
        tags: [],
        color: body.color || "default",
        is_pinned: body.is_pinned === true,
      });
      notes.unshift(created);
      return reply({ note: created }, 201);
    }

    const actionMatch = pathname.match(/^\/api\/notes\/([^/]+)\/actions$/);
    if (actionMatch && method === "POST") {
      const note = notes.find((item) => item.id === actionMatch[1]);
      if (!note) return reply({ detail: "nota no encontrada" }, 404);
      const action = (request.postDataJSON() as { action: string }).action;
      if (action === "archive") note.status = "archived";
      if (action === "trash") { note.status = "trashed"; note.trashed_at = now; }
      if (action === "restore") { note.status = "active"; note.trashed_at = null; }
      if (action === "pin") note.is_pinned = true;
      if (action === "unpin") note.is_pinned = false;
      return reply({ note });
    }

    const noteMatch = pathname.match(/^\/api\/notes\/([^/]+)$/);
    if (noteMatch && method === "GET") {
      const note = notes.find((item) => item.id === noteMatch[1]);
      return note ? reply({ note }) : reply({ detail: "nota no encontrada" }, 404);
    }
    if (noteMatch && method === "PATCH") {
      const note = notes.find((item) => item.id === noteMatch[1]);
      if (!note) return reply({ detail: "nota no encontrada" }, 404);
      const body = request.postDataJSON() as Record<string, any>;
      patches.push(body);
      Object.assign(note, body);
      note.updated_at = new Date().toISOString();
      return reply({ note });
    }
    if (noteMatch && method === "DELETE") {
      const note = notes.find((item) => item.id === noteMatch[1]);
      if (!note || note.status !== "trashed" || url.searchParams.get("confirm") !== "true") {
        return reply({ detail: "eliminación no permitida" }, 404);
      }
      notes.splice(notes.indexOf(note), 1);
      return reply({ deleted: true });
    }
    return reply({ detail: "ruta no simulada" }, 501);
  });

  return { notes, creates, patches, requests };
}

test.describe("Notas rápidas · integración de navegador", () => {
  test("lista, búsqueda y filtro por etiquetas jerárquicas", async ({ page }) => {
    const api = await mockNotesApi(page, [
      fixture(),
      fixture({ id: "note-2", content: "Comprar adaptador USB", tags: ["personal/compras/lista"], is_pinned: false }),
    ]);

    await page.goto("/notas");
    await expect(page.getByRole("heading", { name: "Notas rápidas", exact: true })).toBeVisible();
    await expect(page.locator("[data-note-card]")).toHaveCount(2);
    await expect(page.getByRole("button", { name: "Vista de lista" })).toBeVisible();

    await page.getByRole("textbox", { name: "Buscar en notas" }).fill("adaptador");
    await expect(page.locator("[data-note-card]")).toHaveCount(1);
    await expect(page.locator("[data-note-card]")).toContainText("Comprar adaptador USB");

    await page.getByRole("textbox", { name: "Buscar en notas" }).fill("");
    await expect(page.locator("[data-note-card]")).toHaveCount(2);
    await expect(page.getByRole("button", { name: "proyecto", exact: true })).toBeVisible();
    expect(api.requests.some((entry) => entry.includes("q=adaptador"))).toBeTruthy();
  });

  test("captura libre, autoguardado y render Markdown sin ejecución HTML", async ({ page }) => {
    const api = await mockNotesApi(page);
    await page.goto("/notas");
    await page.getByRole("button", { name: "Nueva nota" }).click();

    const editor = page.getByRole("dialog");
    await expect(editor).toBeVisible();
    const content = page.getByRole("textbox", { name: "Contenido de la nota" });
    await content.fill('Idea <img src=x onerror="alert(1)"> **segura**');

    await expect.poll(() => api.creates.length).toBe(1);
    expect(api.creates[0]).not.toHaveProperty("user_id");
    expect(api.creates[0].mode).toBe("text");
    await expect(editor.locator("img")).toHaveCount(0);
    await expect(content).toHaveValue('Idea <img src=x onerror="alert(1)"> **segura**');
    await expect(editor.locator("span.whitespace-pre-wrap")).toContainText('<img src=x onerror="alert(1)">' );
    await expect(editor.locator("strong")).toContainText("segura");

    await page.getByRole("button", { name: "Cerrar editor" }).click();
    await expect(editor).toHaveCount(0);
  });

  test("checklist: Enter inserta, Backspace elimina el elemento vacío y el completado se pliega", async ({ page }) => {
    const api = await mockNotesApi(page);
    await page.goto("/notas");
    await page.getByRole("button", { name: "Nueva nota" }).click();
    const editor = page.getByRole("dialog");
    await page.getByRole("button", { name: "Checklist" }).click();

    const first = page.getByRole("textbox", { name: "Elemento 1" });
    await first.fill("Validar #proyecto/khora/notas");
    await first.press("Enter");
    const second = page.getByRole("textbox", { name: "Elemento 2" });
    await expect(second).toBeVisible();
    await second.press("Backspace");
    await expect(page.getByRole("textbox", { name: "Elemento 2" })).toHaveCount(0);
    await expect(first).toBeVisible();

    await page.getByRole("button", { name: "Completar elemento" }).click();
    const completedToggle = page.getByRole("button", { name: "Completados (1)" });
    await expect(completedToggle).toBeVisible();
    await expect(page.getByRole("textbox", { name: "Elemento completado" })).toHaveCount(0);
    await completedToggle.click();
    await expect(page.getByRole("textbox", { name: "Elemento completado" })).toBeVisible();

    await expect.poll(() => api.creates.length).toBe(1);
    expect(api.creates[0].mode).toBe("checklist");
    await page.keyboard.press("Escape");
    await expect(editor).toHaveCount(0);
  });

  test("atajo global y captura móvil en panel de pantalla completa", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await mockNotesApi(page);
    await page.goto("/notas");
    await page.getByRole("button", { name: "Configurar atajo global" }).click();
    const shortcut = page.getByLabel("Atajo global de captura");
    await expect(shortcut).toHaveValue("Alt+Shift+N");
    await expect(shortcut.locator("option")).toHaveText(["Ctrl+Alt+N", "Alt+Shift+N"]);
    await page.getByRole("button", { name: "Configurar atajo global" }).click();
    await page.keyboard.press("Alt+Shift+N");

    const panel = page.getByRole("dialog", { name: "Notas rápidas" });
    await expect(panel).toBeVisible();
    await expect(panel.locator("footer")).toContainText("Alt+Shift+N");
    const bounds = await panel.boundingBox();
    expect(bounds).not.toBeNull();
    expect(bounds!.x).toBe(0);
    expect(bounds!.y).toBe(0);
    expect(bounds!.width).toBe(390);
    expect(bounds!.height).toBe(844);
    await expect(panel.getByRole("button", { name: "Cerrar panel" })).toHaveCSS("min-height", "44px");
    await panel.getByRole("button", { name: "Cerrar panel" }).click();
    await expect(panel).toHaveCount(0);
  });

  test("Ingreso conserva su enlace directo y muestra Dictado y Notas rápidas en el menú", async ({ page }) => {
    await page.goto("/sistema/custodia");
    await expect(page.locator("[data-navigation-entry]")).toHaveCount(6);
    const ingreso = page.getByRole("link", { name: "Ingreso", exact: true });
    await expect(ingreso).toHaveAttribute("href", "/sistema/ingreso");
    await page.getByRole("button", { name: "Más opciones de Ingreso" }).click();
    const menu = page.getByRole("navigation", { name: "Menú Ingreso" });
    await expect(menu.getByRole("link", { name: "Notas rápidas", exact: true })).toHaveAttribute("href", "/notas");
    await expect(menu.getByRole("button", { name: "Abrir captura rápida" })).toContainText("Alt+Shift+N");
    await expect(menu.getByRole("link", { name: "Dictado", exact: true })).toHaveAttribute("href", "/sistema/ingreso");
    await expect(menu.getByRole("link", { name: "Volcado", exact: true })).toHaveCount(0);
    await menu.getByRole("button", { name: "Abrir captura rápida" }).click();
    await expect(page.getByRole("dialog", { name: "Notas rápidas" })).toBeVisible();
    await page.getByRole("button", { name: "Cerrar panel" }).click();
  });
});
