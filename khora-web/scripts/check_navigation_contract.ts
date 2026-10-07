// @l0 L0-002-R · @req SISTEMA-MENU/NAV-CONTRACT · Guardian de rutas y enlaces

import fs from "fs";
import path from "path";
import {
  CANONICAL_PRODUCT_ROUTES,
  NAVIGATION_EXEMPT_ROUTES,
  NAVIGATION_LEGACY_ALIASES,
  NAVIGATION_REGISTRY,
  normalizeNavigationPath,
} from "../app/navigation/registry";

const APP_DIR = path.join(process.cwd(), "app");

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

function extractInternalRefs(content: string): string[] {
  const refs = new Set<string>();
  const patterns = [
    /\b(?:href|redirect)\s*=\s*["'\x60]([^"'\x60]+)["'\x60]/g,
    /\bredirect\(\s*["'\x60]([^"'\x60]+)["'\x60]\s*\)/g,
  ];
  for (const pattern of patterns) {
    let match: RegExpExecArray | null;
    while ((match = pattern.exec(content)) !== null) {
      const ref = match[1];
      if (ref.startsWith("/") && !ref.startsWith("//") && !ref.startsWith("/api/")) {
        refs.add(normalizeNavigationPath(ref));
      }
    }
  }
  return [...refs];
}

function isStaticResource(ref: string): boolean {
  return /\.(?:svg|png|jpe?g|gif|webp|ico|css|js|mjs|map|woff2?|ttf|otf)$/i.test(ref);
}

const files = walk(APP_DIR);
const routes = new Set(
  files.map(routeFromPage).filter((route): route is string => Boolean(route)),
);
const sourceRefs = new Set<string>();

for (const file of files) {
  for (const ref of extractInternalRefs(fs.readFileSync(file, "utf8"))) {
    if (!isStaticResource(ref)) sourceRefs.add(ref);
  }
}

const errors: string[] = [];
const registryCoverage = new Set<string>();
const registryHrefs = new Set<string>();

if (NAVIGATION_REGISTRY.length > 7) {
  errors.push("NIVEL_1_EXCESIVO: la navegación primaria no puede superar 7 dominios.");
}

for (const entry of NAVIGATION_REGISTRY) {
  const href = normalizeNavigationPath(entry.href);
  if (registryHrefs.has(href)) {
    errors.push("HREF_PRIMARIO_DUPLICADO: " + href);
  }
  registryHrefs.add(href);

  for (const route of entry.coverage) {
    const normalized = normalizeNavigationPath(route);
    if (registryCoverage.has(normalized)) {
      errors.push("COBERTURA_DUPLICADA: " + normalized);
    }
    registryCoverage.add(normalized);

    if (!routes.has(normalized)) {
      errors.push("COBERTURA_SIN_RUTA: " + normalized + " <- " + entry.id);
    }
  }

  const childIds = new Set<string>();
  for (const child of entry.children ?? []) {
    if (childIds.has(child.id)) errors.push("HIJO_DUPLICADO: " + child.id);
    childIds.add(child.id);
    const childPath = normalizeNavigationPath(child.href);
    if (!routes.has(childPath)) {
      errors.push("HIJO_SIN_RUTA: " + childPath + " <- " + entry.id);
    }
  }
}

for (const route of CANONICAL_PRODUCT_ROUTES) {
  const normalized = normalizeNavigationPath(route);
  if (!routes.has(normalized)) {
    errors.push("REGISTRO_APUNTA_A_RUTA_INEXISTENTE: " + normalized);
  }
}

for (const ref of sourceRefs) {
  if (NAVIGATION_EXEMPT_ROUTES.has(ref) || NAVIGATION_LEGACY_ALIASES.has(ref)) continue;
  if (!routes.has(ref)) {
    const dynamicMatch = [...routes].some((route) => {
      const routeSegments = route.split("/").filter(Boolean);
      const refSegments = ref.split("/").filter(Boolean);
      if (routeSegments.length !== refSegments.length) return false;
      return routeSegments.every(
        (segment, index) => segment.startsWith("[") || segment === refSegments[index],
      );
    });
    if (!dynamicMatch) errors.push("ENLACE_SIN_RUTA: " + ref);
  }
}

const orphaned = [...routes]
  .filter((route) => route !== "/")
  .filter((route) => !NAVIGATION_EXEMPT_ROUTES.has(route))
  .filter((route) => !NAVIGATION_LEGACY_ALIASES.has(route))
  .filter((route) => !registryCoverage.has(route))
  .sort();

for (const route of orphaned) {
  errors.push("RUTA_HUERFANA: " + route);
}

for (const [alias, canonical] of NAVIGATION_LEGACY_ALIASES) {
  if (!routes.has(alias)) {
    errors.push("ALIAS_DECLARADO_SIN_RUTA: " + alias);
  }

  const canonicalPath = normalizeNavigationPath(canonical);
  if (canonicalPath !== "/" && !routes.has(canonicalPath)) {
    errors.push("ALIAS_APUNTA_A_RUTA_INEXISTENTE: " + alias + " -> " + canonical);
  }
}

if (errors.length > 0) {
  console.error("❌ Contrato de navegación inválido.");
  for (const error of errors) console.error("  " + error);
  process.exit(1);
}

console.log("✅ Contrato de navegación íntegro: jerarquía, cobertura, enlaces, aliases y rutas verificadas.");
