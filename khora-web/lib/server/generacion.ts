export type Generacion = "vigente" | "os";

/**
 * Resuelve la generación ("vigente" | "os") para una ruta dada.
 *
 * Reglas exactas, en este orden:
 * (1) si shellEnv !== "os", devuelve "vigente";
 * (2) si pathname ya empieza con "/os", devuelve "vigente" (evita reescribir dos veces la misma ruta);
 * (3) si rutasOs no contiene pathname, devuelve "vigente";
 * (4) en cualquier otro caso, devuelve "os".
 *
 * @param pathname La ruta URL solicitada (ej. "/sistema/volcados")
 * @param shellEnv El valor del entorno shell (ej. process.env.KHORA_SHELL)
 * @param rutasOs Conjunto de rutas autorizadas para la generación OS
 */
export function resolverGeneracion(
  pathname: string,
  shellEnv: string | undefined,
  rutasOs: ReadonlySet<string>
): Generacion {
  // (1) si shellEnv !== "os", devuelve "vigente"
  if (shellEnv !== "os") {
    return "vigente";
  }

  // (2) si pathname ya empieza con "/os", devuelve "vigente"
  if (pathname.startsWith("/os")) {
    return "vigente";
  }

  // (3) si rutasOs no contiene pathname, devuelve "vigente"
  if (!rutasOs.has(pathname)) {
    return "vigente";
  }

  // (4) en cualquier otro caso, devuelve "os"
  return "os";
}
