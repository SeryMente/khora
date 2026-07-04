import { GoogleGenAI, Type } from "@google/genai";

// Heurística local instantánea como fallback robusto si no hay API key o hay problemas de red
export function heuristicClassify(texto: string): "pernocta" | "ubicacion" | "evento" | "insight" | "nota" {
	const t = texto.toLowerCase().trim();
	
	if (/\b(dormi|dormí|pernocte|pernocté|pernoctar|pernocta|hotel|hostal|cabaña|cabana|camping|acampé|acampe|pasé la noche|pase la noche|quedé a dormir|quede a dormir|alojamiento|alojé|aloje)\b/.test(t)) {
		return "pernocta";
	}
	if (/\b(estoy en|ubicacion|ubicación|coordenadas|gps|llegando a|en el|en la|en los|desde el|desde la|aeropuerto|estación|estacion|carretera|autopista|viajando|rumbo a|latitud|longitud)\b/.test(t)) {
		return "ubicacion";
	}
	if (/\b(reunion|reunión|llamada|call|reuní|reuni|almuerzo|almorcé|almorce|cena|cené|cene|evento|cita|cumpleaños|cumple|festejo|reunimos|mitin|sesion|sesión|clase|conferencia|taller)\b/.test(t)) {
		return "evento";
	}
	if (/\b(insight|idea|pienso|pensamiento|filosofia|filosofía|di cuenta|dando cuenta|reflexion|reflexión|aprendizaje|leccion|lección|revelacion|revelación|descubrí|descubri|conclusión|conclusion|ocurrió|ocurrio)\b/.test(t)) {
		return "insight";
	}
	return "nota";
}

export async function inferirTipo(texto: string): Promise<"pernocta" | "ubicacion" | "evento" | "insight" | "nota"> {
	const apiKey = process.env.GEMINI_API_KEY;

	if (!apiKey) {
		console.log("[Classifier] GEMINI_API_KEY no detectada. Usando heurística local.");
		return heuristicClassify(texto);
	}

	try {
		const ai = new GoogleGenAI({
			apiKey: apiKey,
			httpOptions: {
				headers: {
					"User-Agent": "aistudio-build",
				}
			}
		});

		const response = await ai.models.generateContent({
			model: "gemini-3.5-flash",
			contents: `Analiza la siguiente nota personal e infiere la categoría más adecuada de entre las siguientes opciones:
- "pernocta": si describe el lugar donde durmió, planea dormir, pernoctar o pasar la noche.
- "ubicacion": si describe su ubicación física actual, un traslado, una llegada o coordenadas geográficas.
- "evento": si registra una reunión, comida, llamada, cita, suceso puntual o actividad social/laboral.
- "insight": si registra una idea de negocio, reflexión filosófica, aprendizaje, realización personal o pensamiento profundo.
- "nota": si es una nota general, recordatorio libre o no encaja claramente en las categorías anteriores.

Nota a clasificar:
"${texto}"`,
			config: {
				systemInstruction: "Eres un categorizador de bitácoras de alta precisión. Tu tarea es analizar el texto y clasificarlo en la opción más precisa. Devuelve únicamente un JSON válido.",
				responseMimeType: "application/json",
				responseSchema: {
					type: Type.OBJECT,
					properties: {
						tipo: {
							type: Type.STRING,
							description: "La categoría inferida de la nota. Debe ser exactamente una de: pernocta, ubicacion, evento, insight, nota.",
						}
					},
					required: ["tipo"]
				}
			}
		});

		const resText = response.text;
		if (resText) {
			const data = JSON.parse(resText.trim());
			const tipo = data.tipo;
			if (["pernocta", "ubicacion", "evento", "insight", "nota"].includes(tipo)) {
				console.log(`[Classifier] Tipo inferido por Gemini: "${tipo}" para el texto: "${texto.slice(0, 30)}..."`);
				return tipo;
			}
		}
	} catch (e) {
		console.error("[Classifier] Error al llamar al clasificador Gemini API. Usando heurística de respaldo:", e);
	}

	// De vuelta a la heurística local si falla la llamada
	return heuristicClassify(texto);
}
