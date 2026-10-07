import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

test("service observability contract covers the service boundaries", () => {
  const root = process.cwd();
  const middleware = fs.readFileSync(path.join(root, "middleware.ts"), "utf8");
  const serviceObs = fs.readFileSync(path.join(root, "lib/server/service-observability.ts"), "utf8");
  const serviceContext = fs.readFileSync(path.join(root, "lib/server/service-context.ts"), "utf8");
  const mcp = fs.readFileSync(path.join(root, "app/api/mcp/route.ts"), "utf8");
  const eventos = fs.readFileSync(path.join(root, "app/api/eventos/route.ts"), "utf8");
  const docs = fs.readFileSync(path.join(root, "docs/observability-services.md"), "utf8");
  const bridge = fs.readFileSync(path.join(root, "../api/main.py"), "utf8");

  assert.match(middleware, /authMiddleware/);
  assert.match(middleware, /emitBoundaryEvent/);
  assert.match(middleware, new RegExp("api/eventos"));
  assert.match(middleware, /X-Khora-Correlation-Id/);
  assert.match(serviceObs, /withServiceObservation/);
  assert.match(serviceContext, /AsyncLocalStorage/);
  assert.match(mcp, /registrarEventoServicio/);
  assert.match(mcp, /NORMATIVE_TURN_REQUIRED/);
  assert.match(eventos, /timingSafeEqual/);
  assert.match(bridge, /observability_middleware/);
  assert.match(bridge, /SERVICE_HTTP/);
  assert.match(docs, /Todas las rutas HTTP/);
});
