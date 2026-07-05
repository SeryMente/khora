import { ServerCaptura } from "./types";

export function isNotionConfigured(): boolean {
	return !!(process.env.NOTION_API_KEY && process.env.NOTION_DATABASE_ID);
}

export async function pushToNotion(captura: ServerCaptura) {
	const apiKey = process.env.NOTION_API_KEY;
	const databaseId = process.env.NOTION_DATABASE_ID;

	if (!apiKey || !databaseId) {
		console.warn("[Notion] Integración no configurada. Agrega NOTION_API_KEY y NOTION_DATABASE_ID.");
		return { success: false, status: "not_configured" };
	}

	const url = "https://api.notion.com/v1/pages";
	const headers = {
		"Authorization": `Bearer ${apiKey}`,
		"Notion-Version": "2022-06-28",
		"Content-Type": "application/json"
	};

	const truncatedText = captura.texto.length > 80 
		? captura.texto.slice(0, 77) + "..." 
		: captura.texto;

	const fullBody = {
		parent: { database_id: databaseId },
		properties: {
			"Name": {
				title: [
					{
						text: { content: truncatedText }
					}
				]
			},
			"Contenido": {
				rich_text: [
					{
						text: { content: captura.texto }
					}
				]
			},
			"Tipo": {
				select: {
					name: captura.tipo || "nota"
				}
			},
			"Origen": {
				select: {
					name: captura.origen || "keyboard"
				}
			},
			"Fecha": {
				date: {
					start: captura.timestamp
				}
			},
			"Dispositivo": {
				rich_text: [
					{
						text: { content: captura.forensics?.platform || "Desconocido" }
					}
				]
			},
			"Geo": {
				rich_text: [
					{
						text: { content: captura.forensics?.geo ? JSON.stringify(captura.forensics.geo) : "" }
					}
				]
			},
			"IP": {
				rich_text: [
					{
						text: { content: captura.forensics?.ip || "" }
					}
				]
			},
			"Plataforma": {
				rich_text: [
					{
						text: { content: captura.forensics?.platform || "" }
					}
				]
			},
			"Resolución": {
				rich_text: [
					{
						text: { content: captura.forensics?.resolution || "" }
					}
				]
			},
			"Zona horaria": {
				rich_text: [
					{
						text: { content: captura.forensics?.timezone || "" }
					}
				]
			},
			"App versión": {
				rich_text: [
					{
						text: { content: captura.forensics?.appVersion || "" }
					}
				]
			},
			...(captura.secuencia !== undefined ? { "Secuencia": { number: captura.secuencia } } : {}),
			"Hash": {
				rich_text: [
					{
						text: { content: captura.hash || "" }
					}
				]
			},
			"Hash previo": {
				rich_text: [
					{
						text: { content: captura.hashPrevio || "" }
					}
				]
			},
			"Metadatos JSON": {
				rich_text: [
					{
						text: { content: JSON.stringify(captura.metadata || {}) }
					}
				]
			},
			...((captura.forensics?.duracionCapturaMs !== undefined || captura.metadata?.duracionDictado !== undefined) ? {
				"Duración captura": { number: captura.forensics?.duracionCapturaMs ?? captura.metadata?.duracionDictado }
			} : {})
		},
		children: [
			{
				object: "block",
				type: "paragraph",
				paragraph: {
					rich_text: [
						{
							type: "text",
							text: { content: captura.texto }
						}
					]
				}
			},
			{
				object: "block",
				type: "callout",
				callout: {
					rich_text: [
						{
							type: "text",
							text: { content: `Capturado vía ${captura.origen === 'voice' ? '🎙️ dictado' : '⌨️ teclado'} el ${new Date(captura.timestamp).toLocaleString('es-MX')} desde ${captura.forensics?.platform || 'Dispositivo móvil'}.` }
						}
					],
					icon: {
						emoji: captura.tipo === "pernocta" ? "🛌" :
						       captura.tipo === "ubicacion" ? "📍" :
						       captura.tipo === "evento" ? "⚡" :
						       captura.tipo === "insight" ? "💡" : "📝"
					},
					color: "gray_background"
				}
			},
			{
				object: "block",
				type: "toggle",
				toggle: {
					rich_text: [
						{
							type: "text",
							text: { content: "🕵️ Metadatos Forenses y Cadena de Hashes" }
						}
					],
					children: [
						{
							object: "block",
							type: "code",
							code: {
								language: "json",
								rich_text: [
									{
										type: "text",
										text: { content: JSON.stringify({
											secuencia: captura.secuencia,
											hash: captura.hash,
											hashPrevio: captura.hashPrevio,
											forensics: captura.forensics,
											metadata: captura.metadata
										}, null, 2) }
									}
								]
							}
						}
					]
				}
			}
		]
	};

	try {
		const response = await fetch(url, {
			method: "POST",
			headers,
			body: JSON.stringify(fullBody)
		});

		if (response.ok) {
			const data = await response.json();
			return { success: true, status: "synced", pageId: data.id };
		}
		
		const errorData = await response.json();
		
		// Fallback for missing columns
		if (response.status === 400) {
			const fallbackBody = {
				parent: { database_id: databaseId },
				properties: {
					"Name": {
						title: [
							{
								text: { content: truncatedText }
							}
						]
					}
				},
				children: fullBody.children
			};

			const fallbackResponse = await fetch(url, {
				method: "POST",
				headers,
				body: JSON.stringify(fallbackBody)
			});

			if (fallbackResponse.ok) {
				const fallbackData = await fallbackResponse.json();
				return { success: true, status: "synced_simplified", pageId: fallbackData.id };
			} else {
				const fallbackErr = await fallbackResponse.json();
				return { success: false, status: "error", error: fallbackErr };
			}
		}

		return { success: false, status: "error", error: errorData };
	} catch (error: any) {
		return { success: false, status: "error", error: error?.message || String(error) };
	}
}

function getRichTextValue(prop: any): string {
	if (!prop || !prop.rich_text) return "";
	return prop.rich_text.map((rt: any) => rt.plain_text).join("").trim();
}

function getTitleValue(prop: any): string {
	if (!prop || !prop.title) return "";
	return prop.title.map((t: any) => t.plain_text).join("").trim();
}

function getNumberValue(prop: any): number | undefined {
	if (!prop) return undefined;
	if (typeof prop.number === "number") return prop.number;
	const text = getRichTextValue(prop);
	if (text) {
		const parsed = parseFloat(text);
		if (!isNaN(parsed)) return parsed;
	}
	return undefined;
}

export async function pullFromNotion(): Promise<{success: boolean, entries?: ServerCaptura[], error?: any}> {
	const apiKey = process.env.NOTION_API_KEY;
	const databaseId = process.env.NOTION_DATABASE_ID;

	if (!apiKey || !databaseId) {
		return { success: false, error: "not_configured" };
	}

	const url = `https://api.notion.com/v1/databases/${databaseId}/query`;
	const headers = {
		"Authorization": `Bearer ${apiKey}`,
		"Notion-Version": "2022-06-28",
		"Content-Type": "application/json"
	};

	try {
		const response = await fetch(url, {
			method: "POST",
			headers,
			body: JSON.stringify({
				page_size: 100
			})
		});

		if (response.ok) {
			const data = await response.json();
			const entries: ServerCaptura[] = data.results.map((page: any) => {
				const props = page.properties;
				
				// Intentar parsear el contenido desde la columna "Contenido", o usar "Name" como fallback
				let texto = "";
				if (props.Contenido?.rich_text?.length > 0) {
					texto = props.Contenido.rich_text.map((rt: any) => rt.plain_text).join("");
				} else if (props.Name?.title?.length > 0) {
					texto = props.Name.title.map((t: any) => t.plain_text).join("");
				}

				let tipo = props.Tipo?.select?.name || "nota";
				let origen = props.Origen?.select?.name || "keyboard";
				let timestamp = props.Fecha?.date?.start || page.created_time;

				// Parsear campos forenses
				let geo = undefined;
				const geoStr = getRichTextValue(props.Geo);
				if (geoStr) {
					try {
						geo = JSON.parse(geoStr);
					} catch {
						const match = geoStr.match(/(-?\d+\.\d+)\s*,\s*(-?\d+\.\d+)/);
						if (match) {
							geo = {
								lat: parseFloat(match[1]),
								long: parseFloat(match[2]),
								accuracy: 0
							};
						}
					}
				}

				const platform = getRichTextValue(props.Plataforma) || getRichTextValue(props.Dispositivo) || "Desconocido";
				const resolution = getRichTextValue(props.Resolución) || "";
				const timezone = getRichTextValue(props["Zona horaria"]) || "";
				const appVersion = getRichTextValue(props["App versión"]) || "";
				const duracionCapturaMs = getNumberValue(props["Duración captura"]);
				const ip = getRichTextValue(props.IP) || "";

				const forensics: ServerCaptura["forensics"] = {
					geo,
					platform,
					resolution,
					timezone,
					appVersion,
					duracionCapturaMs,
					ip
				};

				const secuencia = getNumberValue(props.Secuencia);
				const hash = getRichTextValue(props.Hash) || undefined;
				const hashPrevio = getRichTextValue(props["Hash previo"]) || undefined;

				let metadata: any = {};
				const metadataJsonStr = getRichTextValue(props["Metadatos JSON"]);
				if (metadataJsonStr) {
					try {
						metadata = JSON.parse(metadataJsonStr);
					} catch {
						// ignore
					}
				}

				return {
					id: page.id,
					texto,
					tipo,
					origen,
					timestamp,
					status: "synced",
					secuencia,
					hash,
					hashPrevio,
					forensics,
					metadata
				};
			});

			// Ordenar por "Fecha" (timestamp) ascendente
			entries.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

			return { success: true, entries };
		}
		
		const errorData = await response.json();
		return { success: false, error: errorData };
	} catch (error: any) {
		return { success: false, error: error?.message || String(error) };
	}
}
