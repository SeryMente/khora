import { test, expect, type Page } from "@playwright/test";

// Chromium-generated media only: no physical microphone or production provider.
test.use({ permissions: ["microphone"], launchOptions: { args: ["--use-fake-device-for-media-stream", "--use-fake-ui-for-media-stream"] } });

// End-to-end browser contract: real Ingreso route + keyboard editor + deterministic
// Web Speech callbacks. No real microphone, provider, database or auth bypass in production.
const selector = '[data-ui-id="ingreso.textarea"]';
const original = "La conciencia merece atención y también necesita contraste.";
const continuacion = "Ahora reanudo el dictado";

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    const w = window as any;
    const lab = w.__dictadoContinuidad = { instances: [] as any[], checkpoints: [] as string[] };
    class Recognition {
      id: number; active = false; finals: any[] = [];
      onstart?: () => void; onend?: () => void; onresult?: (event: any) => void;
      constructor() { this.id = lab.instances.length; lab.instances.push(this); }
      start() { this.active = true; this.finals = []; setTimeout(() => this.onstart?.(), 0); }
      stop() { this.active = false; setTimeout(() => this.onend?.(), 0); }
      abort() { this.stop(); }
    }
    w.SpeechRecognition = w.webkitSpeechRecognition = Recognition;
  });
  await page.route("**/api/dictado/checkpoint", async route => {
    const body = route.request().postDataJSON();
    if (route.request().method() === "POST" && body?.texto) {
      await page.evaluate(text => (window as any).__dictadoContinuidad.checkpoints.push(text), body.texto);
    }
    await route.fulfill({ json: { ok: true, owner: "synthetic-custody-owner@example.invalid", recovery: null } });
  });
  await page.route("**/api/observaciones/**", route => route.fulfill({ json: { ok: true, accepted: 0 } }));
  await page.goto("/sistema/ingreso?modo=dictado");
  await expect(page.locator('[data-testid="khora-splash"]')).toHaveCount(0);
  await expect(page.locator(selector)).toBeVisible();
  await page.locator('[data-ui-id="ingreso.btn-iniciar"]').click();
  await expect(page.locator('[data-ui-id="ingreso.status-listening"]')).toContainText("escuchando");
});

async function emit(page: Page, text: string, final: boolean, id?: number) {
  await page.evaluate(({ text, final, id }) => {
    const lab = (window as any).__dictadoContinuidad;
    const rec = id === undefined ? [...lab.instances].reverse().find((r: any) => r.active) : lab.instances[id];
    if (!rec) throw new Error("No recognizer available");
    const result: any = [{ transcript: text, confidence: 1 }];
    result.isFinal = final;
    const index = rec.finals.length;
    const results = [...rec.finals, result];
    if (final) rec.finals.push(result);
    rec.onresult?.({ resultIndex: index, results });
  }, { text, final, id });
}

async function edit(page: Page, suffix: string) {
  await page.locator(selector).click();
  await expect(page.locator('[data-ui-id="ingreso.banner-edicion"]')).toBeVisible();
  await page.keyboard.press("Control+End");
  await page.keyboard.type(suffix, { delay: 5 });
}

async function confirm(page: Page, escape = false) {
  if (escape) await page.keyboard.press("Escape");
  else await page.locator('[data-ui-id="ingreso.btn-confirmar-edicion"]').click();
  await expect(page.locator('[data-ui-id="ingreso.banner-edicion"]')).toHaveCount(0);
  await expect(page.locator('[data-ui-id="ingreso.status-listening"]')).toContainText("escuchando");
}

async function continueAndAssert(page: Page, prefix: string, suffix = continuacion) {
  const field = page.locator(selector);
  await emit(page, suffix, false);
  await expect(field).toHaveValue(prefix + " " + suffix);
  await emit(page, suffix + ".", true);
  await expect(field).toHaveValue(prefix + "\n\n" + suffix + ".");
}

for (const initialFinal of [false, true]) {
  test(`edición con dictado ${initialFinal ? "definitivo" : "provisional"}: conserva edición y resultados nuevos`, async ({ page }) => {
    await emit(page, original, initialFinal);
    await expect(page.locator(selector)).toHaveValue(original);
    await edit(page, " Cambio manual.");
    const prefix = original + " Cambio manual.";
    await confirm(page);
    await page.waitForTimeout(1200);
    await expect(page.locator(selector)).toHaveValue(prefix);
    await continueAndAssert(page, prefix);
    await emit(page, "Y sigo hablando", false);
    await expect(page.locator(selector)).toHaveValue(prefix + "\n\n" + continuacion + ". Y sigo hablando");
    await emit(page, "Y sigo hablando.", true);
    const expected = prefix + "\n\n" + continuacion + ". Y sigo hablando.";
    await expect(page.locator(selector)).toHaveValue(expected);
    await page.waitForTimeout(4200);
    await expect(page.locator(selector)).toHaveValue(expected);
    await expect.poll(() => page.evaluate(() => (window as any).__dictadoContinuidad.checkpoints.at(-1))).toBe(expected);
  });
}

test("separar y volver a unir párrafos no consume el dictado posterior", async ({ page }) => {
  await emit(page, original, true);
  await edit(page, "\n\nCambio manual.");
  await confirm(page);
  await continueAndAssert(page, original + "\n\nCambio manual.");
  await page.locator(selector).click();
  await page.keyboard.press("Control+A");
  await page.keyboard.type(original + " Cambio manual. " + continuacion + ".", { delay: 2 });
  const prefix = await page.locator(selector).inputValue();
  await confirm(page, true);
  await continueAndAssert(page, prefix, "La reparación importa");
});

test("Escape sin cambios conserva el provisional visible y permite seguir", async ({ page }) => {
  await emit(page, original, false);
  await expect(page.locator(selector)).toHaveValue(original);
  await page.locator(selector).click();
  await confirm(page, true);
  await expect(page.locator(selector)).toHaveValue(original);
  await continueAndAssert(page, original);
});

test("borrar un párrafo no lo resucita al continuar", async ({ page }) => {
  await emit(page, original, true);
  await emit(page, "Un segundo párrafo.", true);
  await expect(page.locator(selector)).toHaveValue(original + "\n\nUn segundo párrafo.");
  await page.locator(selector).click();
  await page.keyboard.press("Control+A");
  await page.keyboard.type("Un segundo párrafo.", { delay: 5 });
  await confirm(page);
  await continueAndAssert(page, "Un segundo párrafo.");
  await expect(page.locator(selector)).not.toHaveValue(new RegExp(original));
});

test("borrar todo conserva el borrado manual y Limpiar protege una captura sin archivar", async ({ page }) => {
  await emit(page, original, true);
  await page.locator(selector).click();
  await page.keyboard.press("Control+A");
  await page.keyboard.press("Backspace");
  await confirm(page);
  await expect(page.locator(selector)).toHaveValue("");
  await emit(page, "Texto nuevo.", true);
  await expect(page.locator(selector)).toHaveValue("Texto nuevo.");
  await page.locator('[data-ui-id="ingreso.btn-detener"]').click();
  await expect(page.locator('[data-ui-id="ingreso.btn-limpiar"]')).toBeEnabled();
  await page.locator('[data-ui-id="ingreso.btn-limpiar"]').click();
  // Current custody contract forbids discarding an unarchived capture.
  await expect(page.getByText(/Antes de abrir otra captura, cierra esta con Archivar/)).toBeVisible();
  await expect(page.locator(selector)).toHaveValue("Texto nuevo.");
  await page.waitForTimeout(1200);
  await expect(page.locator(selector)).toHaveValue("Texto nuevo.");
  await expect(page.locator(selector)).not.toHaveValue(new RegExp(original));
});

test("callbacks de instancia anterior no borran parciales ni reactivan otro reconocedor", async ({ page }) => {
  await emit(page, original, true);
  await edit(page, " Cambio manual.");
  await confirm(page);
  const prefix = original + " Cambio manual.";
  await emit(page, continuacion, false);
  await expect(page.locator(selector)).toHaveValue(prefix + " " + continuacion);
  await emit(page, "RESULTADO OBSOLETO.", true, 0);
  await page.evaluate(() => { const old = (window as any).__dictadoContinuidad.instances[0]; old.onend?.(); old.onerror?.({ error: "not-allowed" }); old.onstart?.(); });
  await page.waitForTimeout(1200);
  await expect(page.locator(selector)).toHaveValue(prefix + " " + continuacion);
  await expect.poll(() => page.evaluate(() => (window as any).__dictadoContinuidad.instances.filter((r: any) => r.active).length)).toBe(1);
  await emit(page, continuacion + ".", true);
  await expect(page.locator(selector)).toHaveValue(prefix + "\n\n" + continuacion + ".");
});

test("sin edición conserva la segmentación original del reconocimiento", async ({ page }) => {
  await emit(page, original, true);
  await emit(page, "Por otro lado, importa reparar.", false);
  await expect(page.locator(selector)).toHaveValue(original + " Por otro lado, importa reparar.");
  await emit(page, "Por otro lado, importa reparar.", true);
  await expect(page.locator(selector)).toHaveValue(original + "\n\nPor otro lado, importa reparar.");
});

const ensayo = ["Preguntar si el pecado debe preocupar al ser humano obliga primero a precisar de qué hablamos. Para algunas tradiciones, pecar significa quebrantar una relación con Dios; para otras personas, la palabra nombra actos que dañan la convivencia. Ambas acepciones pueden encontrarse, pero no son idénticas. Una persona puede experimentar culpa sin haber causado daño, y también puede causar daño sin sentir culpa. La intensidad de una emoción no demuestra, por sí sola, la verdad de su interpretación.", "La experiencia humana ofrece evidencias del sufrimiento que producen la violencia, el engaño y la humillación. Sus consecuencias pueden escucharse en el testimonio de quienes los padecen y examinarse en sus efectos personales y sociales. Es razonable preocuparse por esos actos, aunque no se acepte ninguna doctrina religiosa. Lo discutible es convertir automáticamente cada prohibición heredada en una lesión comprobada contra alguien. La amenaza de una sanción no reemplaza la explicación de por qué una conducta sería injusta.", "En cambio, una sanción sobrenatural no se verifica del mismo modo que una herida o una promesa incumplida. Afirmar que existe un castigo después de la muerte pertenece a una convicción teológica cuya aceptación requiere argumentos y compromisos distintos de una observación clínica. Esta diferencia no refuta toda experiencia religiosa. Simplemente impide presentar como medición pública lo que depende de una interpretación espiritual. Tampoco autoriza a considerar irracional a toda persona creyente: la búsqueda de sentido admite preguntas abiertas.", "La psicología aporta una distinción útil entre evaluar una conducta y condenar la totalidad de la persona. Una cosa es reconocer que se hizo algo dañino; otra es concluir que uno carece de valor. Investigaciones sobre emociones morales relacionan ciertas formas de culpa con la reparación, mientras asocian la vergüenza centrada en el yo con respuestas defensivas y dificultades psicológicas. Son tendencias, no destinos universales. Los conceptos y sus medidas siguen discutiéndose, y ningún estudio permite diagnosticar a alguien desde una sola frase.", "Desde una perspectiva humanista, la pregunta decisiva podría cambiar de forma. En lugar de preguntarme únicamente si estoy manchado, puedo preguntar quién recibió las consecuencias de mi acción y qué reparación es posible. Esta sustitución no elimina la responsabilidad; la vuelve concreta. Pedir perdón, devolver lo sustraído, reconocer una mentira y modificar una práctica abusiva son actos más exigentes que castigarse indefinidamente en silencio. El sufrimiento del culpable no garantiza que la víctima haya sido escuchada ni que el daño haya cesado.", "La conciencia merece atención, pero también necesita contraste. Aprendemos normas dentro de familias y comunidades que pueden educar la empatía o transmitir prejuicios. Por eso conviene preguntar si una prohibición protege la dignidad de alguien, si se aplica con igualdad y si permite escuchar a quienes afecta. El consentimiento, la vulnerabilidad y las relaciones de poder importan al evaluar una conducta. No todo deseo es una agresión, ni toda costumbre aceptada deja de ser cruel por haber sido repetida durante siglos.", "El miedo religioso puede ofrecer orientación a algunas personas y convertirse para otras en una vigilancia agotadora. Cuando la preocupación por la pureza ocupa la vida cotidiana, impide descansar o exige comprobaciones interminables, importa atender el sufrimiento real. Eso no permite diagnosticar un trastorno a distancia. Sí invita a buscar acompañamiento competente y respetuoso cuando la inquietud interfiere con la vida. La ayuda no necesita burlarse de la fe ni confirmar que cada pensamiento involuntario constituye una falta moral.", "También sería insuficiente reemplazar toda ética por la comodidad personal. Que una creencia produzca tranquilidad no demuestra que sea verdadera; que una decisión resulte incómoda no demuestra que sea incorrecta. La responsabilidad incluye reconocer límites propios, aceptar críticas justificadas y considerar consecuencias que preferiríamos ignorar. Nuestra libertad no existe en un vacío: se ejerce entre otras libertades y fragilidades. Por ello, una vida sin miedo al pecado todavía puede exigir disciplina, valentía y una disposición persistente a corregir el rumbo.", "Quizá el pecado deba preocupar menos como una etiqueta definitiva sobre el ser humano y más como una ocasión para examinar sus acciones. Quien cree puede comprender ese examen dentro de su relación con Dios; quien no cree puede fundarlo en la dignidad compartida y la reducción del daño. Ninguna de las dos posiciones queda moralmente absuelta por su nombre. Lo relevante es si escucha, cuida y repara. La evidencia disponible permite estudiar esas prácticas, no certificar el destino eterno de una persona.", "Vivir responsablemente no consiste en alcanzar una inocencia imposible ni en declarar que todo está permitido. Consiste en distinguir hechos, interpretaciones y valores; tolerar la incertidumbre sin convertirla en terror; y responder por aquello que sí está a nuestro alcance. Si una idea del pecado ayuda a reconocer al otro sin destruir la propia dignidad, puede tener un valor para quien la sostiene. Si solo paraliza y humilla, merece ser interrogada. La preocupación moral vale por la vida que protege, no por la angustia que acumula."];
test("ensayo largo: ediciones sucesivas conservan todo el dictado posterior", async ({ page }) => {
  await emit(page, ensayo[0], false);
  await expect(page.locator(selector)).toHaveValue(ensayo[0]);
  await edit(page, " Corrección humana.");
  await confirm(page);
  let expected = ensayo[0] + " Corrección humana.";
  for (let i = 1; i < ensayo.length; i++) {
    await emit(page, ensayo[i], false);
    await expect(page.locator(selector)).toHaveValue(expected + " " + ensayo[i]);
    await emit(page, ensayo[i], true);
    expected += "\n\n" + ensayo[i];
    await expect(page.locator(selector)).toHaveValue(expected);
    if (i === 4) {
      await edit(page, " Otra corrección humana.");
      expected += " Otra corrección humana.";
      await confirm(page, true);
    }
  }
  await page.waitForTimeout(4200);
  await expect(page.locator(selector)).toHaveValue(expected);
  await expect.poll(() => page.evaluate(() => (window as any).__dictadoContinuidad.checkpoints.at(-1))).toBe(expected);
});
