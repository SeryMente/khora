import test from "node:test";
import assert from "node:assert";
import { resolverGeneracion, type Generacion } from "../../lib/server/generacion.js";

test("resolverGeneracion: Regla (1) si shellEnv !== 'os', devuelve 'vigente'", () => {
  const rutasOs = new Set(["/sistema/volcados", "/sistema/ingreso"]);

  const casosSinOsEnv: Array<{ pathname: string; shellEnv: string | undefined }> = [
    { pathname: "/sistema/volcados", shellEnv: undefined },
    { pathname: "/sistema/volcados", shellEnv: "dev" },
    { pathname: "/sistema/volcados", shellEnv: "production" },
    { pathname: "/sistema/volcados", shellEnv: "OS" },
    { pathname: "/sistema/volcados", shellEnv: "" },
  ];

  for (const caso of casosSinOsEnv) {
    const resultado = resolverGeneracion(caso.pathname, caso.shellEnv, rutasOs);
    assert.strictEqual(
      resultado,
      "vigente",
      `Para shellEnv="${caso.shellEnv}" y pathname="${caso.pathname}", debe retornar "vigente"`
    );
  }
});

test("resolverGeneracion: Regla (2) si pathname ya empieza con '/os', devuelve 'vigente'", () => {
  const rutasOs = new Set(["/sistema/volcados", "/os/sistema/volcados"]);

  const casosRutaOs: Array<{ pathname: string; shellEnv: string }> = [
    { pathname: "/os/sistema/volcados", shellEnv: "os" },
    { pathname: "/os", shellEnv: "os" },
    { pathname: "/os/cualquier/ruta", shellEnv: "os" },
  ];

  for (const caso of casosRutaOs) {
    const resultado = resolverGeneracion(caso.pathname, caso.shellEnv, rutasOs);
    assert.strictEqual(
      resultado,
      "vigente",
      `Para pathname "${caso.pathname}" que empieza con "/os", debe retornar "vigente"`
    );
  }
});

test("resolverGeneracion: Regla (3) si rutasOs no contiene pathname, devuelve 'vigente'", () => {
  const rutasOs = new Set(["/sistema/volcados", "/sistema/ingreso"]);

  const casosRutaNoEnSet: Array<{ pathname: string; shellEnv: string }> = [
    { pathname: "/sistema/desconocido", shellEnv: "os" },
    { pathname: "/api/v1/health", shellEnv: "os" },
    { pathname: "/", shellEnv: "os" },
  ];

  for (const caso of casosRutaNoEnSet) {
    const resultado = resolverGeneracion(caso.pathname, caso.shellEnv, rutasOs);
    assert.strictEqual(
      resultado,
      "vigente",
      `Para pathname="${caso.pathname}" no presente en rutasOs, debe retornar "vigente"`
    );
  }
});

test("resolverGeneracion: Regla (4) en cualquier otro caso, devuelve 'os'", () => {
  const rutasOs = new Set(["/sistema/volcados", "/sistema/ingreso", "/sistema/seguridad"]);

  const casosExitoOs: Array<{ pathname: string; shellEnv: string }> = [
    { pathname: "/sistema/volcados", shellEnv: "os" },
    { pathname: "/sistema/ingreso", shellEnv: "os" },
    { pathname: "/sistema/seguridad", shellEnv: "os" },
  ];

  for (const caso of casosExitoOs) {
    const resultado = resolverGeneracion(caso.pathname, caso.shellEnv, rutasOs);
    assert.strictEqual(
      resultado,
      "os",
      `Para pathname="${caso.pathname}" en rutasOs con shellEnv="os", debe retornar "os"`
    );
  }
});

test("resolverGeneracion: Tabla explicita de entrada/salida para las 4 ramas", () => {
  const rutasOs = new Set(["/sistema/volcados"]);

  interface CasoTabla {
    desc: string;
    pathname: string;
    shellEnv: string | undefined;
    rutasOs: ReadonlySet<string>;
    esperado: Generacion;
  }

  const tabla: CasoTabla[] = [
    {
      desc: "Rama 1: shellEnv es undefined",
      pathname: "/sistema/volcados",
      shellEnv: undefined,
      rutasOs,
      esperado: "vigente",
    },
    {
      desc: "Rama 1: shellEnv es 'prod'",
      pathname: "/sistema/volcados",
      shellEnv: "prod",
      rutasOs,
      esperado: "vigente",
    },
    {
      desc: "Rama 2: pathname empieza con /os",
      pathname: "/os/sistema/volcados",
      shellEnv: "os",
      rutasOs,
      esperado: "vigente",
    },
    {
      desc: "Rama 3: pathname no está en rutasOs",
      pathname: "/sistema/otra",
      shellEnv: "os",
      rutasOs,
      esperado: "vigente",
    },
    {
      desc: "Rama 4: shellEnv es 'os', pathname no empieza con /os y está en rutasOs",
      pathname: "/sistema/volcados",
      shellEnv: "os",
      rutasOs,
      esperado: "os",
    },
  ];

  for (const fila of tabla) {
    const obtenido = resolverGeneracion(fila.pathname, fila.shellEnv, fila.rutasOs);
    assert.strictEqual(
      obtenido,
      fila.esperado,
      `Falló [${fila.desc}]: esperado=${fila.esperado}, obtenido=${obtenido}`
    );
  }
});
