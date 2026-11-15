export type CronicaTrackId = "fecha_hora" | "lugar" | "momento" | "que_pasa";

export type CronicaTrack = {
  id: CronicaTrackId;
  label: string;
  resolved: boolean;
  evidence: string | null;
};

export type CronicaChecklist = {
  eventTime: string | null;
  tracks: CronicaTrack[];
  completeCount: number;
};

/**
 * Conservative, local-only extraction for the Crónica checklist.
 * It never uses IP addresses, request headers, geolocation or a remote model.
 */
const DATE_RE = /\b(?:hoy|ayer|anteayer|mañana|el\s+(?:lunes|martes|miércoles|miercoles|jueves|viernes|sábado|sabado|domingo)(?:\s+pasado)?|este\s+(?:lunes|martes|miércoles|miercoles|jueves|viernes|sábado|sabado|domingo))\b|\b\d{1,2}[/-]\d{1,2}(?:[/-]\d{2,4})?\b|\b\d{1,2}\s+de\s+(?:enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|setiembre|octubre|noviembre|diciembre)\b/i;
const TIME_RE = /\b(?:a\s+las?\s+\d{1,2}(?::\d{2})?\s*(?:h|hrs?|am|pm)?|por\s+la\s+(?:mañana|tarde|noche)|de\s+madrugada|al\s+mediodía)\b/i;

function cleanEvidence(value: string | undefined): string | null {
  const cleaned = value?.replace(/\s+/g, " ").replace(/^[\s,.;:]+|[\s,.;:]+$/g, "").trim();
  return cleaned ? cleaned.slice(0, 180) : null;
}

function findEventTime(text: string): string | null {
  const date = DATE_RE.exec(text);
  const time = TIME_RE.exec(text);
  if (!date || !time) return null;
  const distance = time.index >= date.index
    ? time.index - (date.index + date[0].length)
    : date.index - (time.index + time[0].length);
  if (Math.abs(distance) > 80) return null;
  const start = Math.min(date.index, time.index);
  const end = Math.max(date.index + date[0].length, time.index + time[0].length);
  return cleanEvidence(text.slice(start, end));
}

function findPlace(text: string): string | null {
  const knownPlace = /\b(?:en|desde|hacia|hasta|cerca de|junto a|frente a|dentro de)\s+(?:(?:mi|el|la|los|las|un|una)\s+)?(?:casa|oficina|trabajo|escuela|colegio|universidad|parque|hospital|clínica|clinica|tienda|restaurante|calle|avenida|terminal|aeropuerto|estación|estacion|cafetería|cafeteria|centro)\b/i.exec(text);
  if (knownPlace) return cleanEvidence(knownPlace[0]);
  const namedPlace = /\b(?:en|desde|hacia|hasta|cerca de|junto a|frente a|dentro de)\s+(?:(?:el|la|los|las)\s+)?([A-ZÁÉÍÓÚÑ][\p{L}\p{M}'’.-]*(?:\s+[A-ZÁÉÍÓÚÑ][\p{L}\p{M}'’.-]*){0,3})/u.exec(text);
  return cleanEvidence(namedPlace?.[0]);
}

function findMoment(text: string): string | null {
  const match = /\b(?:al\s+(?:llegar|salir|despertar|levant(?:arme|arnos)|terminar|comenzar|empezar|volver|regresar|cerrar|abrir)|cuando\s+(?:lleg(?:ué|amos)|sal(?:í|imos)|despert(?:é|amos)|termin(?:é|amos)|volv(?:í|imos))|mientras\s+(?:esperaba|caminaba|trabajaba|comía|hablaba|conducía|descansaba)|después\s+de\s+(?:comer|desayunar|trabajar|salir|llegar)|antes\s+de\s+(?:comer|desayunar|dormir|salir|llegar)|durante\s+(?:la\s+)?(?:mañana|tarde|noche)|por\s+la\s+(?:mañana|tarde|noche)|al\s+mediodía|de\s+madrugada|camino\s+a\s+\w+)/i.exec(text);
  return cleanEvidence(match?.[0]);
}

function hasWhatHappened(text: string): boolean {
  const normalized = text.trim();
  if (!normalized) return false;

  // A bare denial or a purely hypothetical statement is not evidence of an event.
  if (/^(?:no\s+(?:pasó|ocurrió|sucedió|hay|hice|vi|sentí|siento|sucedía)\s+(?:nada|ningún\s+\w+|ninguna\s+\w+)?|nada\s+(?:pasó|ocurrió|sucedió))[.!?\s]*$/i.test(normalized)) return false;
  if (/^(?:quizá|quizás|tal\s+vez|a\s+lo\s+mejor|supongo\s+que|imagino\s+que|podría\s+ser\s+que|sería\s+posible\s+que)\b/i.test(normalized)) return false;

  // Exclude unmistakable third-person-only subjects; a speaker's own account remains valid.
  if (/^(?:él|ella|ellos|ellas|ese\s+hombre|esa\s+mujer|esa\s+persona|mi\s+(?:hermano|hermana|jefe|jefa|pareja|amigo|amiga))\b/i.test(normalized)) return false;
  if (/^(?:[A-ZÁÉÍÓÚÑ][\p{Ll}]{1,24})\s+(?:llegó|dijo|hizo|fue|vino|salió|entró|comió|trabajó|llamó|cambió|rompió|avisó)\b/u.test(normalized)) return false;

  return /\b(?:pasó|ocurrió|sucedió|hubo|hay|existe|se\s+(?:rompió|cayó|detuvo|apagó|encendió|abrió|cerró|perdió|ganó|mojó|inundó)|estoy|estaba|tengo|tenía|hice|fui|estuve|llegué|salí|volví|regresé|trabajé|hablé|comí|caminé|vi|veo|observé|observo|noté|noto|escuché|escucho|sentí|siento|pensé|pienso|creo|me\s+siento|me\s+duele|me\s+alegra|me\s+preocupa|me\s+sorprende|me\s+cuesta|se\s+me\s+ocurrió|se\s+me\s+ocurre|llovió|tembló|sonó|apareció|desapareció|inundó|comenzó|empezó|terminó|llegó|salió|entró|llamó|cambió|falló|funcionó|creció|cayó|murió|nació)(?=$|[^\p{L}\p{N}_])/iu.test(normalized);
}

/**
 * Recomputed from the current editor text on every edit.
 * Resolved tracks are therefore reversible and can never gate archiving.
 */
export function analizarChecklistCronica(text: string): CronicaChecklist {
  const eventTime = findEventTime(text);
  const place = findPlace(text);
  const moment = findMoment(text);
  const what = hasWhatHappened(text);
  const tracks: CronicaTrack[] = [
    { id: "fecha_hora", label: "Fecha y hora", resolved: Boolean(eventTime), evidence: eventTime },
    { id: "lugar", label: "Lugar", resolved: Boolean(place), evidence: place },
    { id: "momento", label: "Momento", resolved: Boolean(moment), evidence: moment },
    { id: "que_pasa", label: "Qué pasa", resolved: what, evidence: what ? "Relato con un hecho, acción, emoción, sensación, observación o idea." : null },
  ];
  return { eventTime, tracks, completeCount: tracks.filter(track => track.resolved).length };
}
