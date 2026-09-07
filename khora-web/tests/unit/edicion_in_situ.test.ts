import assert from "node:assert/strict";
import test from "node:test";
import fs from "node:fs";
import path from "node:path";
import {
  cerrarEdicionInSitu,
  determinarSalidaEdicionInSitu,
} from "../../lib/client/edicion-in-situ";

test("edición in situ: Esc con cambios confirma y reanuda una sola vez", async () => {
  const eventos: string[] = [];
  let escuchaActiva = false;

  const salida = await cerrarEdicionInSitu({
    textoAntes: "texto original",
    textoActual: "texto corregido",
    estabaDictando: true,
    confirmar: () => { eventos.push("confirmar"); },
    desactivar: () => { eventos.push("desactivar"); },
    reanudar: () => {
      eventos.push("reanudar");
      escuchaActiva = true;
    },
  });

  assert.equal(salida, "confirmar");
  assert.deepEqual(eventos, ["confirmar", "reanudar"]);
  assert.equal(escuchaActiva, true);
});

test("edición in situ: Esc sin cambios desactiva y reanuda una sola vez", async () => {
  const eventos: string[] = [];
  let escuchaActiva = false;

  const salida = await cerrarEdicionInSitu({
    textoAntes: "texto original",
    textoActual: "texto original",
    estabaDictando: true,
    confirmar: () => { eventos.push("confirmar"); },
    desactivar: () => { eventos.push("desactivar"); },
    reanudar: () => {
      eventos.push("reanudar");
      escuchaActiva = true;
    },
  });

  assert.equal(salida, "desactivar");
  assert.deepEqual(eventos, ["desactivar", "reanudar"]);
  assert.equal(escuchaActiva, true);
});

test("edición in situ: confirmar por botón conserva la ruta de confirmación", async () => {
  const eventos: string[] = [];

  const salida = await cerrarEdicionInSitu({
    textoAntes: "sin cambios",
    textoActual: "sin cambios",
    forzarConfirmacion: true,
    estabaDictando: false,
    confirmar: () => { eventos.push("confirmar"); },
    desactivar: () => { eventos.push("desactivar"); },
    reanudar: () => { eventos.push("reanudar"); },
  });

  assert.equal(salida, "confirmar");
  assert.deepEqual(eventos, ["confirmar"]);
});

test("edición in situ: comparación cruda detecta cualquier cambio", () => {
  assert.equal(determinarSalidaEdicionInSitu("Khora", "Khóra"), "confirmar");
  assert.equal(determinarSalidaEdicionInSitu("Khora", "Khora"), "desactivar");
});

test("edición in situ: la página registra y libera Escape", () => {
  const pagina = fs.readFileSync(
    path.resolve(__dirname, "../../app/sistema/ingreso/page.tsx"),
    "utf8",
  );
  const vista = fs.readFileSync(
    path.resolve(__dirname, "../../app/components/shared/IngresoView.tsx"),
    "utf8",
  );

  assert.match(pagina, /window\.addEventListener\("keydown", manejarTecla\)/);
  assert.match(
    pagina,
    /window\.removeEventListener\("keydown", manejarTecla\)/,
  );
  assert.match(pagina, /event\.key !== "Escape"/);
  assert.match(pagina, /reanudar: reanudarTrasEdicionInSitu/);
  assert.match(vista, /onClick=\{\(\) => actions\.onIniciarEdicion\?\.\(\)\}/);
  assert.match(vista, /Edición in situ activa/);
});
