// @l0 L0-002-R · @req GEN-OS/RESOLVER-01
// Fuente única de verdad: qué generación de interfaz sirve una request.
// No normaliza rutas (sin slash final, sin minúsculas). RUTAS_OS debe
// contener la forma exacta que Next.js entrega en pathname. Esto es
// deliberado: normalizar aquí sería adivinar la intención de quien
// escribió la ruta, y este sistema no adivina.

export type Generacion = "vigente" | "os";

export function resolverGeneracion(
  pathname: string,
  shellEnv: string | undefined,
  rutasOs: ReadonlySet<string>,
): Generacion {
  // (1) shellEnv !== "os" (comparación estricta, sensible a mayúsculas) → "vigente"
  if (shellEnv !== "os") {
    return "vigente";
  }

  // (2) pathname.startsWith("/os") (o pathname vacío defensivo) → "vigente"
  if (!pathname || pathname.startsWith("/os")) {
    return "vigente";
  }

  // (3) !rutasOs.has(pathname) (comparación exacta sin normalización) → "vigente"
  if (!rutasOs.has(pathname)) {
    return "vigente";
  }

  // (4) cualquier otro caso → "os"
  return "os";
}
