import neo4j, { type Driver } from "neo4j-driver";

function uriDirectaDesdeRouting(uri: string): string | null {
  if (uri.startsWith("neo4j+s://")) return `bolt+s://${uri.slice("neo4j+s://".length)}`;
  if (uri.startsWith("neo4j+ssc://")) return `bolt+ssc://${uri.slice("neo4j+ssc://".length)}`;
  if (uri.startsWith("neo4j://")) return `bolt://${uri.slice("neo4j://".length)}`;
  return null;
}

function esFalloDeDescubrimiento(error: unknown): boolean {
  const mensaje = String((error as any)?.message ?? error).toLowerCase();
  return mensaje.includes("could not perform discovery") || mensaje.includes("no routing servers available");
}

export async function ejecutarConFallbackNeo4j<T>(
  uri: string,
  user: string,
  password: string,
  operacion: (driver: Driver) => Promise<T>
): Promise<T> {
  const directa = uriDirectaDesdeRouting(uri);
  const candidatas = directa ? [uri, directa] : [uri];

  for (let indice = 0; indice < candidatas.length; indice += 1) {
    const driver = neo4j.driver(candidatas[indice], neo4j.auth.basic(user, password));
    try {
      return await operacion(driver);
    } catch (error) {
      const puedeReintentarDirecto = indice === 0 && directa !== null && esFalloDeDescubrimiento(error);
      if (!puedeReintentarDirecto) throw error;
    } finally {
      await driver.close();
    }
  }

  throw new Error("Neo4j no pudo completar la operación mediante routing ni conexión directa");
}
