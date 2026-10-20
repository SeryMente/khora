/** LOCAL lexical cues for the mandatory sufficient minimum, not a form, truth detector, identity proof or publication gate.
 * No network, clock, model, persistence, location inference or modification of the narrative.
 * covered means an explicit, unqualified cue was found; false means NOT detected, not absent.
 * Deliberately conservative: unknown wording, uncertainty, negation and reported speech may
 * remain pending. Never use this result to prevent dictation, archiving or consent review.
 */
export type CronicaCoverageId = 'when' | 'where' | 'what';
export type CronicaCoverageItem = {
  id: CronicaCoverageId;
  label: string;
  covered: boolean;
  /** Contiguous literal excerpt of the supplied text; no synthesized or normalized evidence. */
  evidence: string | null;
};
export type CronicaCoverage = { items: CronicaCoverageItem[] };
const WORD = 'A-Za-zÁÉÍÓÚÜÑáéíóúüñ0-9_';
const bounded = (pattern: string) => new RegExp('(^|[^' + WORD + '])(?:' + pattern + ')(?=$|[^' + WORD + '])', 'i');
const uncertain = bounded('quiz[aá]s?|tal vez|a lo mejor|probablemente|posiblemente|supongo|creo|imagino|dudo|parece|parec[ií]a|no s[eé](?!\\s+(?:ha|han|hab[ií]a|hab[ií]an)\\b)|no recuerdo|no estoy segur[oa]|m[aá]s o menos|aproximadamente|puede que|podr[ií]a|habr[ií]a|si acaso');
const negative = bounded('no|nunca|jam[aá]s|tampoco|ni|sin (?:saber|recordar|haber|ir)');
const futureOrConditional = bounded('ma[ñn]ana|pr[oó]xim[oa]s?|que viene|voy a|ir[eé]|har[eé]|estar[eé]|trabajar[eé]|escribir[eé]|si|ojal[aá]|quisiera|hubiera|hubiese');
const reported = bounded('seg[uú]n|me dijeron|me contaron|dicen que|dijo que|dijeron que|cont[oó] que|al parecer');
const moment = bounded('hoy|ayer|anteayer|anoche|esta (?:ma[ñn]ana|tarde|noche|semana)|este (?:lunes|martes|mi[eé]rcoles|jueves|viernes|s[aá]bado|domingo|mes|a[ñn]o)|el (?:lunes|martes|mi[eé]rcoles|jueves|viernes|s[aá]bado|domingo)(?: pasado)?|(?:el )?\\d{1,2} de (?:enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|octubre|noviembre|diciembre)(?: del? \\d{4})?|\\d{4}-\\d{2}-\\d{2}|\\d{1,2}/\\d{1,2}/\\d{4}|a las? \\d{1,2}(?::\\d{2})?(?: (?:am|pm|de la (?:ma[ñn]ana|tarde|noche)))?');
const ownActivity = bounded('hice|fui|estuve|trabaj[eé]|camin[eé]|escrib[ií]|le[ií]|com[ií]|cocin[eé]|visit[eé]|habl[eé]|convers[eé]|sal[ií]|llegu[eé]|volv[ií]|regres[eé]|asist[ií]|particip[eé]|estudi[eé]|aprend[ií]|compr[eé]|limpi[eé]|descans[eé]|dorm[ií]|cuid[eé]|termin[eé]|empec[eé]|comenc[eé]|decid[ií]|sent[ií]|viv[ií]|observ[eé]|escuch[eé]|vi|recib[ií]|ayud[eé]|acompa[ñn][eé]|estoy (?:trabajando|caminando|escribiendo|leyendo|comiendo|cocinando|conversando|estudiando|descansando|dictando|registrando|haciendo)|trabajo|camino|escribo|leo|cocino|converso|estudio|participo|descanso|cuido|siento|vivo|(?:yo )?(?:he|hab[ií]a) (?:trabajado|caminado|escrito|le[ií]do|comido|cocinado|visitado|hablado|salido|llegado|participado|estudiado|dormido|decidido|visto)|yo (?:trabajaba|caminaba|le[ií]a|viv[ií]a|estaba|iba|hac[ií]a)');
const thirdPerson = bounded('él|ella|ellos|ellas|usted|ustedes|mi (?:madre|padre|hermana|hermano|amiga|amigo)|mi (?:hija|hijo)|nosotr[oa]s');
const placeCommon = bounded('(?:en|desde|hasta|a|al) (?:mi |la |el |una |un )?(?:casa|hogar|trabajo|oficina|parque|biblioteca|cafeter[ií]a|cibercaf[eé]|cybercaf[eé]|cybernet|caf[eé]|escuela|universidad|mercado|tienda|hospital|consultorio|calle|plaza|ciudad|pueblo|barrio|colonia|restaurante|taller|jard[ií]n|campo|playa|museo|gimnasio)(?:$|(?=[^' + WORD + ']))');
// Properly capitalized place after an explicit locative phrase. Lowercase unknown names
// intentionally remain pending: no gazetteer, device location or invented address.
const placeNamed = /(?:^|[^A-Za-zÁÉÍÓÚÜÑáéíóúüñ])(?:en|desde|hasta|a) (?:[A-ZÁÉÍÓÚÜÑ][a-záéíóúüñ]+)(?: [A-ZÁÉÍÓÚÜÑ][a-záéíóúüñ]+)*/;
const nonPlace = bounded('en (?:Facebook|GitHub|Instagram|Twitter|TikTok|YouTube|WhatsApp|Groq|Khora|Internet|Notion|Zoom|Teams|Google|Microsoft|Amazon|Apple|Windows|Linux|Octubre|Enero|Febrero|Marzo|Abril|Mayo|Junio|Julio|Agosto|Septiembre|Noviembre|Diciembre)|a (?:Maya|Mar[ií]a|Juan|Pedro|Dios)');
// Speech boundaries are structural, not a fixed token-distance window. A qualifier
// stays with its statement; a later independent qualifier cannot revoke earlier evidence.
const qualifierStart = /(^|[^A-Za-zÁÉÍÓÚÜÑáéíóúüñ])(?:no recuerdo|no sé|supongamos|quizás?|tal vez|creo que|si |según |me dijeron|ella |él |mi hermana )/gi;
const completeOwn = (cue: string) => ownActivity.test(cue) || /(?:^|\s)estoy\s+(?:en|aquí|acá)\s/i.test(cue);
function qualified(cue: string): boolean {
  return uncertain.test(cue) || negative.test(cue) || reported.test(cue) ||
    bounded('supongamos|digamos que|por ejemplo si|si digo').test(cue) ||
    futureOrConditional.test(cue.replace(/(?:esta|por la|de la) ma[ñn]ana/gi, 'esta tarde'));
}
function speechParts(raw: string, masked: string): Array<{raw:string;masked:string}> {
  const cuts = [0];
  // A new discourse statement may start without punctuation in live recognition.
  // Never split "creo que es [date]", "si digo estoy..." or "no es [date]".
  const boundary = /\s+(?=(?:ahora |entonces |y (?:ahora |yo |no recuerdo |no sé |quizás? |tal vez |supongamos )))/gi;
  let match: RegExpExecArray | null;
  while ((match=boundary.exec(masked))!==null) {
    const prefix=masked.slice(cuts[cuts.length-1],match.index);
    if(!uncertain.test(prefix) && !reported.test(prefix) && !futureOrConditional.test(prefix) && !bounded('supongamos|digamos que').test(prefix)) cuts.push(match.index+match[0].length);
  }
  cuts.push(raw.length);
  const result: Array<{raw:string;masked:string}> = [];
  for(let i=0;i<cuts.length-1;i++) {
    const start=cuts[i], end=cuts[i+1];
    const part=masked.slice(start,end);
    const localCuts=[0];
    qualifierStart.lastIndex=0;
    while((match=qualifierStart.exec(part))!==null) {
      const index=match.index+match[1].length;
      const before=part.slice(localCuts[localCuts.length-1],index);
      if(completeOwn(before) && !qualified(before)) localCuts.push(index);
    }
    // Explicit date assertion is its own predicate. Keep local qualification with
    // it; earlier discussion of a different predicate does not erase the date.
    const dates=/\bes\s+(?=\d{1,2}\s+de\s+(?:enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|octubre|noviembre|diciembre)\b)/gi;
    while((match=dates.exec(part))!==null) {
      const before=part.slice(0,match.index);
      if(!/(?:\bno|\bsi|\bque|\bquizás?|\btal vez)\s*$/i.test(before) &&
        !uncertain.test(before) && !reported.test(before) && !futureOrConditional.test(before) && !bounded('supongamos|digamos que').test(before)) localCuts.push(match.index);
    }
    const ordered=[...new Set(localCuts)].sort((a,b)=>a-b);ordered.push(part.length);
    for(let j=0;j<ordered.length-1;j++)result.push({raw:raw.slice(start+ordered[j],start+ordered[j+1]),masked:part.slice(ordered[j],ordered[j+1])});
  }
  return result;
}
function maskQuotes(text: string): string {
  return text.replace(/"[^"]*(?:"|$)|“[^”]*(?:”|$)|«[^»]*(?:»|$)|'[^'\n]*(?:'|$)/g, part => ' '.repeat(part.length));
}
export function analyzeCronicaCoverage(text: string): CronicaCoverage {
  const items: CronicaCoverageItem[] = [
    {id:'when',label:'Momento o fecha (mínimo suficiente)',covered:false,evidence:null},
    {id:'where',label:'Lugar general (mínimo suficiente)',covered:false,evidence:null},
    {id:'what',label:'Actividad o hecho propio (mínimo suficiente)',covered:false,evidence:null},
  ];
  if (typeof text !== 'string' || !text.trim()) return {items};
  // Recompute from the current transcript on EVERY call. No sticky completion state.
  // Split contrast clauses but not ordinary commas; qualifiers conservatively scope a clause.
  const masked = maskQuotes(text);
  const splitter = /(?:[.!?;\n]+|,?\s+(?:pero|sino|nada m[aá]s que)\s+)/gi;
  const fragments: Array<{raw:string;masked:string}> = [];
  let offset=0; let boundary: RegExpExecArray | null;
  while ((boundary=splitter.exec(text)) !== null) {
    fragments.push({raw:text.slice(offset,boundary.index),masked:masked.slice(offset,boundary.index)});
    offset=boundary.index+boundary[0].length;
  }
  fragments.push({raw:text.slice(offset),masked:masked.slice(offset)});
  for (const fragment of fragments.flatMap(f=>speechParts(f.raw,f.masked))) {
    const evidence = fragment.raw.trim();
    const cue = fragment.masked.trim();
    // Explicit self-retractions invalidate prior lexical evidence, never the original.
    if (/^(?:no[, ]+me equivoqu[eé]|me equivoqu[eé]|corrijo|me corrijo|rectifico|quise decir)(?=$|[^A-Za-zÁÉÍÓÚÜÑáéíóúüñ])/i.test(cue)) {
      for (const item of items) {item.covered=false;item.evidence=null;}
    }
    if (bounded('no es cierto|eso no ocurri[oó]|me equivoqu[eé]').test(cue)) {
      for (const item of items) {item.covered=false;item.evidence=null;}
      continue;
    }
    if (!cue.trim() || qualified(cue)) continue;
    const own = ownActivity.test(cue) && !thirdPerson.test(cue) && !bounded('(?:mi|el|su|un) (?:trabajo|camino|estudio)').test(cue);
    // Avoid an unqualified other person's episode becoming the operator's checklist.
    if (thirdPerson.test(cue)) continue;
    const correctionPlace = /^(?:digo|corrijo|rectifico|quise decir)\s+(?:el\s+)?(?:cybernet|cibercafé|cybercafé)\s+de la calle\s+[A-ZÁÉÍÓÚÜÑ]/i.test(cue);
    const found = [moment.test(cue), !nonPlace.test(cue) && (placeCommon.test(cue) || placeNamed.test(cue) || correctionPlace), own];
    for (let i=0;i<items.length;i++) {
      if (found[i]) items[i]={...items[i],covered:true,evidence};
    }
  }
  return {items};
}
