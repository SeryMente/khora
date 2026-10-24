/** Optional LOCAL lexical cues, not a form, truth detector, identity proof or publication gate.
 * No network, clock, model, persistence, location inference or modification of the narrative.
 * covered means an explicit, unqualified cue was found; false means NOT detected, not absent.
 * Deliberately conservative: unknown wording, uncertainty, negation and reported speech may
 * remain pending. Never use this result to prevent dictation, archiving or consent review.
 */
export type CronicaCoverageId = 'when' | 'where' | 'what' | 'datetime';
export type CronicaCoverageItem = {
  id: CronicaCoverageId;
  label: string;
  covered: boolean;
  /** Contiguous literal excerpt of the supplied text; no synthesized or normalized evidence. */
  evidence: string | null;
};
export type CronicaCoverageOptions = {
  /**
   * Status of automatic date/time verification.
   * Per U06-03: Date and time start RESOLVED (automaticOk: true).
   * They become ACTIVE (covered: false) only if automatic methods fail (automaticOk: false).
   */
  automaticDateTimeOk?: boolean;
};
export type CronicaCoverage = { items: CronicaCoverageItem[] };
const WORD = 'A-Za-zÁÉÍÓÚÜÑáéíóúüñ0-9_';
const bounded = (pattern: string) => new RegExp('(^|[^' + WORD + '])(?:' + pattern + ')(?=$|[^' + WORD + '])', 'i');
const uncertain = bounded('quiz[aá]s?|tal vez|a lo mejor|probablemente|posiblemente|supongo|creo|imagino|dudo|parece|parec[ií]a|no s[eé]|no recuerdo|no estoy segur[oa]|m[aá]s o menos|aproximadamente|puede que|podr[ií]a|habr[ií]a|si acaso');
const negative = bounded('no|nunca|jam[aá]s|tampoco|ni|sin (?:saber|recordar|haber|ir)');
const futureOrConditional = bounded('ma[ñn]ana|pr[oó]xim[oa]s?|que viene|voy a|ir[eé]|har[eé]|estar[eé]|trabajar[eé]|escribir[eé]|si|ojal[aá]|quisiera|hubiera|hubiese');
const reported = bounded('seg[uú]n|me dijeron|me contaron|dicen que|dijo que|dijeron que|cont[oó] que|al parecer');
const moment = bounded('hoy|ayer|anteayer|anoche|esta (?:ma[ñn]ana|tarde|noche|semana)|este (?:lunes|martes|mi[eé]rcoles|jueves|viernes|s[aá]bado|domingo|mes|a[ñn]o)|el (?:lunes|martes|mi[eé]rcoles|jueves|viernes|s[aá]bado|domingo)(?: pasado)?|(?:el )?\\d{1,2} de (?:enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|octubre|noviembre|diciembre)(?: de \\d{4})?|\\d{4}-\\d{2}-\\d{2}|\\d{1,2}/\\d{1,2}/\\d{4}|a las? \\d{1,2}(?::\\d{2})?(?: (?:am|pm|de la (?:ma[ñn]ana|tarde|noche)))?');
const ownActivity = bounded('hice|fui|estuve|trabaj[eé]|camin[eé]|escrib[ií]|le[ií]|com[ií]|cocin[eé]|visit[eé]|habl[eé]|convers[eé]|sal[ií]|llegu[eé]|volv[ií]|regres[eé]|asist[ií]|particip[eé]|estudi[eé]|aprend[ií]|compr[eé]|limpi[eé]|descans[eé]|dorm[ií]|cuid[eé]|termin[eé]|empec[eé]|comenc[eé]|decid[ií]|sent[ií]|viv[ií]|observ[eé]|escuch[eé]|vi|recib[ií]|ayud[eé]|acompa[ñn][eé]|estoy|trabajo|camino|escribo|leo|cocino|converso|estudio|participo|descanso|cuido|siento|vivo|(?:yo )?(?:he|hab[ií]a) (?:trabajado|caminado|escrito|le[ií]do|comido|cocinado|visitado|hablado|salido|llegado|participado|estudiado|dormido|decidido|visto)|yo (?:trabajaba|caminaba|le[ií]a|viv[ií]a|estaba|iba|hac[ií]a)');
const thirdPerson = bounded('él|ella|ellos|ellas|usted|ustedes|mi (?:madre|padre|hermana|hermano|amiga|amigo)|mi (?:hija|hijo)|nosotr[oa]s');
const placeCommon = bounded('(?:en|desde|hasta|a|al) (?:mi |la |el |una |un )?(?:casa|hogar|trabajo|oficina|parque|biblioteca|cafeter[ií]a|caf[eé]|escuela|universidad|mercado|tienda|hospital|consultorio|calle|plaza|ciudad|pueblo|barrio|colonia|restaurante|taller|jard[ií]n|campo|playa|museo|gimnasio)(?:$|(?=[^' + WORD + ']))');
// Properly capitalized place after an explicit locative phrase. Lowercase unknown names
// intentionally remain pending: no gazetteer, device location or invented address.
const placeNamed = /(?:^|[^A-Za-zÁÉÍÓÚÜÑáéíóúüñ])(?:en|desde|hasta|a) (?:[A-ZÁÉÍÓÚÜÑ][a-záéíóúüñ]+)(?: [A-ZÁÉÍÓÚÜÑ][a-záéíóúüñ]+)*/;
const nonPlace = bounded('en (?:Facebook|GitHub|Instagram|Twitter|TikTok|YouTube|WhatsApp|Groq|Khora|Internet|Notion|Zoom|Teams|Google|Microsoft|Amazon|Apple|Windows|Linux|Octubre|Enero|Febrero|Marzo|Abril|Mayo|Junio|Julio|Agosto|Septiembre|Noviembre|Diciembre)|a (?:Maya|Mar[ií]a|Juan|Pedro|Dios)');
function maskQuotes(text: string): string {
  return text.replace(/"[^"]*(?:"|$)|“[^”]*(?:”|$)|«[^»]*(?:»|$)|'[^'\n]*(?:'|$)/g, part => ' '.repeat(part.length));
}
export function analyzeCronicaCoverage(text: string, options: CronicaCoverageOptions = {}): CronicaCoverage {
  const autoDateTime = options.automaticDateTimeOk !== false; // Defaults to true per U06-03
  const items: CronicaCoverageItem[] = [
    {id:'datetime',label:'Fecha y hora',covered:autoDateTime,evidence:autoDateTime?'Verificado automáticamente':null},
    {id:'when',label:'Momento o fecha (opcional)',covered:false,evidence:null},
    {id:'where',label:'Lugar general (opcional)',covered:false,evidence:null},
    {id:'what',label:'Actividad o hecho propio (opcional)',covered:false,evidence:null},
  ];
  if (typeof text !== 'string' || !text.trim()) return {items};
  // Recompute from the current transcript on EVERY call. No sticky completion state.
  // Split contrast clauses but not ordinary commas; qualifiers conservatively scope a clause.
  const masked = maskQuotes(text);
  const splitter = /(?:[.!?;\n]+|,?\s+(?:pero|sino)\s+)/gi;
  const fragments: Array<{raw:string;masked:string}> = [];
  let offset=0; let boundary: RegExpExecArray | null;
  while ((boundary=splitter.exec(text)) !== null) {
    fragments.push({raw:text.slice(offset,boundary.index),masked:masked.slice(offset,boundary.index)});
    offset=boundary.index+boundary[0].length;
  }
  fragments.push({raw:text.slice(offset),masked:masked.slice(offset)});
  for (const fragment of fragments) {
    const evidence = fragment.raw.trim();
    const cue = fragment.masked.trim();
    if (!cue.trim() || uncertain.test(cue) || negative.test(cue) || futureOrConditional.test(cue.replace(/(?:esta|por la|de la) ma[ñn]ana/gi, 'esta tarde')) || reported.test(cue)) continue;
    const own = ownActivity.test(cue) && !thirdPerson.test(cue) && !bounded('(?:mi|el|su|un) (?:trabajo|camino|estudio)').test(cue);
    // Avoid an unqualified other person's episode becoming the operator's checklist.
    if (thirdPerson.test(cue)) continue;
    const dateTimeExplicit = moment.test(cue);
    const found = [
      dateTimeExplicit, // for datetime if auto failed
      moment.test(cue),
      !nonPlace.test(cue) && (placeCommon.test(cue) || placeNamed.test(cue)),
      own
    ];
    for (let i=0;i<items.length;i++) {
      if (!items[i].covered && found[i]) items[i]={...items[i],covered:true,evidence};
    }
  }
  return {items};
}
