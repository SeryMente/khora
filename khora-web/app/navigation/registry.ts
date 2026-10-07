// @l0 L0-002-R · @req SISTEMA-MENU/NAV-CONTRACT · Registro canónico de navegación de producto

export type NavigationIcon =
  | "Files"
  | "Keyboard"
  | "Network"
  | "MessageSquareShare"
  | "Mic"
  | "ShieldCheck"
  | "ScrollText"
  | "PenLine"
  | "UploadCloud"
  | "Wrench"
  | "Activity"
  | "MapPinned"
  | "FileCheck2"
  | "Container"
  | "LockKeyhole"
  | "KeyRound";

export type NavigationChild = {
  id: string;
  label: string;
  href: string;
  icon: NavigationIcon;
  group: string;
};

export type NavigationEntry = {
  id: string;
  label: string;
  href: string;
  icon: NavigationIcon;
  kind: "direct" | "menu";
  level: 1;
  coverage: readonly string[];
  children?: readonly NavigationChild[];
};

/**
 * Canonical product-navigation contract.
 *
 * Level 1 is deliberately small. A route may be a real product surface without
 * being a level-1 domain: reachability is hierarchical, not equivalent to
 * primary placement.
 */
export const NAVIGATION_REGISTRY: readonly NavigationEntry[] = [
  {
    id: "volcados",
    label: "Volcados",
    href: "/sistema/volcados",
    icon: "Files",
    kind: "direct",
    level: 1,
    coverage: ["/sistema/volcados"],
  },
  {
    id: "ingreso",
    label: "Ingreso",
    href: "/sistema/ingreso",
    icon: "Keyboard",
    kind: "menu",
    level: 1,
    coverage: [
      "/sistema/ingreso",
      "/sistema/dictado",
      "/sistema/editar",
      "/sistema/ingesta",
    ],
    children: [
      { id: "ingreso-main", label: "Ingreso", href: "/sistema/ingreso", icon: "Keyboard", group: "Entrada" },
      { id: "dictado", label: "Dictado", href: "/sistema/dictado", icon: "Mic", group: "Entrada" },
      { id: "edicion", label: "Edición", href: "/sistema/editar", icon: "PenLine", group: "Revisión de entrada" },
      { id: "ingesta", label: "Ingesta", href: "/sistema/ingesta", icon: "UploadCloud", group: "Entrada" },
    ],
  },
  {
    id: "grafo",
    label: "Grafo",
    href: "/grafo",
    icon: "Network",
    kind: "menu",
    level: 1,
    coverage: ["/grafo", "/mapa"],
    children: [
      { id: "grafo-main", label: "Grafo", href: "/grafo", icon: "Network", group: "Visualización" },
      { id: "mapa", label: "Mapa", href: "/mapa", icon: "MapPinned", group: "Visualización" },
    ],
  },
  {
    id: "consulta",
    label: "Consulta",
    href: "/sistema/consulta",
    icon: "MessageSquareShare",
    kind: "direct",
    level: 1,
    coverage: ["/sistema/consulta"],
  },
  {
    id: "capturar",
    label: "Capturar",
    href: "/capturar",
    icon: "Mic",
    kind: "direct",
    level: 1,
    coverage: ["/capturar"],
  },
  {
    id: "seguridad",
    label: "Seguridad",
    href: "/sistema/seguridad",
    icon: "ShieldCheck",
    kind: "menu",
    level: 1,
    coverage: ["/sistema/seguridad", "/sistema/mcp"],
    children: [
      { id: "security-main", label: "Seguridad", href: "/sistema/seguridad", icon: "ShieldCheck", group: "Seguridad" },
      { id: "entorno-persistente", label: "Entorno Persistente", href: "/sistema/seguridad?tab=entorno-persistente", icon: "Container", group: "Seguridad" },
      { id: "boveda", label: "Bóveda", href: "/sistema/seguridad?tab=boveda", icon: "LockKeyhole", group: "Seguridad" },
      { id: "control-mcp", label: "Control MCP", href: "/sistema/seguridad?tab=mcp", icon: "KeyRound", group: "Seguridad" },
    ],
  },
  {
    id: "sistema",
    label: "Sistema",
    href: "/sistema/registro",
    icon: "ScrollText",
    kind: "menu",
    level: 1,
    coverage: [
      "/herramientas",
      "/herramientas/opi-vri",
      "/sistema/kpis",
      "/roadmap",
      "/adherence",
      "/sistema/otros",
      "/sistema/registro",
    ],
    children: [
      { id: "herramientas", label: "Herramientas", href: "/herramientas", icon: "Wrench", group: "Herramientas" },
      { id: "opi-vri", label: "OPI / VRI", href: "/herramientas/opi-vri", icon: "Activity", group: "Herramientas" },
      { id: "kpis", label: "KPIs", href: "/sistema/kpis", icon: "Activity", group: "Extensiones" },
      { id: "roadmap", label: "Roadmap", href: "/roadmap", icon: "MapPinned", group: "Gobierno y observabilidad" },
      { id: "adherence", label: "Adherencia", href: "/adherence", icon: "Activity", group: "Gobierno y observabilidad" },
      { id: "normative", label: "Evidencia normativa", href: "/sistema/otros", icon: "FileCheck2", group: "Gobierno y observabilidad" },
      { id: "registro", label: "Registro", href: "/sistema/registro", icon: "ScrollText", group: "Gobierno y observabilidad" },
    ],
  },
] as const;

export const PRIMARY_NAVIGATION_IDS = NAVIGATION_REGISTRY.map((entry) => entry.id);
export const MAX_PRIMARY_NAVIGATION_ITEMS = 7;

export const NAVIGATION_EXEMPT_ROUTES = new Set([
  "/auth/signin",
  "/oauth/authorize",
  "/offline",
  "/ui-review",
  "/ui-review/estatico",
  "/capturar/compartir",
]);

export const NAVIGATION_LEGACY_ALIASES = new Map<string, string>([
  ["/sistema/boveda", "/sistema/seguridad?tab=boveda"],
  ["/sistema/entorno-persistente", "/sistema/seguridad?tab=entorno-persistente"],
  ["/herramientas/bitacora", "/sistema/volcados"],
]);

export const CANONICAL_PRODUCT_ROUTES = new Set(
  NAVIGATION_REGISTRY.flatMap((entry) => entry.coverage),
);

export function normalizeNavigationPath(raw: string): string {
  const clean = raw.split("#")[0].split("?")[0].trim();
  if (!clean || clean === "/") return "/";
  return clean.replace(/\/+$/, "");
}

export function navigationGroupNames(entry: NavigationEntry): string[] {
  return [...new Set((entry.children ?? []).map((child) => child.group))];
}
