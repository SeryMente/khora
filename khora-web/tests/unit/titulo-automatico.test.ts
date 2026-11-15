import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  DisparadorTituloAutomatico,
  cumpleUmbralTituloAutomatico,
  hashTextoParaTitulo,
  TITULO_AUTO_DEBOUNCE_MS,
  TITULO_AUTO_MIN_CARACTERES,
  TITULO_AUTO_MIN_PALABRAS,
} from "../../lib/client/titulo-automatico.js";

const textoLargo = Array.from({ length: 42 }, (_, index) =>
  `palabra${index} contenido confirmado para describir el tema central`,
).join(" ");

const esperar = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

test("el umbral requiere al menos 35 palabras y 220 caracteres confirmados", () => {
  assert.equal(TITULO_AUTO_MIN_PALABRAS, 35);
  assert.equal(TITULO_AUTO_MIN_CARACTERES, 220);
  assert.equal(TITULO_AUTO_DEBOUNCE_MS, 2_000);
  assert.equal(cumpleUmbralTituloAutomatico(textoLargo), true);
  assert.equal(cumpleUmbralTituloAutomatico(textoLargo.split(/\s+/).slice(0, 34).join(" ")), false);
  assert.equal(cumpleUmbralTituloAutomatico("x ".repeat(35)), false);
  assert.equal(cumpleUmbralTituloAutomatico("palabra ".repeat(35)), true);
});

test("el hash ignora puntuación, capitalización y diferencias de espacios", () => {
  assert.equal(
    hashTextoParaTitulo("Árbol, energía y diálogo."),
    hashTextoParaTitulo("arbol   ENERGIA y dialogo"),
  );
});

test("debounce aplaza la solicitud hasta la pausa más reciente", async () => {
  const calls: string[] = [];
  const scheduler = new DisparadorTituloAutomatico({
    debounceMs: 80,
    requestTitle: async texto => {
      calls.push(texto);
      return { title: "Groq: título confirmado", nivel: "ia" };
    },
    canApply: () => true,
    onTitle: () => undefined,
  });
  scheduler.observe(textoLargo);
  await esperar(40);
  const updated = textoLargo + " Esta es una continuación confirmada.";
  scheduler.observe(updated);
  await esperar(30);
  assert.equal(calls.length, 0);
  await esperar(60);
  assert.equal(calls.length, 1);
  assert.equal(calls[0], updated);
  scheduler.destroy();
});

test("deduplicación por hash evita repetir la misma solicitud aunque cambie la puntuación", async () => {
  let calls = 0;
  const scheduler = new DisparadorTituloAutomatico({
    debounceMs: 30,
    requestTitle: async () => {
      calls += 1;
      return { title: "Título Groq", nivel: "ia" };
    },
    canApply: () => true,
    onTitle: () => undefined,
  });
  scheduler.observe(textoLargo);
  await esperar(60);
  scheduler.observe(textoLargo + ".");
  await esperar(60);
  assert.equal(calls, 1);
  scheduler.destroy();
});

test("un resultado tardío no sobrescribe título manual ni una revisión de texto posterior", async () => {
  let resolveRequest: ((value: { title: string; nivel: string }) => void) | undefined;
  let canApply = true;
  const titles: string[] = [];
  const scheduler = new DisparadorTituloAutomatico({
    debounceMs: 30,
    requestTitle: async () => new Promise(resolve => { resolveRequest = resolve; }),
    canApply: () => canApply,
    onTitle: title => titles.push(title),
  });
  scheduler.observe(textoLargo);
  await esperar(60);
  assert.ok(resolveRequest);
  canApply = false;
  scheduler.cancel();
  resolveRequest!({ title: "Título tardío", nivel: "ia" });
  await esperar(0);
  assert.deepEqual(titles, []);
  scheduler.destroy();
});


test("una revisión de texto más reciente invalida una respuesta Groq obsoleta", async () => {
  const pending: Array<{ resolve: (value: { title: string; nivel: string }) => void; signal: AbortSignal }> = [];
  const titles: string[] = [];
  const scheduler = new DisparadorTituloAutomatico({
    debounceMs: 30,
    requestTitle: async (_texto, signal) => new Promise(resolve => pending.push({ resolve, signal })),
    canApply: () => true,
    onTitle: title => titles.push(title),
  });
  scheduler.observe(textoLargo);
  await esperar(60);
  assert.equal(pending.length, 1);
  const newerText = textoLargo + " nueva evidencia confirmada";
  scheduler.observe(newerText);
  assert.equal(pending[0].signal.aborted, true);
  await esperar(60);
  assert.equal(pending.length, 2);
  pending[0].resolve({ title: "Título obsoleto", nivel: "ia" });
  await esperar(0);
  assert.deepEqual(titles, []);
  pending[1].resolve({ title: "Título de la revisión reciente", nivel: "ia" });
  await esperar(0);
  assert.deepEqual(titles, ["Título de la revisión reciente"]);
  scheduler.destroy();
});

test("reset permite generar de nuevo para otra captura con contenido idéntico", async () => {
  let calls = 0;
  const scheduler = new DisparadorTituloAutomatico({
    debounceMs: 30,
    requestTitle: async () => {
      calls += 1;
      return { title: "Título por sesión", nivel: "ia" };
    },
    canApply: () => true,
    onTitle: () => undefined,
  });
  scheduler.observe(textoLargo);
  await esperar(60);
  scheduler.reset();
  scheduler.observe(textoLargo);
  await esperar(60);
  assert.equal(calls, 2);
  scheduler.destroy();
});

test("una respuesta determinista no se presenta como título Groq automático", async () => {
  const titles: string[] = [];
  const scheduler = new DisparadorTituloAutomatico({
    debounceMs: 30,
    requestTitle: async () => ({ title: "Título fallback", nivel: "fallback_determinista" }),
    canApply: () => true,
    onTitle: title => titles.push(title),
  });
  scheduler.observe(textoLargo);
  await esperar(60);
  assert.deepEqual(titles, []);
  scheduler.destroy();
});

test("layout mantiene el textarea fuera del wrapper colapsable y fija ambos checks de Crónica", () => {
  const view = readFileSync("app/components/shared/IngresoView.tsx", "utf8");
  const css = readFileSync("app/components/ingreso/ingreso-studio.module.css", "utf8");
  const workspace = readFileSync("app/components/ingreso/IngresoWorkspace.tsx", "utf8");
  const dialog = readFileSync("app/components/ingreso/DialogoPanel.tsx", "utf8");
  const titleRoute = readFileSync("app/api/dictado-archivo/titulo/route.ts", "utf8");
  const titles = readFileSync("lib/server/titulos.ts", "utf8");
  assert.match(view, /id="ingreso-title-wrapper"/);
  assert.match(view, /className=\{s\.titleInner\}/);
  assert.match(view, /<textarea id="ingreso-text"/);
  assert.match(view, /data-ui-id="ingreso\.cronica-auto-publish-bottom"/);
  assert.match(view, /checked disabled/);
  assert.match(view, /className=\{s\.bottomright\}/);
  assert.match(css, /\.cronicaPublishDisabled[^}]*opacity:\s*\.55/);
  assert.match(css, /\.bottomright\s*\{/);
  assert.match(workspace, /enabled: !archivado && !guardando && !editando/);
  assert.match(dialog, /enabled:ready&&!busy&&!archived&&!archivePayload\.current&&!manualEditRef\.current/);
  assert.match(workspace, /data\?\.title/);
  assert.match(workspace, /autoTitulo\.setGeneratedTitle\(data\.title\)/);
  assert.match(dialog, /\.\.\.metadataCronica\(\)/);
  assert.match(titleRoute, /NextResponse\.json\(resultado/);
  assert.match(titles, /interface TitleGenerationResult \{[\s\S]*?title: string/);
});
