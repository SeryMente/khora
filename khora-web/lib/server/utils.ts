// @l0 L0-002-R · @req TITULOS-LLM/REQ-2

/**
 * Ejecuta una promesa acotándola a un tiempo límite en milisegundos sin lanzar excepciones no controladas.
 */
export function conTimeout<T>(promesa: Promise<T>, ms: number, valorPorDefecto: T): Promise<T> {
  let timer: NodeJS.Timeout;
  const timeoutPromise = new Promise<T>((resolve) => {
    timer = setTimeout(() => resolve(valorPorDefecto), ms);
  });

  return Promise.race([promesa, timeoutPromise]).finally(() => {
    if (timer) clearTimeout(timer);
  });
}
