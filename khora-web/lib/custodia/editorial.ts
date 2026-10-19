/** Capture classification is independent of transport, custody, graph and publication. */
export const TIPOS_ENTRADA = ["general", "conversacion_maya", "interpretacion_simultanea", "blog_personal"] as const;
export type TipoEntrada = typeof TIPOS_ENTRADA[number];
export type ClasificacionEntrada = { tipoEntrada: TipoEntrada; ofuscada: boolean };
export type PublicationIntent = {
  publicationId: string;
  decision: null | boolean;
  sourceTextSha256: string;
  state: "awaiting_archive" | "awaiting_decision" | "awaiting_editorial_receipt" | "received";
};
export const CLASIFICACION_INICIAL: ClasificacionEntrada = { tipoEntrada: "general", ofuscada: false };
export function tipoEntradaValido(value: unknown): value is TipoEntrada {
  return typeof value === "string" && (TIPOS_ENTRADA as readonly string[]).includes(value);
}
export function clasificacionRecuperada(s: Partial<ClasificacionEntrada>): ClasificacionEntrada {
  return { tipoEntrada: tipoEntradaValido(s.tipoEntrada) ? s.tipoEntrada : "general", ofuscada: s.ofuscada === true };
}
export async function huellaTexto(text: string): Promise<string> {
  const hash = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return Array.from(new Uint8Array(hash), b => b.toString(16).padStart(2, "0")).join("");
}
export async function iniciarIntencion(text: string, previous?: PublicationIntent): Promise<PublicationIntent> {
  const sourceTextSha256 = await huellaTexto(text);
  if (previous?.sourceTextSha256 === sourceTextSha256) return previous;
  return { publicationId: crypto.randomUUID(), decision: null, sourceTextSha256, state: "awaiting_archive" };
}

export type RevisionEditorial = {
 publicationId:string;revision:number;sourceId:string;sourceVersion:number;sourceHash:string;kind:"blog_personal";obfuscated:boolean;
 entry:{schema:1;slug:string;title:string;date:string;body:string;source:{kind:"khora";sha256:string}};
 facebook:{format:"link"|"full_text";message:string};
};
export function canonicoEditorial(value:unknown):string {
 if(Array.isArray(value))return "["+value.map(canonicoEditorial).join(",")+"]";
 if(value&&typeof value==="object")return "{"+Object.keys(value).sort().map(k=>JSON.stringify(k)+":"+canonicoEditorial((value as Record<string,unknown>)[k])).join(",")+"}";
 if(value===undefined||typeof value==="function"||(typeof value==="number"&&!Number.isFinite(value)))throw Error("NON_JSON");
 return JSON.stringify(value);
}
export function publicadoEnAmbos(value:{revision?:number;filter?:string;deliveries?:Array<{revision:number;target:string;state:string;url?:string|null;proof_hash?:string|null}>}):boolean {
 return value.filter==="published_both"&&["blog","facebook"].every(target=>value.deliveries?.some(d=>d.target===target&&d.revision===value.revision&&d.state==="confirmed"&&!!d.url&&/^[a-f0-9]{64}$/i.test(d.proof_hash||"")));
}

/** Operator explicitly authorized a text-only cut; this is not consent to any entry. */
export const TEXT_ONLY_PUBLICATION_AUTHORIZED = true;
