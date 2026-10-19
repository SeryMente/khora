// ENT-01: conservar el contrato real de consulta sin fingir generación o suficiencia.
type Objeto = Record<string, unknown>;
const esObjeto = (value: unknown): value is Objeto =>
  value !== null && typeof value === "object" && !Array.isArray(value);
const texto = (value: unknown): value is string =>
  typeof value === "string" && value.trim().length > 0;

export function normalizarRespuestaConsulta(data: unknown) {
  if (!esObjeto(data)) throw new Error("Respuesta de consulta de grafo inválida.");
  const respuesta = texto(data.respuesta) ? data.respuesta : null;
  const suficienciaDeclarada = data.suficiencia === true || data.suficiencia === "suficiente"
    ? true
    : data.suficiencia === false || data.suficiencia === "insuficiente" ? false : undefined;
  const fuentes = Array.isArray(data.evidencia) ? data.evidencia.filter(
    (item): item is { tripleta: string; provenance: string; derived_from: string } =>
      esObjeto(item) && texto(item.tripleta) && texto(item.provenance) && texto(item.derived_from),
  ) : [];
  const fragmentos = Array.isArray(data.fragmentos) ? data.fragmentos.filter(
    (item): item is { id: string; texto: string } =>
      esObjeto(item) && texto(item.id) && texto(item.texto),
  ) : [];
  if (!respuesta && !Array.isArray(data.fragmentos) && !Array.isArray(data.evidencia)) {
    throw new Error("La consulta no devolvió una respuesta ni evidencia reconocible.");
  }
  const noAnclada = data.no_anclada === true;
  const advertencias: string[] = [];
  if (texto(data.degradacion_declarada)) advertencias.push(data.degradacion_declarada);
  if (!respuesta) advertencias.push("La API devolvió recuperación, no una respuesta generada.");
  if (suficienciaDeclarada === undefined) advertencias.push("Suficiencia no informada o no reconocida.");
  // El flag del recuperador no valida una respuesta que no se ha generado.
  const suficiencia = respuesta ? (noAnclada ? false : suficienciaDeclarada) : undefined;
  const contenido = respuesta ?? (fragmentos.length
    ? "Fragmentos recuperados (sin respuesta generada):\n\n" +
      fragmentos.map((item) => `[${item.id}] ${item.texto}`).join("\n\n")
    : "Sin respuesta generada. No se recibieron fragmentos textuales utilizables.");
  return {
    contenido,
    origen: "grafo",
    fuentes,
    suficiencia,
    no_anclada: noAnclada,
    degradacion_declarada: advertencias.join(" ") || null,
  };
}
