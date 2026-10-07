// @l0 L0-002-R · @req SISTEMA-MENU/NAV-CONTRACT · Guardian de rutas y enlaces

import fs from "fs";
import path from "path";

const APP_DIR = path.join(process.cwd(), "app");

const EXEMPT_ROUTES = new Set([
  "/auth/signin",
  "/oauth/authorize",
  "/offline",
  "/ui-review",
  "/ui-review/estatico",
  "/ui-review/manifest.json",
  "/capturar/compartir",
  "/sistema/boveda",
  "/sistema/entorno-persistente",
]);

function walk(dir: string): string[] {
  const out: string[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walk(full));
    else if (entry.isFile() && full.endsWith(".tsx")) out.push(full);
  }
  return out;
}

function routeFromPage(file: string): string | null {
  const relative = path.relative(APP_DIR, file).replaceAll(path.sep, "/");
  if (!relative.endsWith("/page.tsx") && relative !== "page.tsx") return null;
  const without = relative === "page.tsx" ? "" : relative.slice(0, -"/page.tsx".length);
  const segments = without.split("/").filter(Boolean);
  if (segments.some((segment) => segment.startsWith("[") || segment.startsWith("("))) return null;
  return "/" + segments.join("/");
}

function normalize(raw: string): string {
  const clean = raw.split("#")[0].split("?")[0].trim();
  if (!clean || clean === "/") return "/";
  return clean.replace(/\/+$/, "");
}

function extractInternalRefs(content: string): string[] {
  const refs = new Set<string>();
  const patterns = [
    /\b(?:href|redirect)\s*=\s*["'`]([^"'`]+)["'`]/g,
    /\bredirect\(\s*["'`]([^"'`]+)["'`]\s*\)/g,
  ];
  for (const pattern of patterns) {
    let match: RegExpExecArray | null;
    while ((match = pattern.exec(content)) !== null) {
      const ref = match[1];
      if (ref.startsWith("/") && !ref.startsWith("//") && !ref.startsWith("/api/")) {
        refs.add(normalize(ref));
      }
    }
  }
  return [...refs];
}

const files = walk(APP_DIR);
const routes = new Set(files.map(routeFromPage).filter((route): route is string => Boolean(route)));
const sourceRefs = new Set<string>();

for (const file of files) {
  for (const ref of extractInternalRefs(fs.readFileSync(file, "utf8"))) sourceRefs.add(ref);
}

const errors: string[] = [];

for (const ref of sourceRefs) {
  if (EXEMPT_ROUTES.has(ref)) continue;
  if (!routes.has(ref)) {
    const dynamicMatch = [...routes].some((route) => {
      const routeSegments = route.split("/").filter(Boolean);
      const refSegments = ref.split("/").filter(Boolean);
      if (routeSegments.length !== refSegments.length) return false;
      return routeSegments.every((segment, index) => segment.startsWith("[") || segment === refSegments[index]);
    });
    if (!dynamicMatch) errors.push("ENLACE_SIN_RUTA: " + ref);
  }
}

const orphaned = [...routes]
  .filter((route) => route !== "/" && !EXEMPT_ROUTES.has(route))
  .filter((route) => !sourceRefs.has(route))
  .sort();

for (const route of orphaned) errors.push("RUTA_HUERFANA: " + route);

if (errors.length > 0) {
  console.error("❌ Contrato de navegación inválido.");
  for (const error of errors) console.error("  " + error);
  process.exit(1);
}

console.log("✅ Contrato de navegación íntegro: no hay enlaces internos muertos ni rutas de producto huérfanas.");
