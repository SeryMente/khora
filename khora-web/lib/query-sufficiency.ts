// Transport strings must never be coerced by truthiness ("insuficiente" is truthy).
export function sufficientEvidence(value:unknown):boolean {
 return value===true||(typeof value==="string"&&["sufficient","suficiente"].includes(value.trim().toLowerCase()));
}
export function graphAnswer(data:{respuesta?:unknown;suficiencia?:unknown}):string {
 if(typeof data.respuesta==="string"&&data.respuesta.trim())return data.respuesta;
 // A retrieval result is not an answer. Do not claim it was generated.
 return sufficientEvidence(data.suficiencia)?"Se recuperó evidencia; el servicio no devolvió una respuesta generada.":"Sin evidencia suficiente para responder.";
}
